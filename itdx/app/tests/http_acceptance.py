"""Starts the real loopback app and exercises HTTP in the same host process namespace."""
import sys,os,json,tempfile,threading,time,base64,subprocess,io,zipfile,http.client
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT),str(ROOT/'vendor')]
from run import Application,make_handler,ThreadingHTTPServer
from itdx.common import canonical
from verify_bundle import verify

OUT=ROOT/'sample_results';OUT.mkdir(exist_ok=True)
checks=[]
def check(name,condition,detail=''):
 checks.append({'check':name,'passed':bool(condition),'detail':detail})
 if not condition:raise AssertionError(name+': '+str(detail))

def main():
 with tempfile.TemporaryDirectory() as d:
  t0=time.perf_counter();app=Application(Path(d));server=ThreadingHTTPServer(('127.0.0.1',0),make_handler(app,0));port=server.server_address[1];server.RequestHandlerClass=make_handler(app,port);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();cold=time.perf_counter()-t0
  def request(path,body=None,headers=None):
   conn=http.client.HTTPConnection('127.0.0.1',port,timeout=40);h={'Content-Type':'application/json','X-ITDX-Token':app.token};h.update(headers or {});conn.request('POST' if body is not None else 'GET',path,canonical(body) if body is not None else None,h);r=conn.getresponse();raw=r.read();status=r.status;ctype=r.getheader('Content-Type');conn.close();return status,json.loads(raw) if ctype=='application/json' else raw
  def wait(job):
   limit=time.monotonic()+180
   while time.monotonic()<limit:
    status,j=request('/api/jobs/'+job['id'])
    if j['status'] in ['COMPLETED','ERROR','CANCELLED']:return j
    time.sleep(.05)
   raise TimeoutError(job['id'])
  try:
   status,boot=request('/api/bootstrap');check('Bootstrap sources, scenario catalog and signing',status==200 and len(boot['documents'])==30 and len(boot['scenarios'])==41)
   check('Local startup measured',cold<30,str(cold)+' seconds; app initialization only')
   check('Host header validation',request('/api/health',headers={'Host':'attacker.invalid'})[0]==403)
   check('Cross-origin writes rejected',request('/api/run',{},headers={'Origin':'https://attacker.invalid'})[0]==403)
   check('Missing request token rejected',request('/api/run',{},headers={'X-ITDX-Token':''})[0]==403)
   check('Unknown path rejected',request('/api/no-such-endpoint')[0]==404)
   for asset in ['/','/app.js','/styles.css','/earth-grid.js']:check('Static asset '+asset,request(asset)[0]==200)
   status,j=request('/api/run',{'seed':11,'scenario_id':'clean'});j=wait(j);check('Real API job completes all four tasks',j['status']=='COMPLETED',j.get('error'));runid=j['result_id'];status,r=request('/api/run?id='+runid);check('Actual four products in response',all(k in r for k in ['task12','task13','task8','task14','proof']))
   check('Raw input proof verifies',request('/api/evidence?run_id='+runid+'&index=959')[1]['verified'])
   check('Invalid evidence index rejected',request('/api/evidence?run_id='+runid+'&index=9999')[0]==400)
   # No fake SME entry is added to the exported showcase run.
   status,answer=request('/api/ask',{'query':'Form Space'});check('Native MYCA document query',status==200 and len(answer['citations'])>0)
   check('Text search links to originals',len(request('/api/search?q=DIRTNet')[1]['hits'])>0)
   doc=boot['documents'][0]['id'];check('Original document export',request('/api/document/download?id='+doc)[0]==200);check('Extracted text export',request('/api/document/text?id='+doc)[0]==200)
   docx=next(x for x in boot['documents'] if x['tables']>0);check('DOCX table CSV export',request('/api/document/tables?id='+docx['id'])[0]==200)
   csv=b'id,source_id,observed_at,lat,lon,temperature_c\nfield-001,site-a,2026-09-08T12:00:00Z,32.565,-117.129,23\n'
   status,imp=request('/api/import',{'kind':'observations','name':'independent-field.csv','data_base64':base64.b64encode(csv).decode()});check('Observation file imports with provenance',status==200 and imp['dataset']['mode']=='IMPORTED_DATA_UNVERIFIED')
   status,ij=request('/api/run',{'dataset_id':imp['dataset']['id'],'scenario_id':'clean'});ij=wait(ij);check('Imported observations execute',ij['status']=='COMPLETED',ij.get('error'));imported=request('/api/run?id='+ij['result_id'])[1];check('No labels means no claimed accuracy',imported['task12']['metrics']['temporal_readout']['f1'] is None)
   status,isj=request('/api/suite',{'dataset_id':imp['dataset']['id'],'scenario_ids':['clean','S12-1','F-1','M-3']});isj=wait(isj);check('Selected import suite completes',isj['status']=='COMPLETED',isj.get('error'));isuite=request('/api/suite?id='+isj['result_id'])[1]
   check('Suite uses selected import and explicit skips',isuite['dataset']['id']==imp['dataset']['id'] and isuite['passed']==2 and isuite['skipped']==2 and isuite['errors']==0)
   check('Imported sweep has no invented accuracy',isuite['rows'][0]['assessment']['status']=='NO_GROUND_TRUTH')
   (OUT/'imported_contract_suite.json').write_bytes(canonical(isuite))
   case=request('/api/run?id='+isuite['rows'][1]['run_id'])[1];check('Saved suite case exposes labeled software overlay',case['config']['data_mode']=='IMPORTED_DATA_WITH_SYNTHETIC_INJECTS' and case['dataset']['records']==1)
   status,rejected=request('/api/benchmark',{'dataset_id':imp['dataset']['id']});rejected=wait(rejected);check('Import cannot be silently replaced in generator benchmark',rejected['status']=='ERROR' and 'synthetic generator' in rejected['error'])
   status,impdoc=request('/api/import',{'kind':'document','name':'operator-note.md','data_base64':base64.b64encode(b'Operator note for local HTTP testing.').decode()});check('Source document import',status==200)
   status,sj=request('/api/suite',{'seed':11});check('Overlapping job rejected',request('/api/benchmark',{})[0]==400);sj=wait(sj);check('41-scenario HTTP sweep completes',sj['status']=='COMPLETED',sj.get('error'));suite=request('/api/suite?id='+sj['result_id'])[1];check('All 41 functional scenarios',suite['passed']==41 and suite['failed']==suite['errors']==0);(OUT/'scenario_suite.json').write_bytes(canonical(suite))
   check('Quality degradation disclosed independently',next(x for x in suite['rows'] if x['scenario']['id']=='S12-3')['assessment']['measured']['missed_positive_records']==17)
   check('Every suite case can be reopened',all(request('/api/run?id='+row['run_id'])[0]==200 for row in suite['rows']))
   for fmt in ['csv','html','json']:
    status,export=request('/api/export-suite?id='+suite['id']+'&format='+fmt);check('Scenario export '+fmt,status==200);(OUT/('scenario_results.'+fmt)).write_bytes(canonical(export) if isinstance(export,dict) else export)
   status,stj=request('/api/stress',{});stj=wait(stj);check('205-trial stress job completes',stj['status']=='COMPLETED',stj.get('error'));stress=request('/api/suite?id='+stj['result_id'])[1];check('205 measured functional stress trials',len(stress['rows'])==205 and stress['passed']==205 and stress['failed']==stress['errors']==0);(OUT/'five_seed_stress.json').write_bytes(canonical(stress))
   for fmt in ['csv','html']:
    status,export=request('/api/export-suite?id='+stress['id']+'&format='+fmt);check('Five-seed stress export '+fmt,status==200);(OUT/('five_seed_stress.'+fmt)).write_bytes(export)
   status,bj=request('/api/benchmark',{});bj=wait(bj);check('Five-seed HTTP benchmark completes',bj['status']=='COMPLETED');bench=request('/api/suite?id='+bj['result_id'])[1];check('Exactly five recorded seed trials',len(bench['rows'])==5);(OUT/'five_seed_comparison.json').write_bytes(canonical(bench))
   # Export the clean showcase and independently validate its signed manifest.
   for kind,name in [('zip','verified_evaluation.zip'),('pdf','evaluation_report.pdf'),('html','evaluation_report.html'),('csv','evaluation_metrics.csv'),('geojson','evaluation_map.geojson'),('json','evaluation_run.json')]:
    status,data=request('/api/export?id='+runid+'&format='+kind);check('Export '+kind,status==200);data=canonical(data) if isinstance(data,dict) else data;(OUT/name).write_bytes(data)
   verified=verify(OUT/'verified_evaluation.zip');check('Independent evidence verifier',verified['integrity_valid']);(OUT/'verification_result.json').write_bytes(canonical(verified))
   with zipfile.ZipFile(OUT/'verified_evaluation.zip') as z:sig=json.loads(z.read('signature.json'))
   if sig['status']=='SIGNED':check('Pinned Ed25519 signature',verify(OUT/'verified_evaluation.zip',sig['public_key_sha256'])['signer_identity_pinned']);(OUT/'SIGNER_FINGERPRINT.txt').write_text(sig['public_key_sha256']+'\nLocal validation key; identity is not externally certified.\n')
   status,cj=request('/api/suite',{});request('/api/cancel',{'job_id':cj['id']});cj=wait(cj);check('Cancellation preserved',cj['status']=='CANCELLED')
   # Exact response fixtures for JavaScript view unit tests. No browser is simulated or claimed.
   boot=request('/api/bootstrap')[1];boot.pop('csrf_token');fixtures={'boot':boot,'run':r,'suite':suite,'stress':stress,'import_suite':isuite,'benchmark':bench,'imported':imported};(OUT/'ui_test_fixtures.json').write_bytes(canonical(fixtures))
   check('Persisted run survives reopening store',Application(Path(d)).store.get('runs',runid)['proof']['frame_root']==r['proof']['frame_root'])
  finally:server.shutdown();server.server_close();app.pool.shutdown(wait=True)
 report={'scope':'Actual Python HTTP server and API tests; browser access blocked by platform policy','checks':checks,'passed':sum(x['passed'] for x in checks),'startup_seconds':cold};(OUT/'http_acceptance.json').write_bytes(canonical(report));print(json.dumps(report,indent=2))
if __name__=='__main__':main()
