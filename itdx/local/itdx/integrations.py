"""Explicit local-service adapters; no implicit cloud calls or production database writes."""
import asyncio, ipaddress, json, os, socket, time
from urllib.parse import urlparse, urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler
from nlm.search.myca import MycaQueryInterface
from nlm.search.engine import SearchResult,SearchHit
from nlm.search.domains import DomainRegistry
from .documents import search_documents

DEFAULT_SERVICES={
 'nlm':{'base_url':'http://127.0.0.1:8000','health_path':'/api/nlm/health','action_path':'/api/nlm/embeddings/nature','key_env':'ITDX_NLM_API_KEY'},
 'mindex':{'base_url':'http://127.0.0.1:8003','health_path':'/health','action_path':'/unified-search/earth','key_env':'ITDX_MINDEX_API_KEY'},
 'myca':{'base_url':'http://127.0.0.1:8001','health_path':'/voice/brain/status','action_path':'','key_env':'ITDX_MYCA_API_KEY'},
 'earth':{'base_url':'http://127.0.0.1:3000','health_path':'/api/health','action_path':'/natureos/earth-simulator','key_env':''},
}

def validate_service(profile):
    out={k:str(profile.get(k,'')) for k in ['base_url','health_path','action_path','key_env']};u=urlparse(out['base_url'])
    if u.scheme not in ['http','https'] or not u.hostname or u.username or u.password or u.query or u.fragment:raise ValueError('Use an HTTP(S) service base URL without credentials, query or fragment')
    for k in ['health_path','action_path']:
        if out[k] and (not out[k].startswith('/') or out[k].startswith('//') or '?' in out[k] or '#' in out[k]):raise ValueError('Endpoint paths must begin with one slash and contain no query or fragment')
    if out['key_env'] and not out['key_env'].replace('_','').isalnum():raise ValueError('API key must be an environment variable name')
    out['base_url']=out['base_url'].rstrip('/');return out

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):raise ValueError('Service redirects are not followed')

def local_request(profile,path,body=None,query=None):
    p=validate_service(profile);host=urlparse(p['base_url']).hostname
    addresses=socket.getaddrinfo(host,None,type=socket.SOCK_STREAM)
    if not addresses or any(not (ipaddress.ip_address(a[4][0]).is_loopback or ipaddress.ip_address(a[4][0]).is_private) for a in addresses):raise ValueError('This adapter accepts localhost/private-network services only')
    url=p['base_url']+path+('?' + urlencode(query) if query else '');headers={'Accept':'application/json'}
    key=os.environ.get(p['key_env'],'') if p['key_env'] else ''
    if key:headers['Authorization']='Bearer '+key;headers['X-API-Key']=key
    if body is not None:headers['Content-Type']='application/json'
    req=Request(url,data=json.dumps(body).encode() if body is not None else None,headers=headers,method='POST' if body is not None else 'GET');t=time.perf_counter()
    with build_opener(NoRedirect()).open(req,timeout=5) as response:
        raw=response.read(2_000_001)
        if len(raw)>2_000_000:raise ValueError('Service response exceeds 2 MB')
        try:data=json.loads(raw)
        except json.JSONDecodeError:data={'text':raw.decode('utf-8',errors='replace')[:3000]}
        return {'status':'CONNECTED','http_status':response.status,'seconds':time.perf_counter()-t,'response':data,'url':url,'boundary':'External service response; health alone does not qualify a model or checkpoint.'}

def probe(profile):
    try:return local_request(profile,profile['health_path'])
    except Exception as e:return {'status':'UNAVAILABLE','error':str(e)[:500],'boundary':'Local native/reference functions remain available.'}

class LocalDocumentEngine:
    def __init__(self,documents):self.documents=documents;self.domains=DomainRegistry()
    async def search(self,request):
        t=time.perf_counter();hits=search_documents(self.documents,request.query,request.limit)
        return SearchResult(query=request.query,domains_searched=['research'],universal_results=[SearchHit(id=h['id']+'-p'+str(h['page']),domain='research',entity_type='source_document',name=h['name'],description=h['snippet'],source=h['sha256'],properties={'document_id':h['id'],'page':h['page']}) for h in hits],total_count=len(hits),timing_ms=round((time.perf_counter()-t)*1000))

def ask_local(documents,query):
    if not isinstance(query,str) or not 2<=len(query)<=2000:raise ValueError('Question must contain 2–2,000 characters')
    native=MycaQueryInterface(engine=LocalDocumentEngine(documents));answer=asyncio.run(native.ask(query,include_map=False)).to_dict()
    return {'mode':'NATIVE_MYCA_QUERY_INTERFACE_LOCAL_RETRIEVAL','answer':answer,'citations':search_documents(documents,query,8),'boundary':'Native MYCA query interface with a local document search adapter; retrieved excerpts, not LLM-generated claims.'}
