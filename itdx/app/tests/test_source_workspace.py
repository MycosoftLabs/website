import copy,io,json,sys,tempfile,unittest,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT),str(ROOT/'vendor')]
from itdx import source_workspace as sw
from itdx.store import Store
from itdx.common import sha,canonical
from verify_workspace import verify

class SourceWorkspaceTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.store=Store(self.root/'state')
  (self.root/'bundled_documents').mkdir();(self.root/'reference').mkdir()
  (self.root/'reference/task_objectives.csv').write_bytes((ROOT/'reference/task_objectives.csv').read_bytes())
  raw=b'Synthetic source text for citation testing.\n';(self.root/'bundled_documents/source.txt').write_bytes(raw)
  self.doc={'id':'doc-test','name':'source.txt','original_file':'source.txt','sha256':sha(raw),'bytes':len(raw),'text':raw.decode(),'pages':[{'page':1,'text':raw.decode()}],'related_tasks':[10]}
  self.store.put('documents',self.doc['id'],self.doc)
 def tearDown(self):self.tmp.cleanup()
 def note(self,**changes):return sw.save_note(self.store,{'document_id':'doc-test','page':1,'quote':'Synthetic source text','note':'Reviewer observation','reviewer':'Test reviewer','task_id':10,**changes})
 def test_exact_page_quotes_and_immutable_amendments(self):
  note=self.note();second=self.note(note='Amended observation',supersedes_id=note['id'])
  self.assertNotEqual(note['id'],second['id']);self.assertEqual(self.store.get('document_notes',note['id']),note)
  self.assertEqual(Store(self.store.root).get('document_notes',second['id']),second)
  for changes in [{'quote':'invented quotation'},{'page':0},{'page':True},{'task_id':17},{'reviewer':''},{'review_status':'verified_truth'}]:
   with self.assertRaises(ValueError):self.note(**changes)
 def test_hashes_do_not_claim_truth_or_visual_review(self):
  row=sw.check_documents(self.root,self.store)['rows'][0]
  self.assertTrue(row['hash_matches']);self.assertIsNone(row['probability_source_true']);self.assertEqual(row['visual_review_status'],'NOT_ESTABLISHED_BY_TEXT_PRESENCE')
  (self.root/'bundled_documents/source.txt').write_bytes(b'changed')
  self.assertFalse(sw.check_documents(self.root,self.store)['rows'][0]['hash_matches'])
  with self.assertRaises(ValueError):sw.bundle(self.root,self.store,[])
 def test_task_reference_is_not_task_completion(self):
  state=sw.state(self.root,self.store,[]);self.assertEqual(len(state['tasks']),16)
  self.assertEqual(state['tasks'][9]['reference_ids'],['doc-test']);self.assertEqual(state['tasks'][9]['implementation_status'],'PARTIAL_SUPPORT')
 def test_bundle_exact_membership_signature_and_tamper(self):
  self.note();raw=sw.bundle(self.root,self.store,[]);path=self.root/'valid.zip';path.write_bytes(raw)
  result=verify(path);self.assertEqual(result['documents'],1);self.assertFalse(result['identity_trusted'])
  if result['signature'].get('verified'):
   self.assertTrue(verify(path,result['signature']['public_key_sha256'])['identity_trusted'])
  with self.assertRaises(ValueError):verify(path,'0'*64)
  with zipfile.ZipFile(io.BytesIO(raw)) as z:members={n:z.read(n) for n in z.namelist()}
  for mode in ['changed','extra','missing']:
   altered=dict(members)
   if mode=='changed':altered['originals/doc-test.txt']=b'changed'
   elif mode=='extra':altered['unexpected.txt']=b'new'
   else:del altered['originals/doc-test.txt']
   file=self.root/(mode+'.zip')
   with zipfile.ZipFile(file,'w') as z:
    for name,value in altered.items():z.writestr(name,value)
   with self.assertRaises(ValueError):verify(file)
 def test_pack_hashes_and_paths_are_validated(self):
  base=self.root/'exercise_packs'/'test-pack';(base/'originals').mkdir(parents=True)
  doc=copy.deepcopy(self.doc);doc['original_file']='originals/source.txt';doc['pages'][0]['text_sha256']=sha(doc['pages'][0]['text'].encode())
  (base/doc['original_file']).write_bytes((self.root/'bundled_documents/source.txt').read_bytes())
  pack={'schema':'itdx-source-pack/v1','id':'test-pack','title':'Test','data_origin':'SYNTHETIC_EXERCISE','documents':[doc]}
  (base/'manifest.json').write_bytes(canonical(pack));self.assertEqual(sw.initialize(self.root,self.store)[0]['documents'],1)
  doc['pages'][0]['text']='altered';(base/'manifest.json').write_bytes(canonical(pack))
  with self.assertRaises(ValueError):sw.initialize(self.root,self.store)
  with self.assertRaises(ValueError):sw.source_path(self.root,self.store,{'pack_id':'test-pack','original_file':'../../outside.txt'})

if __name__=='__main__':unittest.main()
