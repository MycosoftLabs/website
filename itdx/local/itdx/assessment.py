"""Measured scenario impact. These comparisons are not Army acceptance gates."""
from .common import digest


def summarize(run):
    p=run['task12'];g=run['task13'];o=run['task8'];m=run['task14'];q=p['operational']
    return {'data_mode':run['config']['data_mode'],'dataset_id':run['dataset']['id'],
        'test_records':p['test_records'],'labelled_records':q['labelled_records'],
        'coverage':q['coverage'],'precision':p['metrics']['temporal_readout']['precision'],
        'recall':q['recall_including_abstentions'],'f1':p['metrics']['temporal_readout']['f1'],
        'false_alerts':q['false_alerts'],'missed_positive_records':q['missed_positive_records'],
        'events':p['detection']['events'],'missed_events':p['detection']['missed'],
        'median_detection_seconds':p['detection']['median_seconds'],
        'graph_f1':g['metrics']['temporal_corroboration']['f1'],
        'graph_status':g['metrics']['temporal_corroboration']['status'],
        'sources':g['source_count'],'supporting_pairs':sum(x['score']>=.5 for x in g['pairs']),
        'passing_options':o['metrics']['pass'],'gated_options':o['metrics']['gate'],
        'vetoed_options':o['metrics']['veto'],'excluded_advisory_evidence':o['evidence_window']['stale_or_unresolved_excluded'],
        'mapped_records':m['metrics']['mapped_records'],'missing_geometry':m['metrics']['missing_geometry'],
        'stale_records':m['metrics']['stale_records'],'seconds':run['timing']['total_seconds']}


def compare(run,baseline):
    measured=summarize(run);reference=summarize(baseline);deltas={}
    for key,value in measured.items():
        ref=reference.get(key)
        if isinstance(value,(int,float)) and isinstance(ref,(int,float)):deltas[key]=value-ref
    notes=[]
    if measured['coverage']<1:notes.append('Some observations abstained; eligible-only F1 does not measure full coverage.')
    if measured['labelled_records']==0:notes.append('No ground truth: accuracy and false-alert claims are withheld.')
    if deltas.get('f1',0)<-1e-9:notes.append('Temporal classifier F1 decreased relative to the unchanged capture.')
    if deltas.get('recall',0)<-1e-9:notes.append('Recall including abstentions decreased.')
    if deltas.get('graph_f1',0)<-1e-9:notes.append('Link-classification F1 decreased.')
    if measured['graph_status']=='INVALID_LEAKAGE':notes.append('Link quality is invalidated by the injected split leakage.')
    if measured['passing_options']==0:notes.append('No advisory option passes the declared envelope.')
    if measured['stale_records']:notes.append('Stale map records are retained with age labels.')
    degraded=any(deltas.get(k,0)<-1e-9 for k in ['f1','recall','graph_f1','coverage'])
    status='NO_GROUND_TRUTH' if not measured['labelled_records'] else 'DEGRADATION_OBSERVED' if degraded else 'MEASURED'
    if measured['graph_status']=='INVALID_LEAKAGE':status='INVALID_LINK_EVALUATION'
    before={p['id']:p for p in baseline['task12']['predictions'] if p['split']=='test'}
    after={p['id']:p for p in run['task12']['predictions'] if p['split']=='test'}
    common=before.keys()&after.keys()
    comparable=[i for i in common if (before[i]['label'],before[i]['event_id'])==(after[i]['label'],after[i]['event_id'])]
    return {'status':status,'measured':measured,'reference':reference,'delta_from_clean':deltas,'findings':notes,
        'matched_observations':{'common_ids':len(common),'unchanged_truth_ids':len(comparable),'decision_changes_on_unchanged_truth':sum(before[i]['decision']!=after[i]['decision'] for i in comparable)},
        'baseline_run_id':baseline['id'],'baseline_event_root':baseline['proof']['event_root'],
        'baseline_model_sha256':baseline['model']['sha256'],'same_frozen_model':baseline['model']['sha256']==run['model']['sha256'],
        'definition':'Scenario impact against the same seed, selected dataset and constraints. Injected labels/populations may differ; deltas are sensitivity measurements, not causal improvement or Army pass/fail thresholds.'}


def attach(run,baseline):
    run['assessment']=compare(run,baseline)
    run['assessment_sha256']=digest(run['assessment'])
    return run
