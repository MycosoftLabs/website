from __future__ import annotations
import copy, math, random, time
from itertools import combinations
from collections import Counter, defaultdict
from mycosoft.embodiment_encoders import NatureEmbeddingEncoder
from nlm.guardian.avani import AVANIGuardian
from nlm.search.crep import CREPMapBridge
from nlm.search.engine import SearchHit, SearchResult
from mycosoft.worldview_snapshot_meta import snapshot_to_avani_meta
from .common import digest, mean, quantile, epoch
from .datasets import generated, validate_and_clean

def sigmoid(x): return 1/(1+math.exp(-max(-35,min(35,x))))
def dot(a,b): return sum(x*y for x,y in zip(a,b))
def distance(a,b): return math.sqrt(sum((x-y)**2 for x,y in zip(a,b)))

def metrics(labels,scores,threshold=.5):
    pairs=[(int(y),float(p)) for y,p in zip(labels,scores) if y is not None]
    if not pairs: return {'n':0,'precision':None,'recall':None,'f1':None,'average_precision':None,'auroc':None,'brier':None,'ece':None,'threshold':threshold,'status':'NO_GROUND_TRUTH'}
    n=len(pairs); tp=sum(y==1 and p>=threshold for y,p in pairs);fp=sum(y==0 and p>=threshold for y,p in pairs)
    fn=sum(y==1 and p<threshold for y,p in pairs);tn=n-tp-fp-fn
    precision=tp/(tp+fp) if tp+fp else 0; recall=tp/(tp+fn) if tp+fn else 0
    pos=sum(y for y,p in pairs);neg=n-pos; ap=0;seen=0;hits=0;auc=0;neg_before=0
    groups=defaultdict(list)
    for y,p in pairs: groups[p].append(y)
    for p,ys in sorted(groups.items(),reverse=True):
        seen+=len(ys);gpos=sum(ys);hits+=gpos
        if pos: ap+=(gpos/pos)*(hits/seen)
    for p,ys in sorted(groups.items()):
        gpos=sum(ys);gneg=len(ys)-gpos;auc+=gpos*(neg_before+gneg*.5);neg_before+=gneg
    ece=0
    for b in range(10):
        bucket=[(y,p) for y,p in pairs if min(int(p*10),9)==b]
        if bucket: ece+=len(bucket)/n*abs(mean([p for y,p in bucket])-mean([y for y,p in bucket]))
    return {'n':n,'positive_count':pos,'negative_count':neg,'tp':tp,'fp':fp,'fn':fn,'tn':tn,'precision':precision,'recall':recall,'f1':2*precision*recall/(precision+recall) if precision+recall else 0,'average_precision':min(1.,max(0.,ap)) if pos else None,'auroc':auc/(pos*neg) if pos and neg else None,'brier':mean([(p-y)**2 for y,p in pairs]),'ece':ece,'threshold':threshold,'status':'MEASURED'}

def encoded_features(records):
    encoder=NatureEmbeddingEncoder(); state={}; out=[]
    for r in records:
        v=r['variables'];packet={'bme688':{k:v.get(k) for k in ['temperature_c','humidity_percent','pressure_hpa','gas_resistance_ohms','iaq_index']},'audio_level_db':v.get('audio_level_db'),'has_frame':r.get('has_frame',False)}
        if v.get('fci_strength') is not None: packet['fci']={'signals':[v['fci_strength']]}
        z=encoder.encode(packet);key=(r['group'],r['source_id']);prev=state.get(key,z.vector)
        smooth=[.55*x+.45*y for x,y in zip(z.vector,prev)];state[key]=smooth
        feat=z.vector+smooth[:7]+[abs(z.vector[4]-prev[4])]
        out.append({'id':r['id'],'vector':z.vector,'features':feat,'native_score':z.anomaly_score,'missing_fields':[k for k in ['temperature_c','humidity_percent','iaq_index','fci_strength','audio_level_db'] if v.get(k) is None]})
    return out

