"""Cited document review. Source text never becomes measurements or instructions."""
from __future__ import annotations
import csv, io, json, re, uuid, zipfile
from pathlib import Path
from .common import canonical, sha, digest, now, safe_id
from .documents import search_documents
from .evidence import sign_manifest

MARKERS = ['UNCLASSIFIED//FOUO', 'FOR TRAINING USE ONLY', 'EXERCISE UNWELCOME GUEST']

def source_path(root, store, doc):
    if doc.get('pack_id'):
        base=(root/'exercise_packs'/safe_id(doc['pack_id'])).resolve()
        path=(base/doc['original_file']).resolve()
    elif doc.get('imported'):
        base=(store.root/'documents').resolve();path=(base/doc['original_file']).resolve()
    else:
        base=(root/'bundled_documents').resolve();path=(base/doc['original_file']).resolve()
    if not path.is_relative_to(base):raise ValueError('Document path escapes its source folder')
    return path

def initialize(root, store):
    loaded=[]
    for p in sorted((root/'exercise_packs').glob('*/manifest.json')):
        pack=json.loads(p.read_text(encoding='utf-8'))
        if pack.get('schema')!='itdx-source-pack/v1' or safe_id(pack['id'])!=p.parent.name:raise ValueError('Unsupported source pack')
        if len(pack.get('documents',[]))>2000:raise ValueError('Too many pack documents')
        for doc in pack['documents']:
            doc={**doc,'pack_id':pack['id'],'data_origin':pack['data_origin']}
            original=source_path(root,store,doc)
            if sha(original.read_bytes())!=doc['sha256']:raise ValueError('Source pack original hash mismatch: '+doc['id'])
            for page in doc['pages']:
                if sha(page['text'].encode('utf-8'))!=page['text_sha256']:raise ValueError('Source pack page hash mismatch')
            store.put('documents',doc['id'],doc,original_path=str(original))
        loaded.append({'id':pack['id'],'title':pack['title'],'documents':len(pack['documents']),'data_origin':pack['data_origin'],'markings':pack.get('markings',[])})
    return loaded

def summary(doc):
    text=doc.get('text','')
    return {'id':doc['id'],'name':doc['name'],'sha256':doc['sha256'],'bytes':doc['bytes'],
      'page_count':len(doc.get('pages',[])),'pack_id':doc.get('pack_id'),'data_origin':doc.get('data_origin','SUPPLIED_DOCUMENT'),
      'markings':doc.get('markings',[m for m in MARKERS if m in text]),'related_tasks':doc.get('related_tasks',[]),
      'extraction':doc.get('extraction','Text extraction; inspect original for layout and graphics')}

def state(root,store,packs):
    docs=store.list('documents',2000)
    with (root/'reference/task_objectives.csv').open(newline='') as f:tasks=list(csv.DictReader(f))
    for task in tasks:
        task['reference_ids']=[d['id'] for d in docs if int(task['task_id']) in d.get('related_tasks',[])]
        task['reference_status']='SOURCE_REFERENCES_AVAILABLE' if task['reference_ids'] else 'NO_LINKED_SOURCE'
    return {'schema':'itdx-document-workspace/v1','packs':packs,'documents':[summary(d) for d in docs],
      'tasks':tasks,'notes':store.list('document_notes',2000),'checks':store.list('document_checks',30),
      'boundary':'Source reference availability is separate from task implementation or evaluator acceptance.'}

def page_record(store,document_id,page_number):
    doc=store.get('documents',safe_id(document_id))
    if type(page_number) is not int or not 1<=page_number<=len(doc['pages']):raise ValueError('Page out of range')
    page=doc['pages'][page_number-1]
    return {'document':summary(doc),'page':page_number,'text':page['text'],
      'text_sha256':sha(page['text'].encode('utf-8')),'preview_available':bool(doc.get('pack_id') and page.get('preview_file')),
      'citation':f"{doc['name']}, PDF page {page_number}, source SHA-256 {doc['sha256']}",
      'source_date':doc.get('source_date'),'data_origin':doc.get('data_origin','SUPPLIED_DOCUMENT')}

