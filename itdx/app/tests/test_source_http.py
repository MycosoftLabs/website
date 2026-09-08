import io,json,sys,tempfile,threading,unittest,zipfile,http.client
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT),str(ROOT/'vendor')]
from run import Application,make_handler,ThreadingHTTPServer
from itdx.common import canonical,sha

class SourceHTTPTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();cls.app=Application(cls.tmp.name)
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),make_handler(cls.app,0));cls.port=cls.server.server_address[1];cls.server.RequestHandlerClass=make_handler(cls.app,cls.port)
  cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
 @classmethod
 def tearDownClass(cls):
  cls.server.shutdown();cls.server.server_close();cls.thread.join();cls.app.pool.shutdown();cls.tmp.cleanup()
 def request(self,path,body=None,token=True):
  c=http.client.HTTPConnection('127.0.0.1',self.port,timeout=40);headers={'Content-Type':'application/json'}
  if token:headers['X-ITDX-Token']=self.app.token
  c.request('POST' if body is not None else 'GET',path,None if body is None else canonical(body),headers)
  r=c.getresponse();raw=r.read();result=(r.status,json.loads(raw) if r.getheader('Content-Type')=='application/json' else raw,r.getheader('Content-Type'));c.close();return result
 def test_static_modules_and_source_api(self):
  for p in ['/workspace.html','/workspace.css','/workspace.mjs','/replay-core.mjs']:
   status,raw,mime=self.request(p);self.assertEqual(status,200);self.assertTrue(raw)
   if p.endswith('.mjs'):self.assertIn('javascript',mime)
  state=self.request('/api/workspace')[1];self.assertEqual(len(state['tasks']),16)
  doc=state['documents'][0];page=self.request('/api/workspace/page?id='+doc['id'])[1]
  self.assertEqual(sha(page['text'].encode()),page['text_sha256'])
  self.assertEqual(self.request('/api/workspace/page?id='+doc['id']+'&page=0')[0],400)
  self.assertEqual(self.request('/api/workspace/export?format=invalid')[0],400)
 def test_note_token_and_exact_quote(self):
  doc=next(d for d in self.app.store.list('documents',2000) if d['pages'][0]['text'].strip());text=doc['pages'][0]['text']
  body={'document_id':doc['id'],'page':1,'quote':text[:80],'note':'Local API test','reviewer':'Test reviewer','task_id':14}
  self.assertEqual(self.request('/api/workspace/notes',body,False)[0],403)
  status,note,_=self.request('/api/workspace/notes',body);self.assertEqual(status,200)
  self.assertIn(note,self.request('/api/workspace')[1]['notes'])
  body['quote']='NO MATCH '+sha(b'nonexistent quote');self.assertEqual(self.request('/api/workspace/notes',body)[0],400)
 def test_integrity_export(self):
  self.assertEqual(self.request('/api/workspace/check',{},False)[0],403)
  status,result,_=self.request('/api/workspace/check',{});self.assertEqual(status,200);self.assertEqual(result['documents'],result['hash_matches'])
  data=self.request('/api/workspace/export?format=json')[1];self.assertFalse(data['originals_embedded'])
  status,raw,_=self.request('/api/workspace/export?format=zip');self.assertEqual(status,200)
  with zipfile.ZipFile(io.BytesIO(raw)) as z:
   manifest=json.loads(z.read('manifest.json'));self.assertEqual(set(z.namelist()),set(manifest['members'])|{'manifest.json','signature.json'})
 @unittest.skipUnless((ROOT/'exercise_packs/itdx-training-documents/manifest.json').exists(),'Private exercise pack not installed')
 def test_all_ten_pdfs_86_previews_search_and_originals(self):
  docs=[d for d in self.app.store.list('documents',2000) if d.get('pack_id')=='itdx-training-documents']
  self.assertEqual(len(docs),10);self.assertEqual(sum(len(d['pages']) for d in docs),86)
  for doc in docs:
   self.assertEqual(sha(self.request('/api/document/download?id='+doc['id'])[1]),doc['sha256'])
   for page in doc['pages']:
    status,raw,mime=self.request('/api/workspace/preview?id='+doc['id']+'&page='+str(page['page']));self.assertEqual(status,200);self.assertEqual(mime,'image/jpeg');self.assertTrue(raw.startswith(b'\xff\xd8'))
  result=self.request('/api/workspace/search?scope=exercise&q=TRAINING')[1];self.assertTrue(result['hits']);self.assertTrue(all(h['id'] in {d['id'] for d in docs} for h in result['hits']))

if __name__=='__main__':unittest.main()
