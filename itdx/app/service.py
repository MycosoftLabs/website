#!/usr/bin/env python3
"""Authenticated service mode for the Fusarium server; desktop launch stays loopback-only."""
import argparse,os,secrets,signal
from pathlib import Path
from run import Application,make_handler,ThreadingHTTPServer,VERSION

def service_handler(app,token,host):
 if not token or len(token)<32:raise ValueError('ITDX_BACKEND_TOKEN must contain at least 32 characters')
 base=make_handler(app,0)
 class Handler(base):
  def allowed(self,write=False):
   if not secrets.compare_digest(self.headers.get('Authorization',''),'Bearer '+token):raise PermissionError('Backend authentication required')
   if write:
    if not secrets.compare_digest(self.headers.get('X-ITDX-Token',''),app.token):raise PermissionError('Application request token required')
    if not self.headers.get('Content-Type','').startswith('application/json'):raise ValueError('JSON request required')
  def do_GET(self):
   if self.path=='/api/health':
    try:
     self.allowed();return self.send({'status':'ok','version':VERSION,'transport':'authenticated-service','loopback_only':host in ['127.0.0.1','localhost'],'backend_authentication':True})
    except PermissionError as error:return self.send({'error':str(error)},403)
   return super().do_GET()
 return Handler

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--host',default='127.0.0.1');parser.add_argument('--port',type=int,default=8765);parser.add_argument('--data-dir',default=str(Path(__file__).parent/'local_data'));args=parser.parse_args()
 token=os.environ.get('ITDX_BACKEND_TOKEN','')
 if len(token)<32:raise SystemExit('Set ITDX_BACKEND_TOKEN to a random secret of at least 32 characters')
 if not 1024<=args.port<=65535:raise SystemExit('Use a port from 1024 to 65535')
 app=Application(args.data_dir);server=ThreadingHTTPServer((args.host,args.port),service_handler(app,token,args.host));server.daemon_threads=True
 def stop(*_):raise KeyboardInterrupt()
 signal.signal(signal.SIGTERM,stop)
 print(f'ITDX {VERSION} authenticated service listening on {args.host}:{args.port}',flush=True)
 try:server.serve_forever(poll_interval=.25)
 except KeyboardInterrupt:pass
 finally:
  for job in app.jobs.values():job['cancelled']=True
  server.server_close();app.pool.shutdown(wait=True,cancel_futures=True)

if __name__=='__main__':main()
