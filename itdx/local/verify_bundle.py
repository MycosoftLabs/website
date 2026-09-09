"""Independent ITDX export verifier. Core checks use Python's standard library only."""
import argparse,base64,hashlib,json,sys,zipfile

def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode()
def sha(b):return hashlib.sha256(b).hexdigest()
def root(leaves):
    if not leaves:return bytes(32)
    while len(leaves)>1:
        if len(leaves)%2:leaves=leaves+[leaves[-1]]
        leaves=[hashlib.sha256(leaves[i]+leaves[i+1]).digest() for i in range(0,len(leaves),2)]
    return leaves[0]

def verify(path,trusted_key=None):
    errors=[];signature_status='UNSIGNED';trusted=False
    with zipfile.ZipFile(path) as z:
        names=z.namelist()
        if len(names)!=len(set(names)):raise ValueError('Duplicate ZIP member names')
        if any(n.startswith(('/','\\')) or '..' in n.replace('\\','/').split('/') for n in names):raise ValueError('Unsafe ZIP member name')
        if sum(i.file_size for i in z.infolist())>256_000_000:raise ValueError('Bundle uncompressed size exceeds verifier limit')
        manifest=json.loads(z.read('manifest.json'));sig=json.loads(z.read('signature.json'))
        declared=set(manifest['files']);actual=set(names)-{'manifest.json','signature.json'}
        if declared!=actual:errors.append('Undeclared or missing bundle files')
        for name,expected in manifest['files'].items():
            data=z.read(name)
            if sha(data)!=expected['sha256'] or len(data)!=expected['bytes']:errors.append('File integrity: '+name)
        observations=json.loads(z.read('observations.json'));evidence=json.loads(z.read('evidence.json'));config=json.loads(z.read('scenario.json'));outputs=json.loads(z.read('stable_outputs.json'))
        merkle=root([hashlib.sha256(canonical(r)).digest() for r in observations]).hex()
        if merkle!=manifest['observation_root'] or merkle!=evidence['event_root']:errors.append('Observation Merkle root')
        if sha(canonical(json.loads(z.read('source_code_manifest.json'))))!=config['code_snapshot_sha256']:errors.append('Frozen code manifest root')
        if sha(canonical(config))!=evidence['self_root']:errors.append('Configuration root')
        if sha(canonical(outputs))!=evidence['world_root']:errors.append('Stable output root')
        frame=sha('||'.join([evidence['self_root'],evidence['world_root'],evidence['event_root'],evidence['parent_frame_root']]).encode())
        if frame!=evidence['frame_root'] or frame!=manifest['frame_root']:errors.append('Frame root')
        for p in json.loads(z.read('sample_inclusion_proofs.json')):
            if not 0<=p['index']<len(observations) or len(p['siblings'])!=len(p['directions']):errors.append('Proof structure');continue
            if p['leaf_count']!=len(observations) or len(p['siblings'])!=(len(observations)-1).bit_length() or p['directions']!=[1-((p['index']>>i)&1) for i in range(len(p['siblings']))]:errors.append('Proof index/directions')
            current=hashlib.sha256(canonical(observations[p['index']])).digest()
            if current.hex()!=p['leaf']:errors.append('Proof leaf')
            for sibling,direction in zip(p['siblings'],p['directions']):
                if direction not in [0,1]:errors.append('Proof direction');continue
                sib=bytes.fromhex(sibling);current=hashlib.sha256(sib+current if direction==0 else current+sib).digest()
            if current.hex()!=merkle:errors.append('Inclusion proof root')
        if sig.get('status')=='SIGNED':
            pub=base64.b64decode(sig['public_key_base64'],validate=True)
            if sha(pub)!=sig['public_key_sha256']:errors.append('Signing-key fingerprint')
            if trusted_key:
                trusted=sha(pub)==trusted_key
                if not trusted:errors.append('Pinned signing-key fingerprint mismatch')
            try:
                from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
                Ed25519PublicKey.from_public_bytes(pub).verify(base64.b64decode(sig['signature_base64'],validate=True),canonical(manifest));signature_status='VALID'
            except ImportError:signature_status='NOT_VERIFIED_DEPENDENCY_MISSING'
            except Exception:signature_status='INVALID';errors.append('Invalid Ed25519 signature')
        elif trusted_key:errors.append('A trusted signature was requested but bundle is unsigned')
    return {'integrity_valid':not errors,'signature':signature_status,'signer_identity_pinned':trusted,'errors':errors,'run_id':manifest['run_id'],'observation_count':len(observations),'observation_root':merkle,'data_mode':manifest['data_mode']}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('bundle');parser.add_argument('--trusted-key-sha256');args=parser.parse_args()
    try:
        result=verify(args.bundle,args.trusted_key_sha256);print(json.dumps(result,indent=2));sys.exit(1 if not result['integrity_valid'] else 2 if result['signature'] in ['UNSIGNED','NOT_VERIFIED_DEPENDENCY_MISSING'] else 0)
    except Exception as e:print(json.dumps({'integrity_valid':False,'error':str(e)}));sys.exit(1)
