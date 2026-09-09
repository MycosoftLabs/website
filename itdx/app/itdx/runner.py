from __future__ import annotations
import copy, platform, random, sys, time, uuid
from .common import now, digest, mean, quantile, epoch, ROOT, sha
from .catalog import VERSION, SCENARIOS, DEFAULT_CONSTRAINTS, SEEDS
from .datasets import generated, apply_scenario, validate_and_clean, scenario_applicability, ScenarioNotApplicable
from .assessment import attach
from .algorithms import fit_model, run_patterns, graph_analysis, options_analysis, map_product, metrics
from .evidence import attest, inclusion, verify_inclusion
from .network import simulate

def code_snapshot():
    paths=[ROOT/'run.py',ROOT/'verify_bundle.py',ROOT/'replay.py',ROOT/'source_reference/UPSTREAM_MANIFEST.json']
    for folder in ['itdx','web','vendor/mycosoft','vendor/nlm']:
        paths += [p for p in (ROOT/folder).rglob('*') if p.suffix in ['.py','.js','.html','.css'] and '__pycache__' not in str(p)]
    return {str(p.relative_to(ROOT)).replace('\\','/'):sha(p.read_bytes()) for p in sorted(paths)}

class Cancelled(Exception):pass

def current_memory_mb():
    try:
        import resource
        value=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        return value/(1024*1024 if sys.platform=='darwin' else 1024)
    except ImportError:return None