def save_note(store,payload):
    page=page_record(store,payload.get('document_id',''),payload.get('page'))
    quote=payload.get('quote','');note=payload.get('note','');reviewer=payload.get('reviewer','')
    if not isinstance(quote,str) or not 1<=len(quote)<=3000 or quote not in page['text']:raise ValueError('Quote must exactly match text on the cited page (1–3000 characters)')
    if not isinstance(note,str) or len(note)>10000:raise ValueError('Note exceeds 10000 characters')
    if not isinstance(reviewer,str) or not reviewer.strip() or len(reviewer)>120:raise ValueError('Reviewer label is required')
    task=payload.get('task_id');status=payload.get('review_status','unreviewed')
    if type(task) is not int or not 1<=task<=16:raise ValueError('Task must be 1–16')
    if status not in ['unreviewed','reviewed','disputed']:raise ValueError('Unknown review status')
    supersedes=payload.get('supersedes_id')
    if supersedes:
        old=store.get('document_notes',safe_id(supersedes))
        if old['document_id']!=page['document']['id']:raise ValueError('Amendment must refer to the same source document')
    item={'id':'note-'+uuid.uuid4().hex[:16],'created_at':now(),'document_id':page['document']['id'],'page':page['page'],
      'source_sha256':page['document']['sha256'],'page_sha256':page['text_sha256'],'citation':page['citation'],
      'quote':quote,'note':note,'reviewer':reviewer.strip(),'task_id':task,'review_status':status,'supersedes_id':supersedes,
      'identity_status':'LOCAL_REVIEWER_LABEL_NOT_EXTERNAL_IDENTITY_VERIFICATION'}
    item['content_sha256']=digest(item);store.put('document_notes',item['id'],item);return item

def check_documents(root,store):
    rows=[]
    for doc in store.list('documents',2000):
        path=source_path(root,store,doc);exists=path.is_file()
        actual=sha(path.read_bytes()) if exists else None
        pages=doc.get('pages',[]);nonempty=sum(bool(p.get('text','').strip()) for p in pages)
        rows.append({'document_id':doc['id'],'name':doc['name'],'original_present':exists,
          'expected_sha256':doc['sha256'],'actual_sha256':actual,'hash_matches':actual==doc['sha256'],
          'page_count':len(pages),'nonempty_text_pages':nonempty,'empty_text_pages':len(pages)-nonempty,'visual_review_status':'NOT_ESTABLISHED_BY_TEXT_PRESENCE',
          'markings':summary(doc)['markings'],'data_origin':doc.get('data_origin','SUPPLIED_DOCUMENT'),
          'probability_source_true':None})
    result={'id':'doccheck-'+uuid.uuid4().hex[:16],'created_at':now(),'method':'original-sha256-and-text-presence/v1',
      'documents':len(rows),'hash_matches':sum(r['hash_matches'] for r in rows),'rows':rows,
      'boundary':'Deterministic integrity and text-presence checks only. A matching hash does not prove source accuracy, authorization, or probability of deception.'}
    result['content_sha256']=digest(result);store.put('document_checks',result['id'],result);return result

def portable(root,store,packs):
    result=state(root,store,packs)
    result['documents']=[{**summary(d),'pages':[{'page':p['page'],'text':p['text'],'text_sha256':sha(p['text'].encode('utf-8'))} for p in d.get('pages',[])]} for d in store.list('documents',2000)]
    result['exported_at']=now();result['originals_embedded']=False
    return result

def bundle(root,store,packs):
    snapshot=portable(root,store,packs);files={'workspace.json':canonical(snapshot)}
    for doc in store.list('documents',2000):
        path=source_path(root,store,doc)
        if not path.is_file() or sha(path.read_bytes())!=doc['sha256']:raise ValueError('Original missing or changed; check documents before exporting')
        files['originals/'+doc['id']+Path(doc['name']).suffix.lower()]=path.read_bytes()
    manifest={'schema':'itdx-document-bundle/v1','created_at':now(),'members':{name:{'bytes':len(raw),'sha256':sha(raw)} for name,raw in sorted(files.items())},
      'markings':sorted({m for d in snapshot['documents'] for m in d['markings']}),
      'boundary':'Source document snapshot and reviewer notes; no tactical products or source-truth probability.'}
    files['manifest.json']=canonical(manifest);files['signature.json']=canonical(sign_manifest(manifest,store.root/'keys'))
    buffer=io.BytesIO()
    with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED) as z:
        for name,raw in files.items():z.writestr(name,raw)
    return buffer.getvalue()
