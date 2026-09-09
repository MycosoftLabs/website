/** Local JSON reader only: no fetch, persistence, or source-truth inference. */
const hex=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,'0')).join('');
export async function verifyWorkspace(text){
 if(text.length>24_000_000)throw Error('Workspace JSON exceeds 24 MB');
 const data=JSON.parse(text),ids=new Set();
 if(data.schema!=='itdx-document-workspace/v1'||!Array.isArray(data.documents)||data.documents.length>2000)throw Error('Unsupported workspace');
 if(!Array.isArray(data.tasks)||data.tasks.length!==16||new Set(data.tasks.map(t=>Number(t.task_id))).size!==16||data.tasks.some(t=>typeof t.title!=='string'||typeof t.implementation_status!=='string'||!Array.isArray(t.reference_ids)||t.reference_ids.some(id=>typeof id!=='string')||!Number.isInteger(Number(t.task_id))||Number(t.task_id)<1||Number(t.task_id)>16))throw Error('Expected 16 task records');
 let count=0;
 for(const doc of data.documents){
   if(typeof doc.id!=='string'||!/^[-a-zA-Z0-9_]+$/.test(doc.id)||ids.has(doc.id)||typeof doc.name!=='string'||!Array.isArray(doc.pages)||doc.pages.length>600||!Array.isArray(doc.markings)||doc.markings.some(m=>typeof m!=='string')||!/^[0-9a-f]{64}$/.test(doc.sha256))throw Error('Invalid or duplicate document');
   ids.add(doc.id);
   for(const [index,page] of doc.pages.entries()){
     if(page.page!==index+1||typeof page.text!=='string'||await hex(page.text)!==page.text_sha256)throw Error('Page text integrity mismatch: '+doc.name);
     count++;
   }
 }
 if(!Array.isArray(data.notes)||data.notes.length>2000)throw Error('Invalid note collection');
 const noteIds=new Set();
 for(const note of data.notes){
   if(typeof note.id!=='string'||noteIds.has(note.id)||typeof note.note!=='string'||typeof note.reviewer!=='string'||typeof note.review_status!=='string'||!Number.isInteger(note.page))throw Error('Invalid or duplicate reviewer note');
   noteIds.add(note.id);
   const doc=data.documents.find(d=>d.id===note.document_id),page=doc?.pages[note.page-1];
   if(!page||typeof note.quote!=='string'||!note.quote||!page.text.includes(note.quote)||note.source_sha256!==doc.sha256||note.page_sha256!==page.text_sha256)throw Error('Note does not bind to its cited source page');
 }
 return {...data,import_check:{pages_verified:count,original_files_verified:false,source_truth:'NOT_ESTABLISHED',storage:'BROWSER_MEMORY_ONLY'}};
}