MODEL_CACHE={}
def fit_model(records,truth,seed,cancel=lambda:None,origin='operator_provided_training_captures'):
    # Model selection sees only train and validation captures; labels never enter encoded_features.
    train=[r for r in records if r['split']=='train' and r['id'] in truth]
    valid=[r for r in records if r['split']=='validation' and r['id'] in truth]
    if len(train)<20 or len({truth[r['id']]['label'] for r in train})<2 or len(valid)<10:
        fixture=generated(seed);clean,_=validate_and_clean(fixture['records']);truth=fixture['truth'];train=[r for r in clean if r['split']=='train'];valid=[r for r in clean if r['split']=='validation'];origin='synthetic_training_captures'
    key=digest({'train':train,'validation':valid,'truth':{r['id']:truth[r['id']] for r in train+valid},'seed':seed,'algorithm':'temporal-logistic-v1','training_origin':origin})
    if key in MODEL_CACHE: return copy.deepcopy(MODEL_CACHE[key])
    ef=encoded_features(train+valid);tm={r['id']:r for r in ef};raw=[tm[r['id']]['features'] for r in train];d=len(raw[0]);mu=[mean([x[j] for x in raw]) for j in range(d)];sd=[max(.02,math.sqrt(mean([(x[j]-mu[j])**2 for x in raw]))) for j in range(d)]
    X=[[(x[j]-mu[j])/sd[j] for j in range(d)]+[1.] for x in raw];y=[truth[r['id']]['label'] for r in train]
    rng=random.Random(seed);w=[rng.uniform(-.01,.01) for _ in range(d+1)];loss=[]
    for epoch_i in range(65):
        cancel();grad=[0.]*(d+1);total=0
        for x,t in zip(X,y):
            p=sigmoid(dot(w,x));err=p-t;total-=t*math.log(max(p,1e-10))+(1-t)*math.log(max(1-p,1e-10))
            for j in range(d+1):grad[j]+=err*x[j]
        w=[w[j]-.12*(grad[j]/len(X)+(.002*w[j] if j<d else 0)) for j in range(d+1)]
        if epoch_i%5==0 or epoch_i==64:loss.append({'epoch':epoch_i+1,'training_log_loss':total/len(X)})
    def pred(f):return sigmoid(dot(w,[(f[j]-mu[j])/sd[j] for j in range(d)]+[1.]))
    vp=[pred(tm[r['id']]['features']) for r in valid];vy=[truth[r['id']]['label'] for r in valid]
    threshold=max([.2,.3,.4,.5,.6,.7,.8],key=lambda t:(metrics(vy,vp,t)['f1'],-abs(t-.5)))
    centers=[tm[train[min(i*len(train)//4,len(train)-1)]['id']]['vector'][:] for i in range(4)]
    vectors=[tm[r['id']]['vector'] for r in train]
    for _ in range(18):
        assignments=[min(range(4),key=lambda c:distance(z,centers[c])) for z in vectors]
        for c in range(4):
            zs=[z for z,a in zip(vectors,assignments) if a==c]
            if zs:centers[c]=[mean([z[j] for z in zs]) for j in range(16)]
    residuals=[min(distance(z,c) for c in centers) for z in vectors]
    normal=[tm[r['id']]['vector'] for r in train if truth[r['id']]['label']==0]
    target=[mean([z[j] for z in normal]) for j in range(16)]
    model={'schema':'itdx-readout/v1','name':'Native NLM encoder + temporal logistic readout','native_encoder':'Mycosoft NatureEmbeddingEncoder','training_origin':origin,'trained_parameters':len(w),'feature_dimensions':d,'weights':w,'mean':mu,'scale':sd,'threshold':threshold,'centroids':centers,'target':target,'novelty_q90':quantile(residuals,.9),'training_digest':key,'training_records':len(train),'validation_records':len(valid),'loss':loss,'seed':seed,'not_full_ssm':True,'split_groups':{'train':sorted({r['group'] for r in train}),'validation':sorted({r['group'] for r in valid})}}
    model['sha256']=digest(model);MODEL_CACHE[key]=copy.deepcopy(model);return model

def run_patterns(records,truth,model,cancel=lambda:None):
    t0=time.perf_counter(); ef=encoded_features(records);encoded={x['id']:x for x in ef};d=model['feature_dimensions']
    train=[r for r in records if r['split']=='train']
    if not train:train=generated(model['seed'])['records'][:320]
    channels=['temperature_c','humidity_percent','iaq_index','fci_strength','audio_level_db'];stats={}
    for k in channels:
        vals=[r['variables'][k] for r in train if r['variables'].get(k) is not None];med=quantile(vals,.5);mad=quantile([abs(v-med) for v in vals],.5);stats[k]=(med,max(1.4826*mad,1.))
    predictions=[];past={}
    for idx,r in enumerate(records):
        if idx%100==0:cancel()
        e=encoded[r['id']];f=e['features'];prob=sigmoid(dot(model['weights'],[(f[j]-model['mean'][j])/model['scale'][j] for j in range(d)]+[1.]))
        zs=[abs(r['variables'][k]-stats[k][0])/stats[k][1] for k in channels if r['variables'].get(k) is not None]
        baseline=sigmoid((max(zs) if zs else 0)-3);cls=min(range(4),key=lambda c:distance(e['vector'],model['centroids'][c]));dist=distance(e['vector'],model['centroids'][cls]);targetdist=distance(e['vector'],model['target'])
        valid='unknown_ontology' not in r['quality']; uncertainty=min(1,1-abs(prob-.5)*2+len(e['missing_fields'])*.08+len(r['quality'])*.06)
        if not valid:uncertainty=1
        key=(r['group'],r['source_id']);velocity=targetdist-past.get(key,targetdist);past[key]=targetdist
        predictions.append({'id':r['id'],'source_id':r['source_id'],'modality':r['modality'],'observed_at':r['observed_at'],'split':r['split'],'probability':prob if valid else None,'native_score':e['native_score'],'baseline_score':baseline,'decision':'ABSTAIN' if not valid else 'CANDIDATE' if prob>=model['threshold'] else 'BACKGROUND','uncertainty':uncertainty,'form_class':'form-'+str(cls),'coordinates':e['vector'],'distance_to_target':targetdist,'form_velocity':velocity,'novelty_distance':dist,'outside_training_q90':dist>model['novelty_q90'],'missing_fields':e['missing_fields'],'quality':r['quality'],'label':truth.get(r['id'],{}).get('label'),'event_id':truth.get(r['id'],{}).get('event_id'),'epistemic_status':'candidate','chart_id':'coastal-native16-v1','model_sha256':model['sha256']})
    test=[p for p in predictions if p['split']=='test'];eligible=[p for p in test if p['probability'] is not None];labels=[p['label'] for p in eligible]
    evaluations={'robust_baseline':metrics(labels,[p['baseline_score'] for p in eligible]),'native_encoder':metrics(labels,[p['native_score'] for p in eligible],.25),'temporal_readout':metrics(labels,[p['probability'] for p in eligible],model['threshold'])}
    delays=[];missed=0;events=defaultdict(list);capture_groups={r['id']:r['group'] for r in records}
    for p in test:
        if p['label']==1 and p['event_id']:events[(capture_groups[p['id']],p['event_id'])].append(p)
    for eid,ps in events.items():
        hits=[p for p in ps if p['decision']=='CANDIDATE'];start=min(epoch(p['observed_at']) for p in ps)
        if hits:delays.append(max(0,min(epoch(p['observed_at']) for p in hits)-start))
        else:missed+=1
    labelled=[p for p in test if p['label'] is not None];positives=sum(p['label']==1 for p in labelled);negatives=sum(p['label']==0 for p in labelled)
    operational={'status':'MEASURED' if labelled else 'NO_GROUND_TRUTH','test_records':len(test),'labelled_records':len(labelled),'coverage':len(eligible)/len(test) if test else 0,'abstained_positive_records':sum(p['label']==1 and p['decision']=='ABSTAIN' for p in test),'false_alerts':sum(p['label']==0 and p['decision']=='CANDIDATE' for p in labelled) if labelled else None,'missed_positive_records':sum(p['label']==1 and p['decision']!='CANDIDATE' for p in labelled) if labelled else None,'recall_including_abstentions':sum(p['label']==1 and p['decision']=='CANDIDATE' for p in labelled)/positives if positives else None,'false_positive_rate':sum(p['label']==0 and p['decision']=='CANDIDATE' for p in labelled)/negatives if negatives else None,'definition':'All labeled held-out records; abstained positive observations count as missed detections. Classifier F1 above uses only eligible predictions.'}
    return {'algorithm':'native_encoder_temporal_readout','predictions':predictions,'metrics':evaluations,'operational':operational,'abstained':len(test)-len(eligible),'test_records':len(test),'detection':{'events':len(events),'missed':missed,'median_seconds':quantile(delays,.5) if delays else None,'scope':'Supplied positive event labels, grouped by independent capture; absent labels do not establish event recall'},'calibration_bins':[{'bin':b,'count':len(ps),'mean_probability':mean([p['probability'] for p in ps]),'observed_rate':mean([p['label'] for p in ps])} for b in range(10) if (ps:=[p for p in eligible if p['label'] is not None and min(int(p['probability']*10),9)==b])],'seconds':time.perf_counter()-t0,'baseline_statistics':stats,'limitations':['Synthetic capture results are not field validation.','This readout is not a trained SSM/Mamba foundation model.','Missing native inputs are exposed; the upstream encoder itself substitutes zeros.']}

def valid_relation(source_type, target_type, relation):
    return (source_type,target_type) in {'source_of':{('source','observation')},'corroborates':{('source','source'),('observation','observation')}}.get(relation,set())

def graph_analysis(records,patterns,dataset):
    t0=time.perf_counter();lookup={r['id']:r for r in records};test=[p for p in patterns['predictions'] if p['split']=='test'];bytime=defaultdict(list)
    for p in test:bytime[(lookup[p['id']]['group'],int(epoch(p['observed_at'])//10))].append(p)
    candidate_budget=sum(len(ps)*(len(ps)-1)//2 for ps in bytime.values())
    if candidate_budget>250000:raise ValueError('Graph pair budget exceeded. Supply smaller capture windows or finer observation timestamps (maximum 250,000 candidate pairs).')
    pairs=[];edges=[];source_nodes={};agg=defaultdict(list);relation_counts=Counter()
    for r in records:
        if r['split']=='test':source_nodes[r['source_id']]={'id':r['source_id'],'label':r['source_name'],'type':'source','modality':r['modality']}
    for key,ps in bytime.items():
        for a,b in combinations(ps,2):
            if a['source_id']==b['source_id']:continue
            ra,rb=lookup[a['id']],lookup[b['id']];independent=ra['origin_id']!=rb['origin_id'] and a['modality']!=b['modality']
            spatial=0. if None in [ra['lat'],ra['lon'],rb['lat'],rb['lon']] else math.exp(-math.hypot(ra['lat']-rb['lat'],ra['lon']-rb['lon'])*30)
            score=min(a['probability'] or 0,b['probability'] or 0)*spatial if independent else 0.
            label=None if a['label'] is None or b['label'] is None or (a['label']==b['label']==1 and (not a['event_id'] or not b['event_id'])) else int(a['label']==b['label']==1 and a['event_id']==b['event_id'])
            row={'id':digest([a['id'],b['id']])[:20],'a':a['id'],'b':b['id'],'source_a':a['source_id'],'source_b':b['source_id'],'relation':'corroborates','observed':False,'score':score,'baseline_score':spatial,'label':label,'independent_sources':independent,'evidence_refs':[a['id'],b['id']]};pairs.append(row);agg[tuple(sorted([a['source_id'],b['source_id']]))].append(row)
    for (a,b),ps in agg.items():
        strongest=max(ps,key=lambda p:p['score']);edges.append({'id':'link-'+digest([a,b])[:12],'source':a,'target':b,'type':'corroborates','status':'inferred','confidence':strongest['score'],'evidence_refs':strongest['evidence_refs'],'supporting_pairs':sum(p['score']>=.5 for p in ps)});relation_counts['corroborates']+=1
    samples=sorted(test,key=lambda p:p['probability'] or 0,reverse=True)[:20];nodes=list(source_nodes.values())
    for p in samples:
        nodes.append({'id':p['id'],'label':p['form_class'],'type':'observation','confidence':p['probability'],'source_id':p['source_id']});edges.append({'id':'observed-'+p['id'],'source':p['source_id'],'target':p['id'],'type':'source_of','status':'observed','confidence':1.0,'evidence_refs':[p['id']]});relation_counts['source_of']+=1
    audit=dataset.get('edge_split_audit',{});train_edges={tuple(sorted(x)) for x in audit.get('train',[])};contaminated=any(tuple(sorted(x)) in train_edges for x in audit.get('test',[]))
    eligible=[p for p in pairs if p['label'] is not None];gm={'spatial_baseline':metrics([p['label'] for p in eligible],[p['baseline_score'] for p in eligible]),'temporal_corroboration':metrics([p['label'] for p in eligible],[p['score'] for p in eligible])}
    if contaminated:
        for m in gm.values():m['status']='INVALID_LEAKAGE';m['f1']=m['average_precision']=m['auroc']=None
    relation_population={'source_of':len(test),'corroborates':len(agg)}
    return {'nodes':nodes,'edges':edges,'pairs':pairs,'metrics':gm,'relation_counts':dict(relation_counts),'relation_population':relation_population,'relation_population_scope':'Full input provenance edge count versus aggregated inferred source links; displayed observations are capped at 20. Deterministic source_of links are excluded from classifier accuracy.','source_count':len(source_nodes),'leakage_audit':{'passed':not contaminated,'reason':'Reversed train/test edge overlap' if contaminated else 'No supplied edge-split overlap detected'},'type_invalid_pairs_rejected':sum(not valid_relation(x['source_type'],x['target_type'],x.get('relation','corroborates')) for x in ([dataset['invalid_pair_fixture']] if dataset.get('invalid_pair_fixture') else [])),'seconds':time.perf_counter()-t0,'algorithm':'typed_temporal_corroboration','limitations':['This local graph scorer is deterministic; no relational GNN checkpoint is loaded.','Node removal is a sensitivity test, not a causal intervention.']}

def options_analysis(records,patterns,graph,dataset):
    t0=time.perf_counter();c=dataset['constraints'];test=[p for p in patterns['predictions'] if p['split']=='test'];lookup={r['id']:r for r in records};cutoff=max((epoch(lookup[p['id']]['ingested_at']) for p in test),default=0);age_limit=c.get('max_evidence_age_seconds',300)
    candidates=[p for p in test if p['decision']=='CANDIDATE']
    fresh=[p for p in candidates if 0<=cutoff-epoch(p['observed_at'])<=age_limit and not any(q in p['quality'] for q in ['stale','unresolved_identity'])]
    latest=max((epoch(p['observed_at']) for p in fresh),default=0);positive=[p for p in fresh if epoch(p['observed_at'])>=latest-30]
    # A shared origin must not be counted twice even after a source alias change.
    origins={};
    for p in positive:origins.setdefault(lookup[p['id']]['origin_id'],p)
    positive=list(origins.values());sources=sorted({p['source_id'] for p in positive});modalities=sorted({p['modality'] for p in positive if p['modality']!='unknown'});u=mean([p['uncertainty'] for p in positive]) if positive else 1.
    evidence=[p['id'] for p in sorted(positive,key=lambda p:p['probability'] or 0,reverse=True)[:8]]
    specs=[('observe','Continue observation',0,15,'analyst'),('request_sample','Request independent corroboration',20,20,'sampling_team'),('restore_link','Restore the evidence connection',50,30,'network_operator')]
    if dataset.get('collapse_proposals'):specs=[specs[0]]*3
    guardian=AVANIGuardian(strict_mode=True);options=[];seen=set();trace=[]
    trace.append({'role':'State summarizer','result':f'{len(positive)} candidate observations in the latest 30-second event window across {len(sources)} sources and {len(modalities)} modalities.','evidence_refs':evidence})
    for i,(kind,title,cost,duration,resource) in enumerate(specs):
        checks={'goal_present':bool(c.get('goal')),'fresh_evidence':bool(positive),'within_cost':cost<=c['max_cost'],'within_duration':duration<=c['max_duration_minutes'],'resource_available':resource in c['available_resources'],'action_allowed':kind in c['allowed_actions'],'independent_sources':len(sources)>=c['min_sources'],'independent_modalities':len(modalities)>=c['min_modalities'],'uncertainty':u<=c['uncertainty_limit'],'distinct':kind not in seen};seen.add(kind)
        native=guardian.evaluate(harm_score=.05 if kind=='observe' else .12,biosphere_risk=.02,reversibility=1,grounding_confidence=1-u,proposed_action={'type':kind,'duration':duration}).to_dict()
        hard=['within_cost','within_duration','action_allowed'];status='VETO' if any(not checks[k] for k in hard) or native['action']=='veto' else 'GATE' if not all(checks.values()) or native['action'] in ['escalate','attenuate'] else 'PASS'
        reasons=[k.replace('_',' ') for k,v in checks.items() if not v]+native['reasons']
        option={'id':'coa-'+str(i+1),'title':title,'action_type':kind,'cost':cost,'duration_minutes':duration,'resource':resource,'status':status,'native_avani':native,'checks':checks,'reasons':reasons,'evidence_refs':evidence,'uncertainty':u,'score':round((1-u)*100-cost*.2-duration*.3,3),'envelope':{'identity':kind,'scope':'Synthetic/recorded environmental monitoring only','magnitude':'One advisory option','duration_minutes':duration,'preconditions':[k for k,v in checks.items() if v],'stop_conditions':['Evidence is invalidated','Analyst stops review'],'rollback':'Withdraw recommendation; preserve the evidence record','authority':c.get('human_authority','Not supplied')},'execution':'ADVISORY_ONLY'};options.append(option)
    trace += [{'role':'COA proposer','result':f'Created {len(options)} bounded template proposals.','evidence_refs':evidence},{'role':'Alternative planner','result':f'{len(seen)} distinct action types.','evidence_refs':[]},{'role':'Skeptical critic','result':'Preserved failed checks and uncertainty; proposal agreement adds no evidence.','evidence_refs':evidence},{'role':'Evidence verifier','result':f'All {len(evidence)} references resolve to current input observations. Semantic claims require SME adjudication.','evidence_refs':evidence},{'role':'AVANI guardian','result':'; '.join(o['id']+': '+o['status'] for o in options),'evidence_refs':[]},{'role':'Human handoff','result':'No actuation. Review options and record SME ratings; GATE/VETO options cannot be selected.','evidence_refs':[]}]
    return {'options':options,'trace':trace,'constraints':c,'policy_sha256':digest(c),'grounded_sources':sources,'grounded_modalities':modalities,'evidence_window':{'cutoff_epoch':cutoff,'max_age_seconds':age_limit,'candidate_records':len(candidates),'stale_or_unresolved_excluded':len(candidates)-len(fresh),'eligible_records':len(positive),'basis':'Recorded ingestion cutoff; only fresh observed-time evidence with resolved identity can ground options.'},'metrics':{'options':len(options),'ungoverned_proposals':len(specs),'ungoverned_hard_violations':sum(not all(o['checks'][k] for k in ['within_cost','within_duration','action_allowed']) for o in options),'distinct_options':len(seen),'pass':sum(o['status']=='PASS' for o in options),'gate':sum(o['status']=='GATE' for o in options),'veto':sum(o['status']=='VETO' for o in options),'evidence_reference_completeness':1.0 if evidence else 0.,'unsupported_assertion_rate':None,'unsupported_assertion_status':'SME adjudication required; reference presence is not entailment','model_calls':0,'revision_rounds':0,'hard_violations_in_passing_options':sum(not all(o['checks'][k] for k in ['within_cost','within_duration','action_allowed']) for o in options if o['status']=='PASS')},'seconds':time.perf_counter()-t0,'mode':'DETERMINISTIC_SEVEN_ROLE_REVIEW','limitations':['The local role loop does not simulate independent LLM agents.','A passing advisory gate never grants command authority.']}

def map_product(records,patterns):
    t0=time.perf_counter();ps={p['id']:p for p in patterns['predictions']};test=[r for r in records if r['split']=='test'];cutoff=max(epoch(r['ingested_at']) for r in test) if test else 0;hits=[];missing=0
    for r in test:
        p=ps[r['id']]
        if r['lat'] is None or r['lon'] is None:missing+=1;continue
        age=max(0,cutoff-epoch(r['observed_at']));stale=age>3600 or 'stale' in r['quality']
        hits.append(SearchHit(id=r['id'],domain='air_quality' if r['modality']=='bioelectric' else 'weather',entity_type='environmental_observation',name=r['source_name'],lat=r['lat'],lng=r['lon'],geometry_type='Point',occurred_at=r['observed_at'],source=r['source_id'],properties={'mode':'recorded_projection','confidence':p['probability'],'uncertainty':p['uncertainty'],'form_class':p['form_class'],'age_seconds':age,'stale':stale,'source_id':r['source_id'],'decision':p['decision'],'evidence_refs':[r['id']],'quality':r['quality']}))
    result=SearchResult(query='Current evaluation evidence',domains_searched=['air_quality','weather'],universal_results=hits,total_count=len(hits));bridge=CREPMapBridge();geo=bridge.to_geojson_collection(bridge.build_layers(result));geo['metadata'].update({'coordinate_reference_system':'EPSG:4326','time_basis':'age relative to evaluation replay cutoff','replay_cutoff_epoch':cutoff,'missing_geography':missing,'basemap':'none; offline coordinate grid','algorithm':'Native Mycosoft CREPMapBridge','upstream_estimates':'learned local readout'})
    return {'geojson':geo,'seconds':time.perf_counter()-t0,'worldview_meta':snapshot_to_avani_meta({'snapshot_id':digest(geo),'captured_at':cutoff,'degraded':bool(missing),'confidence':mean([h.properties['confidence'] or 0 for h in hits]),'provenance':{'source':'local_itdx_evidence_store'},'audit_trail_id':digest([r['id'] for r in test])}),'metrics':{'mapped_records':len(hits),'missing_geometry':missing,'stale_records':sum(h.properties['stale'] for h in hits)}}
