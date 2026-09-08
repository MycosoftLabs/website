from __future__ import annotations
import csv, html, io, json, textwrap, zipfile
from pathlib import Path
from .common import canonical, digest, sha, now
from .evidence import sign_manifest, verify_signature, tree_for, inclusion, verify_inclusion

def csv_bytes(rows):
    if not rows:return b''
    keys=list(dict.fromkeys(k for r in rows for k in r));s=io.StringIO(newline='');w=csv.DictWriter(s,fieldnames=keys);w.writeheader()
    for r in rows:
        out={}
        for k in keys:
            v=r.get(k,'');v=json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v
            # Prevent spreadsheet formula execution when operator-supplied text is opened in Excel.
            if isinstance(v,str) and v[:1] in ['=','+','-','@','\t','\r']:v="'"+v
            out[k]=v
        w.writerow(out)
    return s.getvalue().encode('utf-8-sig')

def metric_rows(run):
    rows=[]
    for task,group in [('12',run['task12']['metrics']),('13',run['task13']['metrics']),('interaction',run['interaction']['metrics'])]:
        for algorithm,m in group.items():
            for k,v in m.items():rows.append({'task':task,'algorithm':algorithm,'metric':k,'value':v,'data_mode':run['config']['data_mode'],'seed':run['config']['seed']})
    for k,v in run['task8']['metrics'].items():rows.append({'task':'8','algorithm':run['task8']['mode'],'metric':k,'value':v,'data_mode':run['config']['data_mode'],'seed':run['config']['seed']})
    for k,v in run['task14']['metrics'].items():rows.append({'task':'14','algorithm':'Native CREP','metric':k,'value':v,'data_mode':run['config']['data_mode'],'seed':run['config']['seed']})
    for k,v in run['timing'].items():rows.append({'task':'timing','algorithm':'integrated','metric':k,'value':v,'data_mode':run['config']['data_mode'],'seed':run['config']['seed']})
    for k,v in run['task12'].get('operational',{}).items():rows.append({'task':'12','algorithm':'coverage_and_event_accounting','metric':k,'value':v,'data_mode':run['config']['data_mode'],'seed':run['config']['seed']})
    return rows

def suite_rows(suite):
    rows=[]
    for r in suite['rows']:
        if suite.get('kind')=='benchmark':
            rows.append({'seed':r['seed'],'data_mode':'SYNTHETIC_TEST','temporal_f1':r['task12']['temporal_readout']['f1'],'baseline_f1':r['task12']['robust_baseline']['f1'],'fused_f1':r['interaction']['fused']['f1'],'seconds':r['seconds'],'event_root':r['evidence_root']});continue
        a=r.get('assessment',{});m=a.get('measured',{});d=a.get('delta_from_clean',{})
        rows.append({'scenario':r['scenario']['id'],'name':r['scenario']['name'],'seed':r.get('seed',suite.get('seed')),'functional_status':r['status'],'quality_status':a.get('status','NOT_MEASURED'),'reason':r.get('reason',r.get('error','')),'expected':r['scenario']['expected'],**m,'f1_delta':d.get('f1'),'graph_f1_delta':d.get('graph_f1'),'recall_delta':d.get('recall'),'coverage_delta':d.get('coverage'),'same_frozen_model':a.get('same_frozen_model'),'changed_records':r.get('injection',{}).get('changed_records'),'labels_changed':r.get('injection',{}).get('truth_labels_changed'),'findings':a.get('findings',[]),'event_root':r.get('evidence_root'),'run_id':r.get('run_id')})
    return rows

