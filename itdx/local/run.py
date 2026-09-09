#!/usr/bin/env python3
"""Launch the Mycosoft ITDX26 local application. Python 3.10+; core operation is offline."""
from __future__ import annotations
import argparse, base64, concurrent.futures, copy, json, mimetypes, os, secrets, socket, sys, threading, time, traceback, uuid, webbrowser
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs,unquote

ROOT=Path(__file__).resolve().parent;sys.path.insert(0,str(ROOT/'vendor'))
from itdx.common import canonical,digest,sha,now,safe_id,atomic_json
from itdx.catalog import VERSION,TASKS,SCENARIOS,REQUIREMENTS,DEFAULT_CONSTRAINTS
from itdx.datasets import generated,import_observations
from itdx.documents import extract_document,search_documents
from itdx.store import Store
from itdx.runner import execute,run_suite,benchmark,stress_sweep,Cancelled
from itdx.assessment import attach
from itdx.ranking import evaluate as evaluate_ranking
from itdx.civil_evidence import assess as assess_civil_evidence
from itdx.evidence import signing_available,inclusion,verify_inclusion
from itdx.reports import build_bundle,pdf_report,html_report,csv_bytes,metric_rows,suite_rows,suite_html
from itdx.integrations import DEFAULT_SERVICES,validate_service,probe,ask_local,local_request

class Application:
    def __init__(self,data_dir):
        self.store=Store(data_dir);self.token=secrets.token_urlsafe(32);self.jobs={};self.lock=threading.RLock();self.pool=concurrent.futures.ThreadPoolExecutor(max_workers=1);self.started=time.perf_counter();self.source_manifest=json.loads((ROOT/'source_reference/UPSTREAM_MANIFEST.json').read_text(encoding='utf-8'))
        for item in self.source_manifest:
            file=ROOT/item['path'];item['local_sha256']=sha(file.read_bytes())
        docs=json.loads((ROOT/'bundled_documents/index.json').read_text(encoding='utf-8'))
        existing={d['id'] for d in self.store.list('documents',2000)}
        for d in docs:
            if d['id'] not in existing:self.store.put('documents',d['id'],d,original_path=str(ROOT/'bundled_documents'/d['original_file']))
        if not self.store.list('datasets'):ds=generated();self.store.put('datasets',ds['id'],ds)
        try:self.store.get('settings','services')
        except KeyError:self.store.put('settings','services',DEFAULT_SERVICES)
    def public_run(self,r):return {k:v for k,v in r.items() if k not in ['inputs','truth','stable_outputs']}
    def start_job(self,kind,args):
        with self.lock:
            if any(j['status'] in ['QUEUED','RUNNING'] for j in self.jobs.values()):raise ValueError('A job is already running. Wait or cancel before starting another.')
            identifier='job-'+uuid.uuid4().hex[:12];job={'id':identifier,'kind':kind,'status':'QUEUED','events':[],'created_at':now(),'cancelled':False};self.jobs[identifier]=job
        def progress(stage,message):
            with self.lock:job['stage']=stage;job['events'].append({'time':now(),'stage':stage,'message':message});job['events']=job['events'][-100:]
        def cancel():
            if job['cancelled']:raise Cancelled('Cancelled by operator')
        def work():
            job['status']='RUNNING'
            try:
                dataset=None
                if args.get('dataset_id'):
                    chosen=self.store.get('datasets',safe_id(args['dataset_id']))
                    if chosen['mode']!='SYNTHETIC_TEST':dataset=chosen
                if kind in ['benchmark','stress'] and dataset is not None:raise ValueError('Five-seed comparisons use the controlled synthetic generator. Use the selected-dataset scenario sweep for imported measurements.')
                if kind=='run':
                    prior=self.store.list('runs',1);parent=prior[0]['proof']['frame_root'] if prior else ''
                    result=execute(dataset=dataset,seed=args.get('seed',11),scenario=args.get('scenario_id','clean'),constraints=args.get('constraints'),progress=progress,cancel=cancel,parent_root=parent)
                    if args.get('scenario_id','clean')=='clean':attach(result,result)
                    else:
                        progress('assessment','Comparing this scenario with the unchanged capture')
                        baseline=execute(dataset=dataset,seed=args.get('seed',11),constraints=args.get('constraints'),cancel=cancel);attach(result,baseline)
                    cancel();self.store.put('runs',result['id'],result,status=result['status']);self.store.add_states(result['id'],result['task12']['predictions']);job['result_id']=result['id'];self.store.audit('run_completed',{'id':result['id'],'frame_root':result['proof']['frame_root']})
                elif kind=='suite':
                    def save_case(r):
                        cancel();self.store.put('runs',r['id'],r,status=r['status']);self.store.add_states(r['id'],r['task12']['predictions'])
                    result=run_suite(seed=int(args.get('seed',11)),ids=args.get('scenario_ids'),dataset=dataset,constraints=args.get('constraints'),on_result=save_case,progress=progress,cancel=cancel);self.store.put('suites',result['id'],result);job['result_id']=result['id']
                elif kind=='benchmark':
                    result=benchmark(progress,cancel);self.store.put('suites',result['id'],result);job['result_id']=result['id']
                elif kind=='stress':
                    result=stress_sweep(progress,cancel);self.store.put('suites',result['id'],result);job['result_id']=result['id']
                else:raise ValueError('Unknown job type')
                job['status']='COMPLETED'
            except Cancelled:job['status']='CANCELLED';progress('cancelled','Partial job stopped; no successful run is claimed.')
            except Exception as e:
                job['status']='ERROR';job['error']=str(e);progress('error',str(e));traceback.print_exc()
            finally:job['finished_at']=now()
        self.pool.submit(work);return copy.deepcopy(job)

