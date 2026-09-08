#!/usr/bin/env python3
"""Recompute analyst products from an exported input snapshot and frozen model."""
import argparse,json,sys,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent;sys.path[:0]=[str(ROOT),str(ROOT/'vendor')]
from verify_bundle import verify
from itdx.common import canonical,digest
from itdx.runner import code_snapshot,interaction
from itdx.algorithms import run_patterns,graph_analysis,options_analysis,map_product

def replay(path):
    validation=verify(path)
    if not validation['integrity_valid']:raise ValueError('Bundle integrity failed; replay refused')
    with zipfile.ZipFile(path) as z:
        read=lambda name:json.loads(z.read(name))
        records=read('observations.json');truth=read('truth.json');model=read('model.json');config=read('scenario.json');context=read('scenario_context.json');expected=read('stable_outputs.json');frozen=read('source_code_manifest.json')
    if digest(code_snapshot())!=digest(frozen):raise ValueError('Local source files differ from the run snapshot. Use the exact application release that produced the bundle.')
    if digest({k:v for k,v in model.items() if k!='sha256'})!=model['sha256'] or model['sha256']!=config['model_sha256']:raise ValueError('Frozen model digest mismatch')
    p=run_patterns(records,truth,model);g=graph_analysis(records,p,context);o=options_analysis(records,p,g,context);m=map_product(records,p);i=interaction(p,records,config['seed'])
    actual={'predictions':p['predictions'],'graph':{'nodes':g['nodes'],'edges':g['edges'],'pairs':g['pairs']},'options':o['options'],'map':m['geojson'],'interaction_scores':i['scores']}
    equal={k:digest(actual[k])==digest(expected[k]) for k in actual}
    return {'replay_matches':all(equal.values()),'products':equal,'expected_output_sha256':digest(expected),'replayed_output_sha256':digest(actual),'bundle_signature':validation['signature'],'scope':'Exact analyst-product recomputation from frozen inputs/model; no fitting or reinjection. Timing, UI layout and physical truth are outside equality.'}
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('bundle');p.add_argument('--output');a=p.parse_args()
    try:
        result=replay(a.bundle);text=json.dumps(result,indent=2);print(text)
        if a.output:Path(a.output).write_text(text+'\n')
        sys.exit(0 if result['replay_matches'] else 1)
    except Exception as e:print(json.dumps({'replay_matches':False,'error':str(e)}));sys.exit(1)
