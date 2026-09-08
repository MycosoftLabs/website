import copy,json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT),str(ROOT/'vendor')]
from itdx.datasets import generated,import_observations,apply_scenario,ScenarioNotApplicable
from itdx.runner import execute,run_suite
from itdx.algorithms import graph_analysis
from itdx.common import canonical,epoch,iso
from itdx.reports import suite_rows,suite_html


class MeasuredScenarioTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.clean=execute()

    def test_abstentions_cannot_hide_missed_positives(self):
        r=execute(scenario='S12-3');q=r['task12']['operational']
        self.assertEqual(r['task12']['metrics']['temporal_readout']['f1'],1)
        self.assertEqual(q['missed_positive_records'],17)
        self.assertAlmostEqual(q['recall_including_abstentions'],94/111)
        self.assertLess(q['coverage'],1)

    def test_old_events_cannot_ground_current_advisories(self):
        ds=generated()
        for r in ds['records']:
            if r['split']=='test':r['ingested_at']=iso(epoch(r['ingested_at'])+7200)
        r=execute(dataset=ds)
        self.assertGreater(sum(p['decision']=='CANDIDATE' for p in r['task12']['predictions']),0)
        self.assertEqual(r['task8']['metrics']['pass'],0)
        self.assertTrue(all(not x['checks']['fresh_evidence'] and not x['evidence_refs'] for x in r['task8']['options']))

    def test_spatial_injection_changes_relative_evidence(self):
        r=execute(scenario='M-3')
        self.assertLess(r['task13']['metrics']['temporal_corroboration']['f1'],.9)
        self.assertEqual(r['task12']['metrics']['temporal_readout']['f1'],1)
        self.assertEqual(r['scenario_context']['injection']['changed_fields']['lat'],26)
        self.assertEqual(r['model']['sha256'],self.clean['model']['sha256'])

    def test_role_swap_preserves_source_counts_and_positive_total(self):
        ds=generated();r=apply_scenario(ds,'M-2',11)
        self.assertEqual(sum(x['label'] for x in ds['truth'].values()),sum(x['label'] for x in r['truth'].values()))
        self.assertEqual([x['source_id'] for x in ds['records']],[x['source_id'] for x in r['records']])
        self.assertGreater(r['injection']['truth_labels_changed'],0)

    def test_provenance_dominance_does_not_inflate_pair_accuracy(self):
        r=execute(scenario='S13-3')
        self.assertEqual(r['task13']['relation_population']['source_of'],400)
        self.assertEqual(r['task13']['metrics']['temporal_corroboration']['n'],self.clean['task13']['metrics']['temporal_corroboration']['n'])
        self.assertEqual(r['task12']['operational']['labelled_records'],320)
        self.assertEqual(r['task8']['metrics']['pass'],0)

    def test_selected_import_suite_never_substitutes_demo(self):
        ds=import_observations('capture.csv',b'id,source_id,observed_at,temperature_c\nc1,actual-source,2026-09-08T12:00:00Z,23\n')
        saved=[];s=run_suite(dataset=ds,ids=['clean','S12-1','F-1','M-3'],on_result=saved.append)
        self.assertEqual((s['passed'],s['skipped'],s['failed'],s['errors']),(2,2,0,0))
        self.assertEqual(s['dataset']['id'],ds['id']);self.assertEqual(saved[0]['inputs'][0]['source_id'],'actual-source')
        self.assertEqual(s['rows'][1]['assessment']['measured']['data_mode'],'IMPORTED_DATA_WITH_SYNTHETIC_INJECTS')
        self.assertEqual(s['rows'][1]['assessment']['status'],'NO_GROUND_TRUTH')
        self.assertEqual(len(ds['records']),1)
        self.assertTrue(all(r['model']['training_origin']=='synthetic_training_captures' for r in saved))
        self.assertIn('NO_GROUND_TRUTH',suite_html(s).decode())
        self.assertEqual(suite_rows(s)[2]['functional_status'],'SKIP')

    def test_missing_event_identity_is_not_positive_link_truth(self):
        r=copy.deepcopy(self.clean)
        for p in r['task12']['predictions']:p['event_id']=None
        graph=graph_analysis(r['inputs'],r['task12'],r['scenario_context'])
        positive_ids={p['id'] for p in r['task12']['predictions'] if p['label']==1}
        relevant=[p for p in graph['pairs'] if p['a'] in positive_ids and p['b'] in positive_ids]
        self.assertGreater(len(relevant),0);self.assertTrue(all(p['label'] is None for p in relevant))

    def test_partial_ground_truth_and_null_geometry_import(self):
        csv=b'id,source_id,observed_at,temperature_c,label,event_id\nx,site,2026-09-08T12:00:00Z,23,,\ny,site,2026-09-08T12:00:10Z,24,1,event-a\n'
        ds=import_observations('capture.csv',csv);r=execute(dataset=ds)
        self.assertEqual(r['task12']['operational']['labelled_records'],1)
        self.assertTrue(all('label' not in r and 'event_id' not in r for r in ds['records']))
        g={'type':'FeatureCollection','features':[{'type':'Feature','geometry':None,'properties':ds['records'][0]}]}
        imported=import_observations('capture.geojson',canonical(g));self.assertEqual(len(imported['records']),1);self.assertIsNone(imported['records'][0]['lat'])
        g['features'][0]['geometry']={'type':'LineString','coordinates':[[0,0],[1,1]]}
        with self.assertRaisesRegex(ValueError,'not silently discarded'):import_observations('capture.geojson',canonical(g))

    def test_orphan_truth_and_invalid_age_rejected(self):
        ds=generated();ds['truth']['absent']={'label':1}
        with self.assertRaisesRegex(ValueError,'absent'):import_observations('bad.json',canonical(ds))
        with self.assertRaisesRegex(ValueError,'Evidence age'):execute(constraints={'max_evidence_age_seconds':-1})

    def test_imported_motif_is_explicitly_inapplicable(self):
        ds=import_observations('x.json',canonical({'records':[self.clean['inputs'][0]|{'split':'test'}]}))
        with self.assertRaisesRegex(ScenarioNotApplicable,'not relabeled'):execute(dataset=ds,scenario='M-5')

if __name__=='__main__':unittest.main()