def make_handler(app,port):
 class Handler(BaseHTTPRequestHandler):
    server_version='ITDXLocal/1.0';protocol_version='HTTP/1.1'
    def log_message(self,fmt,*args):
        if args and ('400' in str(args) or '500' in str(args)):super().log_message(fmt,*args)
    def allowed(self,write=False):
        host=self.headers.get('Host','');allowed={f'127.0.0.1:{port}',f'localhost:{port}',f'[::1]:{port}'}
        if host not in allowed:raise PermissionError('Unexpected Host header; use the localhost application URL')
        if write:
            origin=self.headers.get('Origin')
            if origin and origin not in {f'http://127.0.0.1:{port}',f'http://localhost:{port}'}:raise PermissionError('Cross-origin mutation rejected')
            if not secrets.compare_digest(self.headers.get('X-ITDX-Token',''),app.token):raise PermissionError('Missing local request token; reload the application')
            if not self.headers.get('Content-Type','').startswith('application/json'):raise ValueError('JSON request required')
    def send(self,data,status=200,ctype='application/json',filename=None):
        if not isinstance(data,bytes):data=canonical(data)
        self.send_response(status);self.send_header('Content-Type',ctype);self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','no-referrer');self.send_header('X-Frame-Options','DENY');self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; frame-src 'self'; base-uri 'none'; form-action 'self'")
        if status>=400:self.close_connection=True;self.send_header('Connection','close')
        if filename:self.send_header('Content-Disposition','attachment; filename="'+filename.replace('"','')+'"')
        self.end_headers();self.wfile.write(data)
    def body(self):
        length=int(self.headers.get('Content-Length','0'))
        if not 0<length<=24_000_000:raise ValueError('Request must be between 1 byte and 24 MB')
        obj=json.loads(self.rfile.read(length))
        if not isinstance(obj,dict):raise ValueError('JSON object required')
        return obj
    def do_GET(self):
        try:
            self.allowed();u=urlparse(self.path);path=unquote(u.path);q=parse_qs(u.query)
            if path=='/api/bootstrap':
                docs=app.store.list('documents',2000);runs=app.store.list('runs',50);suites=app.store.list('suites',50)
                return self.send({'version':VERSION,'csrf_token':app.token,'tasks':TASKS,'scenarios':SCENARIOS,'requirements':REQUIREMENTS,'constraints':DEFAULT_CONSTRAINTS,'datasets':[{k:v for k,v in d.items() if k not in ['records','truth']}|{'record_count':len(d['records'])} for d in app.store.list('datasets')],'documents':[{'id':d['id'],'name':d['name'],'sha256':d['sha256'],'bytes':d['bytes'],'pages':len(d['pages']),'tables':len(d.get('tables',[]))} for d in docs],'runs':[{'id':r['id'],'created_at':r['created_at'],'config':r['config'],'timing':r['timing'],'dataset':r['dataset']} for r in runs],'suites':[{'id':s['id'],'created_at':s['created_at'],'kind':s.get('kind','suite'),'passed':s.get('passed'),'failed':s.get('failed'),'errors':s.get('errors')} for s in suites],'signing_available':signing_available(),'services':app.store.get('settings','services'),'source_manifest':app.source_manifest,'active_jobs':[copy.deepcopy(j) for j in app.jobs.values() if j['status'] in ['RUNNING','QUEUED']],'runtime':{'platform':sys.platform,'python':sys.version.split()[0],'uptime_seconds':time.perf_counter()-app.started,'data_dir':str(app.store.root),'storage':'SQLite local evidence store; native MINDEX metadata adapter','network':'No external calls in default local runs'}})
            if path=='/api/health':return self.send({'status':'ok','version':VERSION,'loopback_only':True,'signing_available':signing_available()})
            if path=='/api/rankings':return self.send([{'id':x['id'],'title':x['input']['title'],'created_at':x['created_at'],'status':x['result']['status']} for x in app.store.list('rankings')])
            if path=='/api/civil-cases':return self.send([{'id':x['id'],'title':x['input']['title'],'created_at':x['created_at'],'data_mode':x['input']['data_mode']} for x in app.store.list('civil_cases')])
            if path=='/api/civil-evidence':
                r=app.store.get('civil_cases',safe_id(q['id'][0]));fmt=q.get('format',['json'])[0]
                if fmt=='csv':return self.send(csv_bytes(r['input']['records']),ctype='text/csv; charset=utf-8',filename=r['id']+'-reports.csv')
                if fmt=='matrix':return self.send(csv_bytes(r['result']['matrix']),ctype='text/csv; charset=utf-8',filename=r['id']+'-matrix.csv')
                if fmt!='json':raise ValueError('Unknown civil evidence export format')
                return self.send(r,filename=r['id']+'.json')
            if path=='/api/ranking':
                r=app.store.get('rankings',safe_id(q['id'][0]));fmt=q.get('format',['json'])[0]
                if fmt=='csv':return self.send(csv_bytes(r['result']['rows']),ctype='text/csv; charset=utf-8',filename=r['id']+'.csv')
                if fmt!='json':raise ValueError('Unknown ranking export format')
                return self.send(r,filename=r['id']+'.json')
            if path.startswith('/api/jobs/'):
                identifier=safe_id(path.rsplit('/',1)[1])
                if identifier not in app.jobs:raise KeyError(identifier)
                return self.send(copy.deepcopy(app.jobs[identifier]))
            if path=='/api/dataset':
                ds=app.store.get('datasets',safe_id(q.get('id',['demo-11'])[0]));offset=max(0,int(q.get('offset',[0])[0]));limit=max(1,min(500,int(q.get('limit',[60])[0])))
                return self.send({'dataset':{k:v for k,v in ds.items() if k not in ['records','truth']},'records':ds['records'][offset:offset+limit],'total':len(ds['records'])})
            if path=='/api/run':
                r=app.store.get('runs',safe_id(q['id'][0]));return self.send(app.public_run(r)|{'ratings':app.store.ratings(r['id'])})
            if path=='/api/suite':return self.send(app.store.get('suites',safe_id(q['id'][0])))
            if path=='/api/evidence':
                r=app.store.get('runs',safe_id(q['run_id'][0]));index=int(q.get('index',[0])[0])
                if not 0<=index<len(r['inputs']):raise ValueError('Observation index out of range')
                proof=inclusion(r['inputs'],index);return self.send({'observation':r['inputs'][index],'proof':proof,'verified':verify_inclusion(r['inputs'][index],proof),'index':index,'total':len(r['inputs'])})
            if path=='/api/document':return self.send(app.store.get('documents',safe_id(q['id'][0])))
            if path=='/api/document/download':
                d=app.store.get('documents',safe_id(q['id'][0]));file=ROOT/'bundled_documents'/d.get('original_file','')
                if d.get('imported'):file=app.store.root/'documents'/d['original_file']
                return self.send(file.read_bytes(),ctype=mimetypes.guess_type(d['name'])[0] or 'application/octet-stream',filename=d['id']+Path(d['name']).suffix)
            if path=='/api/document/text':
                d=app.store.get('documents',safe_id(q['id'][0]));return self.send(d['text'].encode(),ctype='text/plain; charset=utf-8',filename=d['id']+'.txt')
            if path=='/api/document/tables':
                d=app.store.get('documents',safe_id(q['id'][0]));rows=[{'table':i+1,'row':j+1,**{'column_'+str(k+1):v for k,v in enumerate(row)}} for i,t in enumerate(d.get('tables',[])) for j,row in enumerate(t)];return self.send(csv_bytes(rows),ctype='text/csv; charset=utf-8',filename=d['id']+'-tables.csv')
            if path=='/api/search':return self.send({'hits':search_documents(app.store.list('documents',2000),q.get('q',[''])[0])})
            if path=='/api/export':
                r=app.store.get('runs',safe_id(q['id'][0]));fmt=q.get('format',['zip'])[0]
                if fmt=='zip':
                    t=time.perf_counter();data,manifest,signature=build_bundle(r,app.store,app.source_manifest,app.store.list('documents',2000));app.store.audit('export',{'run_id':r['id'],'bytes':len(data),'seconds':time.perf_counter()-t,'manifest_sha256':digest(manifest),'signature':signature});return self.send(data,ctype='application/zip',filename=r['id']+'-evaluation.zip')
                if fmt=='pdf':return self.send(pdf_report(r,app.store.ratings(r['id'])),ctype='application/pdf',filename=r['id']+'-report.pdf')
                if fmt=='html':return self.send(html_report(r,app.store.ratings(r['id'])),ctype='text/html; charset=utf-8',filename=r['id']+'-report.html')
                if fmt=='csv':return self.send(csv_bytes(metric_rows(r)),ctype='text/csv; charset=utf-8',filename=r['id']+'-metrics.csv')
                if fmt=='geojson':return self.send(canonical(r['task14']['geojson']),ctype='application/geo+json',filename=r['id']+'.geojson')
                if fmt=='json':return self.send(canonical(r),filename=r['id']+'.json')
                raise ValueError('Unknown export format')
            if path=='/api/export-suite':
                s=app.store.get('suites',safe_id(q['id'][0]));fmt=q.get('format',['json'])[0]
                if fmt=='csv':return self.send(csv_bytes(suite_rows(s)),ctype='text/csv; charset=utf-8',filename=s['id']+'.csv')
                if fmt=='html':return self.send(suite_html(s),ctype='text/html; charset=utf-8',filename=s['id']+'.html')
                if fmt!='json':raise ValueError('Unknown suite export format')
                return self.send(canonical(s),filename=s['id']+'.json')
            if path=='/api/source':
                key=q['key'][0];item=next((x for x in app.source_manifest if x['key']==key),None)
                if not item:raise KeyError(key)
                return self.send({'manifest':item,'content':(ROOT/item['path']).read_text(encoding='utf-8')})
            if path=='/':path='/index.html'
            file=(ROOT/'web'/path.lstrip('/')).resolve()
            if not file.is_relative_to((ROOT/'web').resolve()) or not file.is_file():raise KeyError(path)
            return self.send(file.read_bytes(),ctype={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8'}.get(file.suffix,mimetypes.guess_type(file.name)[0] or 'application/octet-stream'))
        except PermissionError as e:self.send({'error':str(e)},403)
        except KeyError as e:self.send({'error':'Not found: '+str(e)},404)
        except (ValueError,TypeError,json.JSONDecodeError) as e:self.send({'error':str(e)},400)
        except (BrokenPipeError,ConnectionResetError):pass
        except Exception as e:traceback.print_exc();self.send({'error':'Application error: '+str(e)},500)
    def do_POST(self):
        try:
            self.allowed(write=True);body=self.body();path=urlparse(self.path).path
            if path=='/api/ranking':
                result=evaluate_ranking(body);result.update({'id':'ranking-'+uuid.uuid4().hex[:12],'created_at':now()})
                app.store.put('rankings',result['id'],result);app.store.audit('ranking_completed',{'id':result['id'],'input_sha256':result['result']['input_sha256'],'result_sha256':result['result_sha256']});return self.send(result)
            if path=='/api/civil-evidence':
                result=assess_civil_evidence(body);result.update({'id':'civil-'+uuid.uuid4().hex[:12],'created_at':now()})
                app.store.put('civil_cases',result['id'],result);app.store.audit('civil_evidence_review',{'id':result['id'],'input_sha256':result['result']['input_sha256'],'result_sha256':result['result_sha256']});return self.send(result)
            if path in ['/api/run','/api/suite','/api/benchmark','/api/stress']:return self.send(app.start_job(path.rsplit('/',1)[1],body),202)
            if path=='/api/cancel':
                job=app.jobs.get(safe_id(body['job_id']))
                if not job:raise KeyError(body['job_id'])
                job['cancelled']=True;return self.send({'status':'CANCELLATION_REQUESTED'})
            if path=='/api/import':
                name=Path(str(body['name']).replace('\\','/')).name
                if len(name)>200:raise ValueError('Filename too long')
                data=base64.b64decode(body['data_base64'],validate=True)
                if len(data)>16_000_000:raise ValueError('Import limit is 16 MB')
                if body.get('kind')=='observations':
                    ds=import_observations(name,data);app.store.put('datasets',ds['id'],ds);app.store.audit('dataset_import',{'id':ds['id'],'sha256':sha(data)});return self.send({'kind':'observations','dataset':{k:v for k,v in ds.items() if k not in ['records','truth']}|{'record_count':len(ds['records'])}})
                d=extract_document(name,data);folder=app.store.root/'documents';folder.mkdir(exist_ok=True);file=folder/(d['id']+Path(name).suffix.lower());file.write_bytes(data);d['original_file']=file.name;d['imported']=True;app.store.put('documents',d['id'],d,original_path=str(file));return self.send({'kind':'document','document':{k:v for k,v in d.items() if k not in ['pages','text','tables']}})
            if path=='/api/rating':app.store.rate(safe_id(body['run_id']),str(body['task_id']),body['reviewer'],body['score'],body.get('notes',''));return self.send({'status':'SAVED','ratings':app.store.ratings(body['run_id'])})
            if path=='/api/ask':return self.send(ask_local(app.store.list('documents',2000),body.get('query','')))
            if path=='/api/services':
                profiles=body.get('services',{});out={}
                for key in DEFAULT_SERVICES:out[key]=validate_service(profiles.get(key,DEFAULT_SERVICES[key]))
                app.store.put('settings','services',out);return self.send({'services':out})
            if path=='/api/probe':
                key=body['service']
                if key not in DEFAULT_SERVICES:raise ValueError('Unknown service')
                result=probe(app.store.get('settings','services')[key]);app.store.audit('service_probe',{'service':key,'result':result});return self.send(result)
            if path=='/api/service-sample':
                key=body['service'];profile=app.store.get('settings','services')[key]
                if key=='nlm':
                    r=app.store.get('runs',safe_id(body['run_id']));sample=r['inputs'][0];packet={'bme688':sample['variables'],'fci':{'signals':[sample['variables'].get('fci_strength',0)]},'audio_level_db':sample['variables'].get('audio_level_db'),'has_frame':sample.get('has_frame',False)};response=local_request(profile,profile['action_path'],{'packet':packet})
                elif key=='mindex':response=local_request(profile,profile['action_path'],query={'q':str(body.get('query','environment'))[:200],'limit':10})
                else:raise ValueError('Only NLM sample inference and read-only MINDEX search are enabled. MYCA and Earth status links are available separately.')
                app.store.audit('service_sample',{'service':key,'response':response});return self.send(response)
            raise KeyError(path)
        except PermissionError as e:self.send({'error':str(e)},403)
        except KeyError as e:self.send({'error':'Not found: '+str(e)},404)
        except (ValueError,TypeError,json.JSONDecodeError) as e:self.send({'error':str(e)},400)
        except (BrokenPipeError,ConnectionResetError):pass
        except Exception as e:traceback.print_exc();self.send({'error':str(e)},500)
 return Handler

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--port',type=int,default=8765);p.add_argument('--no-browser',action='store_true');p.add_argument('--data-dir',default=str(ROOT/'local_data'));p.add_argument('--self-test',action='store_true');args=p.parse_args()
    if args.self_test:
        import unittest
        tests=unittest.defaultTestLoader.discover(str(ROOT/'tests'));result=unittest.TextTestRunner(verbosity=2).run(tests);return 0 if result.wasSuccessful() else 1
    if not 1024<=args.port<=65535:raise SystemExit('Choose a port between 1024 and 65535')
    app=Application(Path(args.data_dir));server=ThreadingHTTPServer(('127.0.0.1',args.port),make_handler(app,args.port));server.daemon_threads=True
    url=f'http://127.0.0.1:{args.port}';print('\nMycosoft ITDX26 Algorithm Lab '+VERSION+'\n'+url+'\nLocal data: '+str(app.store.root)+'\nPress Ctrl+C to stop.\n',flush=True)
    if not args.no_browser:threading.Timer(.5,lambda:webbrowser.open(url)).start()
    try:server.serve_forever(poll_interval=.25)
    except KeyboardInterrupt:print('\nStopping local application.')
    finally:
        for job in app.jobs.values():job['cancelled']=True
        server.server_close();app.pool.shutdown(wait=True,cancel_futures=True)
    return 0
if __name__=='__main__':sys.exit(main())
