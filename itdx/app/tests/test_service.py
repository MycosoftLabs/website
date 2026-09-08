import sys,tempfile,threading,http.client,json,unittest,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from run import Application,ThreadingHTTPServer
from service import service_handler
from itdx.common import canonical

class ServiceTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();cls.app=Application(cls.tmp.name);cls.token='synthetic-test-token-'+'a'*40
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),service_handler(cls.app,cls.token,'127.0.0.1'));cls.port=cls.server.server_address[1]
  cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.thread.join();cls.app.pool.shutdown();cls.tmp.cleanup()
 def request(self,path,body=None,bearer=True,csrf=True):
  headers={'Content-Type':'application/json'}
  if bearer:headers['Authorization']='Bearer '+self.token
  if csrf:headers['X-ITDX-Token']=self.app.token
  c=http.client.HTTPConnection('127.0.0.1',self.port,timeout=30);c.request('POST' if body is not None else 'GET',path,None if body is None else canonical(body),headers)
  r=c.getresponse();raw=r.read();status=r.status;mime=r.getheader('Content-Type');c.close();return status,json.loads(raw) if mime=='application/json' else raw
 def test_backend_secret_required_for_read_and_write(self):
  self.assertEqual(self.request('/api/bootstrap',bearer=False)[0],403)
  self.assertEqual(self.request('/api/health',bearer=False)[0],403)
  self.assertEqual(self.request('/api/run',{'seed':11},csrf=False)[0],403)
  self.assertTrue(self.request('/api/health')[1]['backend_authentication'])
  with self.assertRaises(ValueError):service_handler(self.app,'short','0.0.0.0')
 def test_authenticated_run_completes_and_exports_real_results(self):
  status,job=self.request('/api/run',{'seed':11,'scenario_id':'clean'});self.assertEqual(status,202)
  deadline=time.monotonic()+20
  while time.monotonic()<deadline:
   status,j=self.request('/api/jobs/'+job['id'])
   if j['status'] not in ['RUNNING','QUEUED']:break
   time.sleep(.05)
  self.assertEqual(j['status'],'COMPLETED');status,run=self.request('/api/run?id='+j['result_id']);self.assertEqual(status,200)
  self.assertIn('task12',run);self.assertIn('proof',run);self.assertTrue(run['task12']['predictions'])
  status,raw=self.request('/api/export?id='+run['id']+'&format=zip');self.assertEqual(status,200);self.assertTrue(raw.startswith(b'PK'))

if __name__=='__main__':unittest.main()
