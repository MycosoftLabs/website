from __future__ import annotations
import base64, hashlib, json, os
from pathlib import Path
from nlm.core.merkle import MerkleTree, MerkleProof, sha256_bytes, compute_frame_root, verify_frame_root
from .common import canonical, digest, sha, atomic_json

def tree_for(records):return MerkleTree([sha256_bytes(canonical(r)) for r in records])
def inclusion(records,index):
    tree=tree_for(records);p=tree.proof(index)
    return {'algorithm':'NLM binary Merkle SHA256','index':index,'leaf_count':len(records),'root':p.root.hex(),'leaf':p.leaf.hex(),'siblings':[s.hex() for s in p.siblings],'directions':p.directions,'observation_id':records[index]['id']}
def verify_inclusion(record,proof):
    try:
        if not 0<=proof['index']<proof['leaf_count']:return False
        if len(proof['siblings'])!=len(proof['directions']) or len(proof['siblings'])!=(proof['leaf_count']-1).bit_length():return False
        if proof['directions']!=[1-((proof['index']>>i)&1) for i in range(len(proof['siblings']))]:return False
        if any(x not in [0,1] for x in proof['directions']):return False
        if sha(canonical(record))!=proof['leaf']:return False
        return MerkleProof(root=bytes.fromhex(proof['root']),leaf=bytes.fromhex(proof['leaf']),index=proof['index'],siblings=[bytes.fromhex(x) for x in proof['siblings']],directions=proof['directions']).verify()
    except (KeyError,ValueError,TypeError):return False

def attest(records,outputs,config,parent_root=''):
    event_root=tree_for(records).root.hex();self_root=digest(config);world_root=digest(outputs);frame_root=compute_frame_root(self_root,world_root,event_root,parent_root)
    return {'algorithm':'NLM string frame-root + binary observation Merkle tree','frame_root':frame_root,'parent_frame_root':parent_root,'self_root':self_root,'world_root':world_root,'event_root':event_root,'observation_count':len(records),'canonicalization':'UTF-8 JSON, sorted keys, compact separators, non-finite numbers rejected','verified':verify_frame_root(frame_root,self_root,world_root,event_root,parent_root)}

def signing_available():
    try:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
        return True
    except ImportError:return False

def sign_manifest(manifest,key_dir):
    if not signing_available():return {'status':'UNSIGNED','reason':'Install cryptography to enable Ed25519 signing. Hash and Merkle verification remain available.'}
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    from cryptography.hazmat.primitives import serialization
    key_dir=Path(key_dir);key_dir.mkdir(parents=True,exist_ok=True);path=key_dir/'ed25519.key'
    if path.exists():key=Ed25519PrivateKey.from_private_bytes(path.read_bytes())
    else:
        key=Ed25519PrivateKey.generate();raw=key.private_bytes(serialization.Encoding.Raw,serialization.PrivateFormat.Raw,serialization.NoEncryption())
        fd=os.open(str(path),os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'wb') as f:f.write(raw)
    pub=key.public_key().public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw);signature=key.sign(canonical(manifest))
    return {'status':'SIGNED','algorithm':'Ed25519','public_key_base64':base64.b64encode(pub).decode(),'signature_base64':base64.b64encode(signature).decode(),'public_key_sha256':sha(pub),'trust':'Locally generated operator key. Pin this fingerprint independently; a included public key alone is not external identity verification.'}

def verify_signature(manifest,signature):
    if signature.get('status')!='SIGNED':return {'status':'UNSIGNED','verified':False}
    if not signing_available():return {'status':'DEPENDENCY_MISSING','verified':False}
    try:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
        raw=base64.b64decode(signature['public_key_base64'],validate=True)
        if sha(raw)!=signature['public_key_sha256']:return {'status':'INVALID_KEY_FINGERPRINT','verified':False}
        Ed25519PublicKey.from_public_bytes(raw).verify(base64.b64decode(signature['signature_base64'],validate=True),canonical(manifest))
        return {'status':'VALID_SIGNATURE','verified':True,'public_key_sha256':sha(raw),'identity_trusted':False}
    except Exception:return {'status':'INVALID_SIGNATURE','verified':False}

