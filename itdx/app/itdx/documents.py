from __future__ import annotations
import io, json, re, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from .common import sha

def extract_document(name,data):
    suffix=Path(name).suffix.lower();pages=[];tables=[]
    if suffix=='.pdf':
        try:from pypdf import PdfReader
        except ImportError:raise ValueError('PDF text import requires pypdf. Bundled documents already include extracted text; install optional dependencies to add more PDFs.')
        reader=PdfReader(io.BytesIO(data))
        if reader.is_encrypted:raise ValueError('Encrypted PDF: supply a decrypted copy')
        if len(reader.pages)>600:raise ValueError('PDF limit is 600 pages per import')
        pages=[{'page':i+1,'text':p.extract_text() or ''} for i,p in enumerate(reader.pages)]
    elif suffix=='.docx':
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            if sum(i.file_size for i in z.infolist())>40_000_000:raise ValueError('DOCX uncompressed size exceeds 40 MB')
            raw=z.read('word/document.xml')
        root=ET.fromstring(raw);ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        text='\n'.join(''.join(p.itertext()) if False else ''.join(t.text or '' for t in p.findall('.//w:t',ns)) for p in root.findall('.//w:p',ns))
        pages=[{'page':1,'text':text}]
        for table in root.findall('.//w:tbl',ns):tables.append([[' '.join(t.text or '' for t in cell.findall('.//w:t',ns)) for cell in row.findall('w:tc',ns)] for row in table.findall('w:tr',ns)])
    elif suffix in ['.md','.txt','.sql','.csv','.json']:
        pages=[{'page':1,'text':data.decode('utf-8-sig')}]
    elif suffix in ['.jpg','.jpeg','.png']:
        pages=[{'page':1,'text':'Image attachment. Preview the original; no OCR or inferred data extraction performed.'}]
    else:raise ValueError('Supported documents: PDF, DOCX, Markdown, text, SQL, CSV, JSON, PNG and JPEG')
    return {'id':'doc-'+sha(data)[:16],'name':Path(name).name,'sha256':sha(data),'bytes':len(data),'pages':pages,'tables':tables,'text':'\n\n'.join(f"[Page {p['page']}]\n{p['text']}" for p in pages),'extraction':'Text only; DOCX tables retained. No OCR. DOCX page numbers are logical sections, not rendered pagination.','evidence_status':'source_document','observation_data':False}

def search_documents(documents,query,limit=12):
    terms=set(re.findall(r'[a-zA-Z0-9]{2,}',query.lower()));hits=[]
    if not terms:return []
    for d in documents:
        for page in d.get('pages',[]):
            text=page['text'];low=text.lower();score=sum(low.count(t) for t in terms)
            if not score:continue
            positions=[low.find(t) for t in terms if t in low];at=min(positions);start=max(0,at-130);end=min(len(text),at+800)
            hits.append({'id':d['id'],'name':d['name'],'page':page['page'],'score':score,'snippet':text[start:end],'sha256':d['sha256']})
    return sorted(hits,key=lambda h:(-h['score'],h['name'],h['page']))[:limit]

