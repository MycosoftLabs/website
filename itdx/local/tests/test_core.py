import sys, unittest, copy, json, io, zipfile, tempfile, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT),str(ROOT/'vendor')]
from itdx.datasets import generated,validate_and_clean,import_observations,apply_scenario
from itdx.algorithms import metrics,encoded_features,valid_relation
from itdx.runner import execute,run_suite,Cancelled
from itdx.common import canonical,digest,epoch
from itdx.evidence import inclusion,verify_inclusion,signing_available
from itdx.network import simulate,validate_update
from itdx.store import Store
from itdx.reports import build_bundle,pdf_report,csv_bytes,html_report
from itdx.documents import extract_document,search_documents
from itdx.integrations import ask_local,validate_service
from verify_bundle import verify

class AlgorithmTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.ds=generated();cls.result=execute(dataset=cls.ds)
 def test_actual_native_encoder_and_products(self):
  r=self.result;self.assertEqual(r['model']['training_origin'],'synthetic_training_captures');self.assertEqual(r['model']['trained_parameters'],25);self.assertEqual(len(r['task12']['predictions'][0]['coordinates']),16);self.assertEqual(len(r['inputs']),960);self.assertEqual(r['task14']['metrics']['mapped_records'],320);self.assertEqual(len(r['task8']['options']),3)
 def test_test_truth_cannot_change_predictions_or_fit(self):
  d=copy.deepcopy(self.ds)
  for x in d['records']:
   if x['split']=='test':d['truth'][x['id']]['label']=1-d['truth'][x['id']]['label']
  changed=execute(dataset=d);self.assertEqual(self.result['model']['sha256'],changed['model']['sha256']);self.assertEqual([p['probability'] for p in self.result['task12']['predictions']],[p['probability'] for p in changed['task12']['predictions']]);self.assertNotEqual(self.result['task12']['metrics']['temporal_readout']['f1'],changed['task12']['metrics']['temporal_readout']['f1'])
 def test_same_seed_reproduces_roots_and_products(self):
  r=execute();self.assertEqual(r['proof']['event_root'],self.result['proof']['event_root']);self.assertEqual(r['proof']['world_root'],self.result['proof']['world_root']);self.assertEqual(r['proof']['self_root'],self.result['proof']['self_root'])
 def test_chain_parent_changes_frame_only(self):
  r=execute(parent_root='f'*64);self.assertNotEqual(r['proof']['frame_root'],self.result['proof']['frame_root']);self.assertEqual(r['proof']['event_root'],self.result['proof']['event_root'])
 def test_statistical_oracles_and_ties(self):
  m=metrics([0,1,1,0],[.1,.9,.8,.2]);self.assertEqual((m['f1'],m['average_precision'],m['auroc']),(1,1,1));m=metrics([0,1],[.5,.5]);self.assertEqual(m['auroc'],.5);self.assertEqual(m['average_precision'],.5);self.assertIsNone(metrics([None],[.5])['f1'])
 def test_unlabeled_import_withholds_accuracy(self):
  ds=import_observations('field.json',canonical({'records':[{'id':'f1','source_id':'thermal-a','observed_at':'2026-09-08T12:00:00Z','variables':{'temperature_c':23},'lat':32.5,'lon':-117.1}]}));r=execute(dataset=ds);self.assertEqual(r['config']['data_mode'],'IMPORTED_DATA_UNVERIFIED');self.assertIsNone(r['task12']['metrics']['temporal_readout']['f1']);self.assertEqual(r['task8']['metrics']['pass'],0)
 def test_source_removal_changes_evidence_support(self):
  r=execute(scenario='S13-2');self.assertEqual(r['task13']['source_count'],3);self.assertEqual(r['task14']['metrics']['mapped_records'],240);self.assertNotIn('agaric-1',r['task8']['grounded_sources']);self.assertNotEqual(r['proof']['event_root'],self.result['proof']['event_root'])
 def test_unknown_ontology_abstains(self):self.assertGreater(execute(scenario='S12-3')['task12']['abstained'],0)
 def test_impossible_envelope_survives_custom_override(self):
  r=execute(scenario='S8-1',constraints={'max_cost':500,'max_duration_minutes':500});self.assertEqual(r['task8']['metrics']['veto'],3)
 def test_untrusted_evidence_text_does_not_change_policy(self):
  r=execute(scenario='S8-2');self.assertEqual(r['task8']['policy_sha256'],self.result['task8']['policy_sha256']);self.assertEqual(r['task8']['metrics']['hard_violations_in_passing_options'],0)
 def test_missing_facts_and_duplicate_options_gate(self):
  self.assertEqual(execute(scenario='S8-3')['task8']['metrics']['pass'],0);self.assertEqual(execute(scenario='S8-4')['task8']['metrics']['distinct_options'],1)
 def test_relation_type_validator(self):
  self.assertTrue(valid_relation('source','observation','source_of'));self.assertFalse(valid_relation('policy','sensor','corroborates'));self.assertFalse(valid_relation('source','source','authorizes'));self.assertEqual(execute(scenario='S13-5')['task13']['type_invalid_pairs_rejected'],1)
 def test_edge_reversal_leakage_invalidates_metrics(self):
  r=execute(scenario='S13-4');self.assertIsNone(r['task13']['metrics']['temporal_corroboration']['f1']);self.assertEqual(r['task13']['metrics']['temporal_corroboration']['status'],'INVALID_LEAKAGE')
 def test_cancellation_does_not_return_success(self):
  def cancel():raise Cancelled()
  with self.assertRaises(Cancelled):execute(cancel=cancel)
 def test_invalid_scenario_fails(self):
  with self.assertRaises(ValueError):execute(scenario='not-a-scenario')
  with self.assertRaises(ValueError):run_suite(ids=['not-a-scenario'])

