#!/usr/bin/env python3
"""Verify document bundle bytes, exact membership and optional signature trust."""
import argparse,json,sys,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent;sys.path.insert(0,str(ROOT/'vendor'))
from itdx.common import sha,digest
from itdx.evidence import verify_signature

def verify(path,trusted_key=None):
    with zipfile.ZipFile(path) as z:
        infos=z.infolist()
        if len(infos)>5000 or sum(i.file_size for i in infos)>150_000_000:raise ValueError('Bundle exceeds verifier limits')
        names=z.namelist()
        if len(names)!=len(set(names)):raise ValueError('Duplicate ZIP member')
        manifest=json.loads(z.read('manifest.json'));signature=json.loads(z.read('signature.json'))
        if manifest.get('schema')!='itdx-document-bundle/v1':raise ValueError('Unsupported bundle schema')
        if set(names)!=set(manifest['members'])|{'manifest.json','signature.json'}:raise ValueError('ZIP membership mismatch')
        for name,item in manifest['members'].items():
            if Path(name).is_absolute() or '..' in Path(name).parts or '\\' in name:raise ValueError('Unsafe ZIP member path')
            raw=z.read(name)
            if len(raw)!=item['bytes'] or sha(raw)!=item['sha256']:raise ValueError('Member hash mismatch: '+name)
        workspace=json.loads(z.read('workspace.json'))
        for doc in workspace['documents']:
            original='originals/'+doc['id']+Path(doc['name']).suffix.lower()
            if sha(z.read(original))!=doc['sha256']:raise ValueError('Original binding mismatch')
            for page in doc['pages']:
                if sha(page['text'].encode())!=page['text_sha256']:raise ValueError('Page text binding mismatch')
        docs={d['id']:d for d in workspace['documents']}
        if len(docs)!=len(workspace['documents']):raise ValueError('Duplicate document identity')
        for note in workspace['notes']:
            doc=docs[note['document_id']]
            if type(note['page']) is not int or not 1<=note['page']<=len(doc['pages']):raise ValueError('Invalid note page')
            page=doc['pages'][note['page']-1]
            if not note['quote'] or note['quote'] not in page['text'] or note['source_sha256']!=doc['sha256'] or note['page_sha256']!=page['text_sha256']:raise ValueError('Note source binding mismatch')
            if digest({k:v for k,v in note.items() if k!='content_sha256'})!=note['content_sha256']:raise ValueError('Note content hash mismatch')
        outcome=verify_signature(manifest,signature)
        if signature.get('status')=='SIGNED' and outcome['status'] not in ['VALID_SIGNATURE','DEPENDENCY_MISSING']:raise ValueError('Invalid signature')
        if trusted_key and (not outcome.get('verified') or outcome.get('public_key_sha256')!=trusted_key):raise ValueError('Trusted key mismatch or signature unavailable')
        return {'status':'VERIFIED' if outcome.get('verified') else 'HASHES_ONLY','members':len(manifest['members']),'documents':len(workspace['documents']),
          'signature':outcome,'identity_trusted':bool(trusted_key and outcome.get('verified')),'source_truth':'NOT_ESTABLISHED_BY_HASHES'}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('bundle');parser.add_argument('--trusted-key-sha256');args=parser.parse_args()
    try:r=verify(args.bundle,args.trusted_key_sha256);print(json.dumps(r,indent=2));sys.exit(0 if r['status']=='VERIFIED' else 2)
    except (ValueError,KeyError,OSError,zipfile.BadZipFile) as e:print(json.dumps({'status':'INVALID','error':str(e)}));sys.exit(1)