def interaction(patterns,records,seed):
    start=time.perf_counter();lookup={r['id']:r for r in records};test=[p for p in patterns['predictions'] if p['split']=='test' and p['probability'] is not None];groups={}
    for p in test:groups.setdefault((lookup[p['id']]['group'],int(epoch(p['observed_at'])//10)),[]).append(p)
    scores=[]
    for p in test:
        r=lookup[p['id']];others=[x for x in groups[(r['group'],int(epoch(p['observed_at'])//10))] if x['source_id']!=p['source_id'] and x['modality']!=p['modality'] and lookup[x['id']]['origin_id']!=r['origin_id']]
        neighbor=mean([x['probability'] for x in others]) if others else 0
        scores.append({'id':p['id'],'label':p['label'],'sequence':p['probability'],'graph_context':neighbor,'fused':p['probability']*(.4+.6*neighbor)})
    shuffled=[x['graph_context'] for x in scores];random.Random(seed).shuffle(shuffled)
    for r,noise in zip(scores,shuffled):r['shuffled_control']=r['sequence']*(.4+.6*noise)
    m={key:metrics([x['label'] for x in scores],[x[key] for x in scores]) for key in ['sequence','graph_context','fused','shuffled_control']}
    a=m['sequence'].get('f1');b=m['fused'].get('f1')
    return {'unit':'Same held-out observation IDs and labels; concurrent independent-source context only','metrics':m,'paired_f1_delta':b-a if a is not None and b is not None else None,'seconds':time.perf_counter()-start,'scores':scores,'method':'Fixed 0.4 + 0.6 neighborhood weighting; no fitting on test labels','limitations':['This measures the local temporal/corroboration components, not a full learned GNN.','Shuffled context is a negative control.']}

def execute(dataset=None,seed=11,scenario='clean',constraints=None,progress=None,cancel=None,parent_root=''):
    t0=time.perf_counter();progress=progress or (lambda stage,message:None);cancel=cancel or (lambda:None)
    seed=int(seed)
    if not 0<=seed<=2**31-1:raise ValueError('Seed outside supported range')
    ds=copy.deepcopy(dataset or generated(seed));ds['constraints']={**DEFAULT_CONSTRAINTS,**ds.get('constraints',{})}
    if constraints:
        if not isinstance(constraints,dict):raise ValueError('constraints must be an object')
        ds['constraints'].update({k:v for k,v in constraints.items() if k in DEFAULT_CONSTRAINTS})
    ds=apply_scenario(ds,scenario,seed)
    c=ds['constraints']
    for k in ['max_cost','max_duration_minutes','min_sources','min_modalities','uncertainty_limit','max_revisions','max_evidence_age_seconds']:
        c[k]=float(c[k])
        if not -100000<=c[k]<=100000:raise ValueError('Constraint outside supported numeric bounds')
    if not 0<=c['max_evidence_age_seconds']<=86400:raise ValueError('Evidence age must be between 0 and 86400 seconds')
    for k in ['available_resources','allowed_actions']:
        if not isinstance(c[k],list) or not all(isinstance(x,str) for x in c[k]):raise ValueError(k+' must be a list of names')
    progress('data','Validating observations and freezing the input snapshot');cancel();records,audit=validate_and_clean(ds['records']);ds['records']=records
    if not any(r['split']=='test' for r in records):raise ValueError('At least one test observation is required')
    # Exclude labels from the observation evidence objects; retain them separately for scoring.
    for r in records:
        if any(k in r for k in ['label','event_id','truth']):raise ValueError('Ground truth belongs in the separate truth mapping, not observation inputs')
    progress('model','Fitting or loading the frozen local readout from training captures');mt=time.perf_counter();model=fit_model(records,ds.get('truth',{}),seed,cancel,origin='synthetic_training_captures' if ds['mode']=='SYNTHETIC_TEST' else 'operator_provided_training_captures');model_seconds=time.perf_counter()-mt
    progress('12','Running native NLM features, baseline and held-out predictions');patterns=run_patterns(records,ds.get('truth',{}),model,cancel)
    cancel();progress('13','Building typed links and comparing candidate pair scores');graph=graph_analysis(records,patterns,ds)
    cancel();progress('8','Reviewing options and applying native AVANI plus hard constraints');options=options_analysis(records,patterns,graph,ds)
    cancel();progress('14','Projecting evidence with the native CREP bridge');mp=map_product(records,patterns)
    cancel();progress('interaction','Measuring component interaction and software network behavior');inter=interaction(patterns,records,seed);net=simulate(records,scenario)
    elapsed=time.perf_counter()-t0
    code=code_snapshot()
    config={'code_snapshot_sha256':digest(code),'app_version':VERSION,'seed':seed,'scenario_id':scenario,'constraints':c,'model_sha256':model['sha256'],'dataset_id':ds['id'],'data_mode':ds['mode'],'training_origin':model['training_origin'],'backend':'native_encoder_local_readout','external_services_used':False}
    core_outputs={'predictions':patterns['predictions'],'graph':{'nodes':graph['nodes'],'edges':graph['edges'],'pairs':graph['pairs']},'options':options['options'],'map':mp['geojson'],'interaction_scores':inter['scores']}
    proof=attest(records,core_outputs,config,parent_root)
    proof['sample_inclusion']=inclusion(records,0);proof['sample_verified']=verify_inclusion(records[0],proof['sample_inclusion'])
    result={'id':'run-'+uuid.uuid4().hex[:16],'created_at':now(),'status':'COMPLETED','runtime_code_manifest':code,'scenario_context':{k:v for k,v in ds.items() if k not in ['records','truth']},'config':config,'dataset':{'id':ds['id'],'title':ds['title'],'mode':ds['mode'],'provenance':ds['provenance'],'records':len(records),'truth_labels':len(ds.get('truth',{})),'notes':ds.get('notes',[])},'audit':audit,'model':model,'task12':patterns,'task13':graph,'task8':options,'task14':mp,'interaction':inter,'network':net,'proof':proof,'timing':{'total_seconds':elapsed,'model_setup_seconds':model_seconds,'task12_seconds':patterns['seconds'],'task13_seconds':graph['seconds'],'task8_seconds':options['seconds'],'task14_seconds':mp['seconds'],'budget_seconds':420,'within_budget':elapsed<=420,'definition':'Input validation through analyst products and interaction; export/storage measured separately'},'hardware':{'platform':platform.platform(),'python':platform.python_version(),'processor':platform.processor() or 'not reported','process_lifetime_peak_rss_mb':current_memory_mb(),'gpu':'Not used; CPU reference execution'},'inputs':records,'truth':ds.get('truth',{}),'stable_outputs':core_outputs,'limitations':['Final Army agenda, official inject pack and acceptance rubric require confirmation.','Synthetic metrics do not establish operational accuracy.','Full NLM SSM, relational GNN and multi-LLM MYCA services were not used in this local run.','Local SQLite evidence store is not a deployed production MINDEX/PostgreSQL instance.']}
    progress('complete','All four analyst products and the evidence root are ready');return result

def check_scenario(sid,r):
    a=r['audit'];p=r['task12'];g=r['task13'];o=r['task8'];m=r['task14'];n=r['network'];inputs=r['inputs'];checks=[]
    def add(name,ok,detail):checks.append({'name':name,'passed':bool(ok),'detail':detail})
    add('Input inclusion proof',r['proof']['sample_verified'],'Recomputed with the native NLM Merkle implementation.')
    injection=r['scenario_context'].get('injection',{})
    if sid in ['S12-1','M-6']:add('Copies removed',a['duplicates_removed']>=injection.get('copies_added',40),str(a['duplicates_removed']))
    elif sid in ['S12-2','F-4','F-5']:add('Time-quality flags retained',any(any('clock_' in q or q=='packet_delayed' for q in x['quality']) for x in inputs),'Observation and ingestion times remain separate.')
    elif sid=='S12-3':add('Unknown ontology abstains',p['abstained']>0,str(p['abstained'])+' test records abstained')
    elif sid in ['S12-4','S14-1']:add('Unsupported map positions omitted',m['metrics']['missing_geometry']>0,str(m['metrics']['missing_geometry']))
    elif sid=='S12-5':add('Unknown identity kept distinct',injection['alias'] in {x['source_id'] for x in inputs} and injection['alias'] not in o['grounded_sources'],'No arbitrary alias merge or unresolved advisory grounding.')
    elif sid=='S13-1':add('IDs remain distinct',g['source_count']==injection['baseline_sources'],str(g['source_count'])+' source IDs despite identical display names')
    elif sid in ['S13-2','F-2','F-3']:add('Lost source exposed',g['source_count']==injection['baseline_sources']-1 and injection['removed_source'] not in o['grounded_sources'],str(g['source_count'])+' sources in the evaluation graph')
    elif sid=='S13-3':add('Distinct provenance population increased',g['relation_population']['source_of']==injection['baseline_test_records']+injection['provenance_records_added'] and injection['added_records']>0,str(g['relation_population']))
    elif sid=='S13-4':add('Leakage invalidates scoring',not g['leakage_audit']['passed'] and g['metrics']['temporal_corroboration']['status']=='INVALID_LEAKAGE',g['leakage_audit']['reason'])
    elif sid=='S13-5':add('Type-invalid candidate rejected',g['type_invalid_pairs_rejected']>0,'Rule validation fixture; not a learned negative-sampling benchmark.')
    elif sid=='S8-1':add('Impossible envelopes rejected',all(x['status']=='VETO' for x in o['options']),'Negative time/cost limits cannot produce a PASS.')
    elif sid=='S8-2':add('Evidence instructions do not alter policy','override_safety' not in o['constraints']['allowed_actions'],'Tests the local deterministic pipeline; does not establish LLM injection robustness.')
    elif sid=='S8-3':add('Missing facts gate options',all(x['status']!='PASS' for x in o['options']),'Missing goal/resources remain unresolved.')
    elif sid=='S8-4':add('Duplicate proposals exposed',o['metrics']['distinct_options']==1 and sum(x['status']!='PASS' for x in o['options'])>=2,'Critic retains duplicate-option failure.')
    elif sid=='S14-2':add('Stale records labeled and excluded from advisory grounding',any('stale' in x['quality'] for x in inputs) and injection['stale_source'] not in o['grounded_sources'],str(m['metrics']['stale_records'])+' mapped stale records')
    elif sid=='S14-3':add('Dense geometry retained',len({tuple(f['geometry']['coordinates']) for f in m['geojson']['features']})==1,'Coordinate retention checked; browser layout is outside this functional check.')
    elif sid=='F-1':add('Missing FCI explicit',any('fci_strength' in x['missing_fields'] for x in p['predictions'] if x['split']=='test'),'No missing signal presented as observed.')
    elif sid=='F-6':add('Drift condition visible',any('calibration_drift' in x['quality'] for x in inputs),'Quality metrics are reported, not assumed to pass.')
    elif sid=='F-7':add('Payload comparison measured',n['summary_bytes']<n['raw_bytes'],f"{n['raw_bytes']} raw bytes; {n['summary_bytes']} summary bytes")
    elif sid.startswith('D-'):
        add('Recorded events accounted for',n['lost_recorded_events']==0,str(n['lost_recorded_events'])+' recorded events lost')
        if sid=='D-1':add('Six-hour trace',n['simulated_partition_seconds']==21600,'Simulated time, not wall-clock endurance.')
        if sid=='D-2':add('Replays deduplicated',n['duplicates']==min(20,n['expected_unique']),str(n['duplicates']))
        reasons={'D-3':'invalid_authenticator','D-4':'identity_equivocation','D-5':'unaccepted_model','D-9':'timestamp_outside_window'}
        if sid in reasons:add('Bad record quarantined',any(x['reason']==reasons[sid] for x in n['quarantined']),reasons[sid])
        if sid=='D-6':add('Out-of-bounds update rejected',n['update_validation']['decision']=='REJECT',n['update_validation']['scope'])
        if sid=='D-7':add('Gateway recovery trace',n['simulated_partition_seconds']>0,'Queue drains after contact returns.')
        if sid=='D-8':add('Reduced byte capacity used',n['bandwidth_bytes_per_second']==10000,'Capacity is 10% of the 100,000 B/s baseline.')
        if sid=='D-10':add('Counterevidence retained',any('counterevidence' in x['quality'] for x in inputs),'Source disagreement stays in the record.')
    elif sid.startswith('M-'):
        fields=injection['changed_fields']
        expected={'M-1':injection['truth_labels_changed']>0 and fields['variables']>0,'M-2':fields['variables']==26 and fields['source_id']==0 and injection['truth_labels_changed']>0,'M-3':0<fields['lat']<injection['baseline_test_records'],'M-4':fields['variables']>0 and injection['truth_labels_changed']==0,'M-5':fields['variables']==40 and injection['truth_labels_changed']==40}
        add('Specified motif changed the intended evidence',expected.get(sid,False),str(injection))
    else:add('Four products generated',bool(p['predictions'] and g['nodes'] and o['options'] and m['geojson']),'Local reference configuration')
    add('No hard violations in PASS options',o['metrics']['hard_violations_in_passing_options']==0,'Hard cost/time/action checks remain outside the estimator.')
    return {'passed':all(c['passed'] for c in checks),'checks':checks,'criterion_scope':'Functional invariant checks; performance targets and SME judgments remain separate.'}

def run_suite(seed=11,ids=None,progress=None,cancel=None,dataset=None,constraints=None,on_result=None):
    progress=progress or (lambda stage,message:None);cancel=cancel or (lambda:None);t=time.perf_counter();rows=[]
    selected=[s for s in SCENARIOS if ids is None or s['id'] in ids]
    if not selected or (ids is not None and any(i not in {s['id'] for s in SCENARIOS} for i in ids)):raise ValueError('Choose valid scenario IDs')
    ds=copy.deepcopy(dataset or generated(seed));baseline=execute(dataset=ds,seed=seed,constraints=constraints,cancel=cancel);attach(baseline,baseline)
    if on_result:on_result(baseline)
    for i,s in enumerate(selected):
        cancel();progress('suite',f"{i+1}/{len(selected)} • {s['name']}")
        try:
            reason=scenario_applicability(ds,s['id'])
            if reason:raise ScenarioNotApplicable(reason)
            r=baseline if s['id']=='clean' else attach(execute(dataset=ds,seed=seed,scenario=s['id'],constraints=constraints,cancel=cancel),baseline)
            if on_result and s['id']!='clean':on_result(r)
            check=check_scenario(s['id'],r)
            rows.append({'scenario':s,'run_id':r['id'],'status':'PASS' if check['passed'] else 'FAIL',**check,'timing_seconds':r['timing']['total_seconds'],'task12':r['task12']['metrics'],'task13':r['task13']['metrics'],'task8':r['task8']['metrics'],'task14':r['task14']['metrics'],'assessment':r['assessment'],'injection':r['scenario_context']['injection'],'network':r['network'],'evidence_root':r['proof']['event_root']})
        except Cancelled:raise
        except ScenarioNotApplicable as e:rows.append({'scenario':s,'status':'SKIP','passed':None,'reason':str(e),'checks':[]})
        except Exception as e:rows.append({'scenario':s,'status':'ERROR','passed':False,'error':str(e),'checks':[]})
    return {'id':'suite-'+uuid.uuid4().hex[:16],'created_at':now(),'seed':seed,'dataset':baseline['dataset'],'baseline_run_id':baseline['id'],'constraints':baseline['config']['constraints'],'runtime_code_manifest':code_snapshot(),'rows':rows,'seconds':time.perf_counter()-t,'passed':sum(x['status']=='PASS' for x in rows),'failed':sum(x['status']=='FAIL' for x in rows),'errors':sum(x['status']=='ERROR' for x in rows),'skipped':sum(x['status']=='SKIP' for x in rows),'scope':'Measured execution on the selected dataset. Fault cases apply labeled software overlays; skipped cases lack prerequisites. Functional PASS is separate from detection quality and Army acceptance.'}

def benchmark(progress=None,cancel=None):
    progress=progress or (lambda s,m:None);cancel=cancel or (lambda:None);rows=[]
    for seed in SEEDS:
        cancel();progress('benchmark',f'Running held-out capture comparison, seed {seed}');r=execute(seed=seed,cancel=cancel)
        rows.append({'seed':seed,'task12':r['task12']['metrics'],'task13':r['task13']['metrics'],'interaction':r['interaction']['metrics'],'seconds':r['timing']['total_seconds'],'model_sha256':r['model']['sha256'],'evidence_root':r['proof']['event_root']})
    vals=[r['interaction']['fused']['f1']-r['interaction']['sequence']['f1'] for r in rows];avg=mean(vals);sd=math_sdev(vals);half=2.776*sd/(len(vals)**.5)
    return {'id':'benchmark-'+uuid.uuid4().hex[:16],'created_at':now(),'kind':'benchmark','seeds':SEEDS,'runtime_code_manifest':code_snapshot(),'rows':rows,'paired_f1_delta_mean':avg,'paired_f1_delta_95_t_interval':[avg-half,avg+half],'interval_scope':'Variation across five synthetic generator/training seeds; not independent field trials or operational generalization.'}

def stress_sweep(progress=None,cancel=None):
    progress=progress or (lambda s,m:None);cancel=cancel or (lambda:None);rows=[];start=time.perf_counter()
    for seed in SEEDS:
        cancel()
        suite=run_suite(seed=seed,progress=lambda stage,message:progress(stage,f'Seed {seed}: {message}'),cancel=cancel)
        for row in suite['rows']:
            row.pop('run_id',None);row['seed']=seed;rows.append(row)
    return {'id':'stress-'+uuid.uuid4().hex[:16],'created_at':now(),'kind':'stress','seeds':SEEDS,'runtime_code_manifest':code_snapshot(),'rows':rows,'seconds':time.perf_counter()-start,**{key:sum(r['status']==status for r in rows) for key,status in [('passed','PASS'),('failed','FAIL'),('errors','ERROR'),('skipped','SKIP')]},'scope':'205 measured scenario/seed combinations on controlled synthetic captures. Not 205 independent field trials. Open a single case to create an exportable full run.'}

def math_sdev(xs):
    return (sum((x-mean(xs))**2 for x in xs)/(len(xs)-1))**.5 if len(xs)>1 else 0.