class InputTests(unittest.TestCase):
 def record(self):return {'id':'one','source_id':'source-a','observed_at':'2026-09-08T12:00:00Z','variables':{'temperature_c':23},'lat':32.5,'lon':-117.1}
 def test_capture_group_leakage_rejected(self):
  a=self.record();b=copy.deepcopy(a);b.update(id='two',split='train')
  with self.assertRaisesRegex(ValueError,'Capture-group leakage'):validate_and_clean([a,b])
 def test_nonfinite_and_naive_time_rejected(self):
  for value in [float('nan'),float('inf')]:
   r=self.record();r['variables']['temperature_c']=value
   with self.assertRaises(ValueError):validate_and_clean([r])
  r=self.record();r['observed_at']='2026-09-08T12:00:00'
  with self.assertRaises(ValueError):validate_and_clean([r])
 def test_dedup_and_conflicting_identity(self):
  a=self.record();self.assertEqual(validate_and_clean([a,a])[1]['duplicates_removed'],1);b=copy.deepcopy(a);b['variables']['temperature_c']=90
  with self.assertRaisesRegex(ValueError,'Conflicting'):validate_and_clean([a,b])
 def test_shared_origin_conflict_and_boolean_parsing(self):
  a=self.record();a['origin_id']='physical-origin';b=copy.deepcopy(a);b['id']='two';b['variables']['temperature_c']=100
  with self.assertRaisesRegex(ValueError,'origin ID'):validate_and_clean([a,b])
  a['has_frame']='false';self.assertIs(validate_and_clean([a])[0][0]['has_frame'],False)
 def test_crs_control_point_and_unknown_omission(self):
  a=self.record();a.update(lat=0,lon=0,crs='EPSG:3857');r=validate_and_clean([a])[0][0];self.assertAlmostEqual(r['lat'],0);self.assertAlmostEqual(r['lon'],0)
  a['crs']='UNKNOWN';r=validate_and_clean([a])[0][0];self.assertIsNone(r['lat']);self.assertIn('unsupported_crs',r['quality'])
 def test_csv_and_geojson_import(self):
  csv=b'id,source_id,observed_at,lat,lon,temperature_c\nf1,s1,2026-09-08T12:00:00Z,32,-117,23\n';r=import_observations('x.csv',csv)['records'][0];self.assertEqual(r['variables']['temperature_c'],23);self.assertEqual(r['lat'],32)
  g={'type':'FeatureCollection','features':[{'type':'Feature','properties':self.record(),'geometry':{'type':'Point','coordinates':[-117,32]}}]};self.assertEqual(import_observations('g.geojson',canonical(g))['records'][0]['lon'],-117)
 def test_label_in_input_rejected(self):
  d=generated();d['records'][0]['label']=1
  with self.assertRaisesRegex(ValueError,'separate truth'):execute(dataset=d)

class NetworkTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.records=generated()['records']
 def test_tampering_and_equivocation_quarantined(self):
  for sid,reason in [('D-3','invalid_authenticator'),('D-4','identity_equivocation'),('D-5','unaccepted_model'),('D-9','timestamp_outside_window')]:
   r=simulate(self.records,sid);self.assertEqual(r['quarantined'][0]['reason'],reason);self.assertEqual(r['lost_recorded_events'],0)
 def test_partition_and_replay_queue_accounting(self):
  r=simulate(self.records,'D-1');self.assertEqual(r['simulated_partition_seconds'],21600);self.assertEqual(r['events'][-1]['queue'],0);self.assertEqual(r['accepted'],r['expected_unique']);self.assertEqual(simulate(self.records,'D-2')['duplicates'],20)
 def test_update_norm_bounds(self):
  self.assertEqual(validate_update([3,4])['decision'],'ACCEPT');self.assertEqual(validate_update([3,4.1])['decision'],'REJECT');self.assertEqual(validate_update([float('nan')])['decision'],'REJECT')

class EvidenceTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();cls.store=Store(Path(cls.tmp.name));cls.result=execute();cls.store.put('runs',cls.result['id'],cls.result,status='COMPLETED');cls.bundle,cls.manifest,cls.signature=build_bundle(cls.result,cls.store,[],[]);cls.file=Path(cls.tmp.name)/'evaluation.zip';cls.file.write_bytes(cls.bundle)
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def test_independent_verifier_and_pin(self):
  v=verify(self.file);self.assertTrue(v['integrity_valid']);self.assertFalse(v['signer_identity_pinned'])
  if signing_available():self.assertEqual(v['signature'],'VALID');self.assertTrue(verify(self.file,self.signature['public_key_sha256'])['signer_identity_pinned']);self.assertFalse(verify(self.file,'0'*64)['integrity_valid'])
 def test_all_merkle_shapes_and_index_binding(self):
  for n in [1,2,3,5,8,17]:
   rows=[{'id':str(i),'value':i} for i in range(n)]
   for i in range(n):
    proof=inclusion(rows,i);self.assertTrue(verify_inclusion(rows[i],proof));bad=copy.deepcopy(rows[i]);bad['value']=999;self.assertFalse(verify_inclusion(bad,proof))
    if n>1:proof['index']=(i+1)%n;self.assertFalse(verify_inclusion(rows[i],proof))
 def test_tampered_artifact_rejected(self):
  out=io.BytesIO()
  with zipfile.ZipFile(io.BytesIO(self.bundle)) as original,zipfile.ZipFile(out,'w') as z:
   for n in original.namelist():z.writestr(n,original.read(n)+(b' ' if n=='metrics.csv' else b''))
  path=Path(self.tmp.name)/'tampered.zip';path.write_bytes(out.getvalue());self.assertFalse(verify(path)['integrity_valid'])
 def test_rewritten_manifest_invalidates_signature(self):
  if not signing_available():self.skipTest('cryptography optional')
  out=io.BytesIO()
  with zipfile.ZipFile(io.BytesIO(self.bundle)) as original,zipfile.ZipFile(out,'w') as z:
   for n in original.namelist():
    data=original.read(n)
    if n=='manifest.json':m=json.loads(data);m['run_id']='forged';data=canonical(m)
    z.writestr(n,data)
  path=Path(self.tmp.name)/'manifest-tampered.zip';path.write_bytes(out.getvalue());self.assertFalse(verify(path)['integrity_valid'])
 def test_private_signing_key_not_exported(self):
  with zipfile.ZipFile(io.BytesIO(self.bundle)) as z:self.assertFalse(any(n.endswith('.key') for n in z.namelist()));self.assertIn('verify_bundle.py',z.namelist())
 def test_pdf_parse_and_text_roundtrip(self):
  d=extract_document('report.pdf',pdf_report(self.result));self.assertGreaterEqual(len(d['pages']),2);self.assertIn(self.result['id'],d['text']);self.assertIn('SYNTHETIC_TEST',d['text'])
 def test_csv_formula_and_html_escape(self):
  self.assertIn(b"'=HYPERLINK",csv_bytes([{'text':'=HYPERLINK("x")'}]));r=copy.deepcopy(self.result);r['dataset']['title']='<script>alert(1)</script>';self.assertNotIn(b'<script>',html_report(r))
 def test_sqlite_reopen_preserves_run_and_atlas(self):
  self.store.add_states(self.result['id'],self.result['task12']['predictions']);second=Store(Path(self.tmp.name));self.assertEqual(second.get('runs',self.result['id'])['proof']['frame_root'],self.result['proof']['frame_root'])
  with second.connect() as c:self.assertEqual(c.execute('SELECT count(*) FROM form_states').fetchone()[0],960)
 def test_sme_scores_are_actual_entries(self):
  with self.assertRaises(ValueError):self.store.rate(self.result['id'],'12','reviewer',6,'invalid')
  self.store.rate(self.result['id'],'12','test-reviewer',3,'Explicit software test entry');self.assertTrue(any(x['reviewer']=='test-reviewer' for x in self.store.ratings(self.result['id'])))

class DocumentTests(unittest.TestCase):
 def test_all_bundled_documents_and_native_myca_retrieval(self):
  docs=json.loads((ROOT/'bundled_documents/index.json').read_text());self.assertEqual(len(docs),30);self.assertGreater(sum(len(d['text']) for d in docs),500000);hits=search_documents(docs,'Form Space');self.assertTrue(hits);r=ask_local(docs,'Form Space');self.assertTrue(r['citations']);self.assertEqual(r['mode'],'NATIVE_MYCA_QUERY_INTERFACE_LOCAL_RETRIEVAL')
 def test_docx_table_extraction(self):
  out=io.BytesIO()
  with zipfile.ZipFile(out,'w') as z:z.writestr('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:tbl><w:tr><w:tc><w:p><w:r><w:t>measurement</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>42</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>')
  d=extract_document('table.docx',out.getvalue());self.assertEqual(d['tables'][0][0],['measurement','42']);self.assertFalse(d['observation_data'])
 def test_credentials_in_service_url_rejected(self):
  with self.assertRaises(ValueError):validate_service({'base_url':'http://secret:password@localhost:8000'})
if __name__=='__main__':unittest.main(verbosity=2)
