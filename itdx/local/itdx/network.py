"""Executable store-and-forward experiments. Simulated time and test keys are explicit."""
import copy, hashlib, hmac, math, time
from .common import canonical, digest, epoch

def validate_update(vector,max_norm=5):
    if not vector or any(not math.isfinite(float(v)) for v in vector):return {'candidate_norm':None,'max_norm':max_norm,'decision':'REJECT','reason':'Empty or non-finite update'}
    norm=math.sqrt(sum(float(v)**2 for v in vector))
    return {'candidate_norm':norm,'max_norm':max_norm,'decision':'ACCEPT' if norm<=max_norm else 'REJECT','reason':'Bounded norm policy'}

def simulate(records,scenario):
    t0=time.perf_counter(); selected=[r for r in records if r['split']=='test'][:100]; messages=[]
    for i,r in enumerate(selected):
        body={'id':r['id'],'source':r['source_id'],'sequence':i,'observed_at':epoch(r['observed_at']),'model':'itdx-readout/v1','payload_hash':digest(r)}
        key=hashlib.sha256(('PUBLIC_SYNTHETIC_TEST_KEY/'+r['source_id']).encode()).digest()
        messages.append({'body':body,'authenticator':hmac.new(key,canonical(body),hashlib.sha256).hexdigest()})
    expected_unique=len(messages)
    if scenario in ['D-2','F-7']:messages+=copy.deepcopy(messages[:20])
    if scenario=='D-3' and messages:
        forged=copy.deepcopy(messages[0]);forged['body']['payload_hash']='f'*64;messages.append(forged)
    if scenario=='D-4' and messages:
        equiv=copy.deepcopy(messages[0]);equiv['body']['payload_hash']='e'*64;key=hashlib.sha256(('PUBLIC_SYNTHETIC_TEST_KEY/'+equiv['body']['source']).encode()).digest();equiv['authenticator']=hmac.new(key,canonical(equiv['body']),hashlib.sha256).hexdigest();messages.append(equiv)
    if scenario in ['D-5','D-9'] and messages:
        bad=copy.deepcopy(messages[0]);bad['body']['sequence']=999;bad['body']['id']='invalid-new-event'
        if scenario=='D-5':bad['body']['model']='unaccepted-model/v0'
        else:bad['body']['observed_at']+=999999
        key=hashlib.sha256(('PUBLIC_SYNTHETIC_TEST_KEY/'+bad['body']['source']).encode()).digest();bad['authenticator']=hmac.new(key,canonical(bad['body']),hashlib.sha256).hexdigest();messages.append(bad)
    accepted={};seen_seq={};duplicates=0;quarantine=[];events=[];cutoff=max([epoch(r['ingested_at']) for r in selected] or [0]);queued_bytes=len(canonical(messages));max_queue=len(messages)
    for msg in messages:
        body=msg['body'];key=hashlib.sha256(('PUBLIC_SYNTHETIC_TEST_KEY/'+body['source']).encode()).digest();expected=hmac.new(key,canonical(body),hashlib.sha256).hexdigest();reason=None;seq=(body['source'],body['sequence'])
        if not hmac.compare_digest(expected,msg['authenticator']):reason='invalid_authenticator'
        elif body['observed_at']>cutoff+30:reason='timestamp_outside_window'
        elif body['model']!='itdx-readout/v1':reason='unaccepted_model'
        elif seq in seen_seq and seen_seq[seq]!=digest(body):reason='identity_equivocation'
        if reason:quarantine.append({'id':body['id'],'reason':reason});continue
        if body['id'] in accepted:duplicates+=1;continue
        accepted[body['id']]=body;seen_seq[seq]=digest(body)
    bandwidth=10000 if scenario=='D-8' else 100000;partition=21600 if scenario=='D-1' else 300 if scenario=='D-7' else 0
    events=[{'simulated_second':0,'event':'Local records entered an authenticated outbox','queue':max_queue}, {'simulated_second':partition,'event':'Contact available; reconciliation begins','queue':max_queue},{'simulated_second':partition+math.ceil(queued_bytes/bandwidth),'event':'Accepted, duplicated and quarantined records accounted for','queue':0}]
    raw_bytes=len(canonical(selected));summaries=[{'id':r['id'],'source':r['source_id'],'value':r['variables'].get('iaq_index'),'hash':digest(r)} for r in selected];summary_bytes=len(canonical(summaries))
    update={'tested':scenario=='D-6',**(validate_update([999.,0.,0.]) if scenario=='D-6' else {'decision':'NOT_TESTED'}),'scope':'Bounded candidate validation; no federated training performed'}
    return {'execution':'SOFTWARE_SIMULATION','authentication':'HMAC-SHA256 with public synthetic fixture keys; not production identity signatures','expected_unique':expected_unique,'accepted':len(accepted),'duplicates':duplicates,'quarantined':quarantine,'lost_recorded_events':expected_unique-len(accepted),'max_queue':max_queue,'simulated_partition_seconds':partition,'simulated_reconciliation_seconds':math.ceil(queued_bytes/bandwidth),'measured_processing_seconds':time.perf_counter()-t0,'bandwidth_bytes_per_second':bandwidth,'raw_bytes':raw_bytes,'summary_bytes':summary_bytes,'summary_saving_fraction':1-summary_bytes/max(raw_bytes,1),'events':events,'update_validation':update,'accepted_root':digest(sorted(accepted.values(),key=lambda x:x['id'])),'limitations':['No radios, underwater links, physical gateway or battery were tested.','Queue recovery cannot restore measurements that were never recorded.']}

