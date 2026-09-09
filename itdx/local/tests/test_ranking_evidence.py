import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from itdx.ranking import evaluate
from itdx.civil_evidence import assess
from itdx.store import Store

class RankingTests(unittest.TestCase):
    def setUp(self):
        self.input=json.loads((ROOT/'web/examples/ranking.json').read_text())
    def test_hand_calculated_profile(self):
        r=evaluate(self.input)['result']
        self.assertEqual({x['id']:x['borda_points'] for x in r['rows']},{'A':3,'B':5,'C':1})
        self.assertEqual(r['top_tie_ids'],['B'])
    def test_average_ties_conserve_points(self):
        self.input['ballots']=[{'reviewer':'one','scores':{'A':1,'B':1,'C':3}}]
        r=evaluate(self.input)['result']
        self.assertEqual(r['ballot_trace'][0]['points'],{'A':1.5,'B':1.5,'C':0})
        self.assertEqual(r['top_tie_ids'],['A','B'])
        self.assertEqual(sum(x['borda_points'] for x in r['rows']),3)
    def test_rating_conversion_discards_magnitude(self):
        self.input['mode']='rating_1_5'
        self.input['ballots']=[{'reviewer':'one','scores':{'A':5,'B':5,'C':1}}]
        self.assertEqual(evaluate(self.input)['result']['ballot_trace'][0]['points'],{'A':1.5,'B':1.5,'C':0})
    def test_abstention_and_empty_result(self):
        self.input['ballots']=[{'reviewer':'one','scores':{'A':None,'B':None,'C':None}}]
        r=evaluate(self.input)['result']
        self.assertEqual(r['counted_ballots'],0)
        self.assertEqual(r['top_tie_ids'],[])
        self.assertIsNone(r['rows'][0]['normalized_preference'])
    def test_partial_ballot_rejected(self):
        self.input['ballots'][0]['scores']['C']=None
        with self.assertRaisesRegex(ValueError,'Partial'):evaluate(self.input)
    def test_unknown_candidate_rejected(self):
        self.input['ballots'][0]['scores']['D']=1
        with self.assertRaisesRegex(ValueError,'same complete'):evaluate(self.input)
    def test_duplicate_reviewer_casefolded(self):
        self.input['ballots'][1]['reviewer']=' INVENTED EVALUATOR 1 '
        with self.assertRaisesRegex(ValueError,'duplicate evaluator'):evaluate(self.input)
    def test_integer_values_only(self):
        for bad in [True,2.5,float('nan'),0,4,'1']:
            x=copy.deepcopy(self.input);x['ballots'][0]['scores']['A']=bad
            with self.assertRaises(ValueError):evaluate(x)
    def test_replay_stable(self):
        r=evaluate(self.input)
        self.assertEqual(evaluate(r['input']),r)
    def test_permutation_does_not_change_totals(self):
        before=evaluate(self.input)['result']['rows']
        self.input['ballots'].reverse();self.input['candidates'].reverse()
        self.assertEqual(evaluate(self.input)['result']['rows'],before)

class CivilEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.input=json.loads((ROOT/'web/examples/civil_evidence.json').read_text())
    def test_unknown_cells_and_declared_common_sources(self):
        r=assess(self.input)['result']
        self.assertEqual(len(r['matrix']),36)
        self.assertEqual(sum(c['status']=='UNKNOWN' for c in r['matrix']),33)
        c=next(c for c in r['matrix'] if c['ascope']=='Events' and c['pmesii']=='Infrastructure')
        self.assertEqual(c['report_count'],3)
        self.assertEqual(c['declared_source_groups'],1)
        self.assertEqual(c['unknown_source_group'],1)
        self.assertEqual(r['missing_time'],1)
    def test_empty_case_is_unknown(self):
        self.input['records']=[]
        self.assertTrue(all(c['status']=='UNKNOWN' for c in assess(self.input)['result']['matrix']))
    def test_each_discipline_accepted_without_truth_claim(self):
        for discipline in ['HUMINT','SIGINT','OSINT','GEOINT','IMINT','MASINT','TECHINT','OTHER']:
            self.input['records'][0]['discipline']=discipline
            self.assertGreater(assess(self.input)['result']['source_disciplines'][discipline],0)
    def test_confidence_requires_definition(self):
        self.input['records'][0]['confidence']=4
        with self.assertRaisesRegex(ValueError,'declared scale'):assess(self.input)
        self.input['confidence_definition']='Exercise scale: 1 least confidence, 5 most; ordinal only.'
        self.assertEqual(assess(self.input)['input']['records'][0]['confidence'],4)
    def test_bad_geometry_and_naive_time_rejected(self):
        for field,value in [('location',{'lat':91,'lon':0}),('observed_at','2026-09-08T12:00:00')]:
            x=copy.deepcopy(self.input);x['records'][0][field]=value
            with self.assertRaises(ValueError):assess(x)
    def test_duplicate_report_rejected(self):
        self.input['records'].append(copy.deepcopy(self.input['records'][0]))
        with self.assertRaisesRegex(ValueError,'Duplicate'):assess(self.input)
    def test_unknown_conflict_target_rejected(self):
        self.input['records'][0]['conflicts_with']=['unknown']
        with self.assertRaisesRegex(ValueError,'must exist'):assess(self.input)
    def test_replay_and_sqlite_round_trip(self):
        r=assess(self.input);self.assertEqual(assess(r['input']),r)
        with tempfile.TemporaryDirectory() as d:
            store=Store(d);store.put('civil_cases','case1',r)
            self.assertEqual(Store(d).get('civil_cases','case1'),r)
            b=evaluate(json.loads((ROOT/'web/examples/ranking.json').read_text()))
            store.put('rankings','rank1',b)
            self.assertEqual(Store(d).get('rankings','rank1'),b)

if __name__=='__main__':unittest.main()
