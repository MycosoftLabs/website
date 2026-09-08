export function createSession({emit=()=>{},newId=()=>crypto.randomUUID()}={}){
 const empty=Object.freeze({schema:'itdx-session/v1',sessionId:null,runId:null,datasetId:null,documentId:null,dataOrigin:'UNSPECIFIED',revision:0});let context=empty;
 const listeners=new Set(),adapters=new Map();
 return {
  empty,get:()=>context,
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},
  select(patch){
   const fields=['runId','datasetId','documentId','dataOrigin'];if(!patch||Object.keys(patch).some(k=>!fields.includes(k)))throw Error('Unsupported context field');
   for(const key of fields.slice(0,3)){const value=patch[key];if(value!==undefined&&value!==null&&(typeof value!=='string'||!/^[-a-zA-Z0-9_]{1,160}$/.test(value)))throw Error('Invalid ITDX reference')}
   if(patch.dataOrigin!==undefined&&(typeof patch.dataOrigin!=='string'||!/^[A-Z_]{1,80}$/.test(patch.dataOrigin)))throw Error('Invalid data origin');
   if(Object.entries(patch).every(([k,v])=>context[k]===v))return;
   context=Object.freeze({...context,...patch,sessionId:context.sessionId||newId(),revision:context.revision+1});
   listeners.forEach(fn=>fn());for(const adapter of adapters.values())try{adapter.onContext({...context})}catch{/* Isolate consumer failure. */}emit({...context});
  },
  register(adapter){
   if(!/^[-a-z0-9]+$/.test(adapter.appId)||adapters.has(adapter.appId)||typeof adapter.onContext!=='function')throw Error('Duplicate or invalid ITDX adapter');
   adapter.onContext({...context});adapters.set(adapter.appId,adapter);
   return()=>{if(adapters.get(adapter.appId)===adapter)adapters.delete(adapter.appId)};
  },
  registered:()=>[...adapters.keys()],
 };
}
