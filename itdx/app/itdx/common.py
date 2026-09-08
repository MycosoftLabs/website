from __future__ import annotations
import hashlib, json, math, os, re, tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def canonical(value): return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode('utf-8')
def digest(value): return hashlib.sha256(canonical(value)).hexdigest()
def sha(data): return hashlib.sha256(data).hexdigest()
def now(): return datetime.now(timezone.utc).isoformat()
def safe_id(value):
    if not isinstance(value,str) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,100}',value): raise ValueError('Invalid identifier')
    return value
def finite(value,default=None):
    if value is None or value=='': return default
    v=float(value)
    if not math.isfinite(v): raise ValueError('Non-finite numeric value')
    return v
def atomic_json(path,value):
    path=Path(path); path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(dir=path.parent,prefix='.tmp_')
    try:
        with os.fdopen(fd,'wb') as f: f.write(canonical(value)); f.flush(); os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)
def epoch(value):
    if isinstance(value,(int,float)): return finite(value)
    dt=datetime.fromisoformat(str(value).replace('Z','+00:00'))
    if dt.tzinfo is None: raise ValueError('Timestamps require a UTC offset, such as Z')
    return dt.timestamp()
def iso(ts): return datetime.fromtimestamp(ts,timezone.utc).isoformat()
def mean(xs): return sum(xs)/len(xs) if xs else 0.0
def quantile(xs,q):
    if not xs: return 0.0
    a=sorted(xs); k=(len(a)-1)*q; lo=int(k); hi=min(lo+1,len(a)-1)
    return a[lo]+(a[hi]-a[lo])*(k-lo)

