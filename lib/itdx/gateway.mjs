/** Fixed ITDX backend gateway. No user-controlled upstream URL. */
export const GATEWAY_BASE='/api/fusarium/itdx/bridge';
const staticFiles=new Set(['index.html','app.js','styles.css','earth-grid.js','workspace.html','workspace.css','workspace.mjs','replay-core.mjs','workbench.html','workbench.css','workbench.js','readiness.html','examples/ranking.json','examples/civil_evidence.json']);
const reads=new Set(['bootstrap','health','workspace','workspace/search','workspace/page','workspace/preview','workspace/export','rankings','civil-cases','civil-evidence','ranking','dataset','run','suite','evidence','document','document/download','document/text','document/tables','search','export','export-suite','source']);
const writes=new Set(['run','suite','benchmark','stress','cancel','import','rating','ask','services','probe','service-sample','ranking','civil-evidence','workspace/notes','workspace/check']);
export function allowedPath(parts,method){
 if(!Array.isArray(parts)||parts.some(p=>!p||p==='.'||p==='..'||/[\\%?#]/.test(p)))return null;
 const path=parts.join('/');
 if(method==='GET'&&(staticFiles.has(path)||(path.startsWith('api/')&&(reads.has(path.slice(4))||/^api\/jobs\/job-[-a-zA-Z0-9_]+$/.test(path)))))return '/'+path;
 if(method==='POST'&&path.startsWith('api/')&&writes.has(path.slice(4)))return '/'+path;
 return null;
}
export function rewriteAsset(text){
 // Only local app URL literals are mounted. External URLs and source JSON are unchanged.
 let output=text.replace(/(["'`])\/(api\/|examples\/|(?:app\.js|styles\.css|earth-grid\.js|workspace\.(?:html|css|mjs)|replay-core\.mjs|workbench\.(?:html|css|js)|readiness\.html|index\.html)(?=["'`?#]))/g,(_,quote,path)=>quote+GATEWAY_BASE+'/'+path);
 output=output.replace(/href=(["'])\/\1/g,(_,q)=>'href='+q+GATEWAY_BASE+'/index.html'+q);
 return output;
}
export async function limitedBody(response,limit=64_000_000){
 if(Number(response.headers.get('content-length'))>limit)throw Error('Backend response exceeds limit');
 const reader=response.body?.getReader();if(!reader)return new Uint8Array();
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error('Backend response exceeds limit')}chunks.push(value)}}finally{reader.releaseLock()}
 const output=new Uint8Array(size);let offset=0;for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length}return output;
}