def suite_html(suite):
    rows=suite_rows(suite);columns=['seed','temporal_f1','baseline_f1','fused_f1','seconds'] if suite.get('kind')=='benchmark' else ['scenario','seed','functional_status','quality_status','coverage','f1','f1_delta','recall','false_alerts','missed_events','graph_f1','passing_options','seconds']
    def cell(value):return html.escape(str(round(value,5) if isinstance(value,float) else 'Not measured' if value is None else value))
    header=''.join('<th>'+html.escape(k.replace('_',' '))+'</th>' for k in columns)
    body=''.join('<tr>'+''.join('<td>'+cell(r.get(k))+'</td>' for k in columns)+'</tr>' for r in rows)
    detail=''.join('<details><summary>'+cell(r.get('scenario','seed '+str(r.get('seed'))))+'</summary><pre>'+html.escape(json.dumps(r,indent=2))+'</pre></details>' for r in rows)
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><title>ITDX26 measured scenario results</title><style>body{font:14px/1.5 system-ui;margin:32px;color:#173a32}table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid #ccd9d2;text-align:left}th{background:#eef5f0}h1{font-size:26px}.scroll{overflow:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere}details{margin:12px 0}</style><h1>ITDX26 measured scenario results</h1><p>'+html.escape(suite['id'])+' · '+html.escape(suite['created_at'])+'</p><p>'+html.escape(suite.get('scope',suite.get('interval_scope','')))+' Functional passes do not establish detector quality. No Army acceptance rubric has been supplied.</p><div class="scroll"><table><thead><tr>'+header+'</tr></thead><tbody>'+body+'</tbody></table></div><h2>Inputs, changes and findings</h2>'+detail+'</html>').encode()

def report_lines(run,ratings=None):
    lines=['MYCOSOFT / ITDX26 LOCAL EVALUATION REPORT',run['id'], 'Created: '+run['created_at'], 'Data mode: '+run['config']['data_mode'],'Dataset: '+run['dataset']['title'],'Scenario: '+run['config']['scenario_id'],'Seed: '+str(run['config']['seed']),'',
        'EVIDENCE BOUNDARY','Measured local CPU execution. Synthetic data does not establish field performance.','The local readout is not a full trained SSM/Mamba or relational GNN.','The local MYCA option loop is deterministic. No actuator commands are issued.','Final Army injects and acceptance rubric have not been supplied.','',
        'RUN CONFIGURATION','Native NLM encoder + '+str(run['model']['trained_parameters'])+' fitted readout parameters','Model SHA-256: '+run['model']['sha256'],'Training origin: '+run['model']['training_origin'],'Training records: '+str(run['model']['training_records'])+'; validation: '+str(run['model']['validation_records']),'Inputs: '+str(run['dataset']['records'])+'; held-out task 12 records: '+str(run['task12']['test_records']),'',
        'TASK METRICS']
    for task,group in [('12',run['task12']['metrics']),('13',run['task13']['metrics']),('Interaction',run['interaction']['metrics'])]:
        for algorithm,m in group.items():
            lines.append(f"Task {task} / {algorithm} / {m['status']}")
            lines.append('  '+'; '.join(k+'='+('not measured' if m.get(k) is None else f"{m[k]:.5f}" if isinstance(m[k],float) else str(m[k])) for k in ['n','precision','recall','f1','average_precision','auroc','brier','ece']))
    if run['task12'].get('operational'):lines+=['','COVERAGE AND MISSED DETECTIONS',json.dumps(run['task12']['operational'])]
    if run.get('assessment'):
        a=run['assessment'];lines+=['','SCENARIO IMPACT',a['status'],a['definition'],'Delta from unchanged capture: '+json.dumps(a['delta_from_clean'])]+a['findings']
    lines+=['','TASK 8 / OPTIONS AND GOVERNANCE','Mode: '+run['task8']['mode'],'Policy digest: '+run['task8']['policy_sha256']]
    if run['task8'].get('evidence_window'):lines+=['Evidence age and exclusions: '+json.dumps(run['task8']['evidence_window'])]
    for o in run['task8']['options']:
        lines += [o['id']+' / '+o['title']+' / '+o['status'],'Native AVANI: '+o['native_avani']['action'],'Failed checks: '+(', '.join(o['reasons']) or 'none'),'Evidence: '+', '.join(o['evidence_refs']),'Envelope: '+json.dumps(o['envelope'],ensure_ascii=True)]
    lines+=['','TASK 14 / MAP',json.dumps(run['task14']['metrics']),'CRS: EPSG:4326; no online basemap required.','Age is relative to the replay cutoff, not the wall clock.','',
        'TIMING AND HARDWARE',json.dumps(run['timing']),json.dumps(run['hardware']),'','PROVENANCE','Observation Merkle root: '+run['proof']['event_root'],'Frame root: '+run['proof']['frame_root'],'Parent root: '+(run['proof']['parent_frame_root'] or '(genesis)'), 'Stable output digest: '+run['proof']['world_root'],'Hash integrity does not establish measurement truth or external key ownership.','',
        'SME ADJUDICATION']
    lines += [json.dumps(x,ensure_ascii=True) for x in (ratings or [])] or ['No SME ratings recorded. Unsupported-assertion rate is not automatically measured.']
    lines+=['','LIMITATIONS']+run['limitations']+run['task12']['limitations']+run['task13']['limitations']+run['task8']['limitations']+['','EXPORT REPLAY','Verify integrity: python verify_bundle.py evaluation.zip','Exact product replay: python replay.py evaluation.zip (from the matching app release)','Use --trusted-key-sha256 with a separately recorded signing-key fingerprint.','All inputs, truth labels, model parameters and stable outputs are in the ZIP.']
    return lines

def pdf_report(run,ratings=None):
    """Portable dependency-free PDF: paginated text with real PDF text objects and cross references."""
    wrapped=[]
    for line in report_lines(run,ratings):
        line=line.replace('•',' / ').replace('—','-').replace('–','-').encode('ascii','replace').decode()
        wrapped+=textwrap.wrap(line,width=94,break_long_words=True,break_on_hyphens=False) or ['']
    pages=[wrapped[i:i+49] for i in range(0,len(wrapped),49)];objects=[b'',b''];font_id=3;objects.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');kids=[]
    for i,lines in enumerate(pages):
        page_id=len(objects)+1;stream_id=page_id+1;kids.append(page_id)
        objects.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {stream_id} 0 R >>'.encode())
        commands=['0.06 0.24 0.20 rg','BT /F1 15 Tf 44 749 Td (MYCOSOFT / ITDX26 EVALUATION) Tj ET','0.16 0.21 0.20 rg','BT /F1 9 Tf 44 719 Td 12.8 TL']
        for line in lines:commands.append('('+line.replace('\\','\\\\').replace('(','\\(').replace(')','\\)')+') Tj T*')
        commands+=['ET',f'BT /F1 8 Tf 44 32 Td (Data mode: {run["config"]["data_mode"]} | Page {i+1} of {len(pages)}) Tj ET']
        stream='\n'.join(commands).encode();objects.append(b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream')
    objects[0]=b'<< /Type /Catalog /Pages 2 0 R >>';objects[1]=('<< /Type /Pages /Count '+str(len(pages))+' /Kids ['+' '.join(str(k)+' 0 R' for k in kids)+'] >>').encode()
    data=bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');offsets=[0]
    for i,obj in enumerate(objects,1):offsets.append(len(data));data.extend(f'{i} 0 obj\n'.encode()+obj+b'\nendobj\n')
    xref=len(data);data.extend(f'xref\n0 {len(objects)+1}\n0000000000 65535 f \n'.encode())
    for pos in offsets[1:]:data.extend(f'{pos:010d} 00000 n \n'.encode())
    data.extend(f'trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode());return bytes(data)

def html_report(run,ratings=None):
    body=[]
    for line in report_lines(run,ratings):
        if line and line.upper()==line and len(line)<65:body.append('<h2>'+html.escape(line)+'</h2>')
        else:body.append('<p>'+html.escape(line)+'</p>')
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><title>ITDX26 evaluation '+html.escape(run['id'])+'</title><style>body{font:15px/1.55 system-ui,sans-serif;max-width:950px;margin:48px auto;padding:0 24px;color:#173a32}h2{margin-top:30px;border-bottom:1px solid #bdcfc8;padding-bottom:8px}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0}@media print{body{font-size:10pt;margin:0}h2{break-after:avoid}}</style>'+''.join(body)+'</html>').encode()

def build_bundle(run,store,source_manifest,documents):
    ratings=store.ratings(run['id']);files={
        'scenario.json':canonical(run['config']), 'scenario_context.json':canonical(run['scenario_context']), 'dataset_manifest.json':canonical(run['dataset']), 'observations.json':canonical(run['inputs']), 'truth.json':canonical(run['truth']),
        'model.json':canonical(run['model']), 'stable_outputs.json':canonical(run['stable_outputs']), 'predictions.json':canonical(run['task12']),
        'graph.json':canonical(run['task13']), 'courses_of_action.json':canonical(run['task8']), 'map.geojson':canonical(run['task14']['geojson']),
        'interaction.json':canonical(run['interaction']), 'network_simulation.json':canonical(run['network']), 'evidence.json':canonical(run['proof']),
        'metrics.csv':csv_bytes(metric_rows(run)), 'observations.csv':csv_bytes([{k:v for k,v in r.items() if k!='variables'}|r['variables'] for r in run['inputs']]),
        'predictions.csv':csv_bytes(run['task12']['predictions']), 'sme_ratings.json':canonical(ratings),'upstream_source_manifest.json':canonical(source_manifest),'source_code_manifest.json':canonical(run['runtime_code_manifest']),
        'source_documents.json':canonical([{'id':d['id'],'name':d['name'],'sha256':d['sha256'],'bytes':d['bytes']} for d in documents]),
        'run_report.pdf':pdf_report(run,ratings),'run_report.html':html_report(run,ratings),'run_report.md':'\n\n'.join(report_lines(run,ratings)).encode(),
        'hardware.json':canonical(run['hardware']),'timing.json':canonical(run['timing']),'data_audit.json':canonical(run['audit'])}
    if run.get('assessment'):files['scenario_assessment.json']=canonical(run['assessment'])
    proofs=[inclusion(run['inputs'],i) for i in range(min(len(run['inputs']),12))];files['sample_inclusion_proofs.json']=canonical(proofs)
    files['VERIFY.txt']=('Verification: python verify_bundle.py evaluation.zip\nPin the signer fingerprint independently for identity trust.\nHash/Merkle verification is available without cryptography. Ed25519 requires cryptography.\nThis bundle contains a local reference implementation result, not Army acceptance.\n').encode()
    # Include the actual standalone verifier, not a command for an unavailable script.
    verifier=Path(__file__).resolve().parents[1]/'verify_bundle.py'
    if verifier.exists():files['verify_bundle.py']=verifier.read_bytes()
    manifest={'schema':'itdx-export/v1','run_id':run['id'],'created_at':now(),'data_mode':run['config']['data_mode'],'files':{name:{'sha256':sha(data),'bytes':len(data)} for name,data in sorted(files.items())},'observation_root':run['proof']['event_root'],'frame_root':run['proof']['frame_root'],'disclosure':'Signatures establish integrity under the supplied public key; external identity trust requires a separately pinned fingerprint.'}
    signature=sign_manifest(manifest,store.root/'keys');files['manifest.json']=canonical(manifest);files['signature.json']=canonical(signature)
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
        for name,data in files.items():z.writestr(name,data)
    return out.getvalue(),manifest,signature
