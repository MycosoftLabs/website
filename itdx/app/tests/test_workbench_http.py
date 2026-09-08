import http.client
import json
import sys
import tempfile
import threading
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT),str(ROOT/'vendor')]
from run import Application, make_handler, ThreadingHTTPServer
from itdx.common import canonical

class WorkbenchHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory();cls.app=Application(cls.tmp.name)
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),make_handler(cls.app,0))
        cls.port=cls.server.server_address[1];cls.server.RequestHandlerClass=make_handler(cls.app,cls.port)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join();cls.app.pool.shutdown();cls.tmp.cleanup()
    def request(self,path,body=None,token=True):
        c=http.client.HTTPConnection('127.0.0.1',self.port,timeout=10)
        headers={'Content-Type':'application/json'}
        if token:headers['X-ITDX-Token']=self.app.token
        c.request('POST' if body is not None else 'GET',path,canonical(body) if body is not None else None,headers)
        r=c.getresponse();raw=r.read();status=r.status;kind=r.getheader('Content-Type');c.close()
        return status,json.loads(raw) if kind=='application/json' else raw
    def test_pages_and_examples_are_served(self):
        for path in ['/workbench.html','/workbench.js','/workbench.css','/readiness.html','/examples/ranking.json','/examples/civil_evidence.json']:
            status,body=self.request(path);self.assertEqual(status,200,path);self.assertTrue(body)
    def test_ranking_save_reload_export(self):
        data=json.loads((ROOT/'web/examples/ranking.json').read_text())
        status,r=self.request('/api/ranking',data);self.assertEqual(status,200)
        self.assertEqual(r['result']['rows'][0]['borda_points'],5)
        self.assertEqual(self.request('/api/ranking?id='+r['id'])[1],r)
        self.assertIn(b'borda_points',self.request('/api/ranking?id='+r['id']+'&format=csv')[1])
        self.assertIn(r['id'],[x['id'] for x in self.request('/api/rankings')[1]])
    def test_source_case_save_and_exports(self):
        data=json.loads((ROOT/'web/examples/civil_evidence.json').read_text())
        status,r=self.request('/api/civil-evidence',data);self.assertEqual(status,200)
        self.assertEqual(len(r['result']['matrix']),36)
        self.assertEqual(self.request('/api/civil-evidence?id='+r['id'])[1],r)
        self.assertIn(b'UNKNOWN',self.request('/api/civil-evidence?id='+r['id']+'&format=matrix')[1])
        self.assertIn(b'HUMINT',self.request('/api/civil-evidence?id='+r['id']+'&format=csv')[1])
    def test_invalid_ballot_rejected_without_save(self):
        data=json.loads((ROOT/'web/examples/ranking.json').read_text());data['ballots'][0]['scores']['A']=None
        before=len(self.request('/api/rankings')[1])
        self.assertEqual(self.request('/api/ranking',data)[0],400)
        self.assertEqual(len(self.request('/api/rankings')[1]),before)
    def test_mutation_requires_local_token(self):
        self.assertEqual(self.request('/api/ranking',{},token=False)[0],403)

if __name__=='__main__':unittest.main()
