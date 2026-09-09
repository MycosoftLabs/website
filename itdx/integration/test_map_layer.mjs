import test from 'node:test';import assert from 'node:assert/strict';
import {attachReplay,LAYERS,SOURCE_ID} from '../../lib/itdx/map-layer.mjs';
import {verifyWorkspace} from '../../lib/itdx/workspace-import.mjs';
import {createHash} from 'node:crypto';
class FakeMap{
 constructor(){this.sources=new Map([['real-feed',{kept:true}]]);this.layers=new Map([['real-layer',{kept:true}]]);this.events=[];this.loaded=false;this.focused=false}
 isStyleLoaded(){return this.loaded}getSource(id){return this.sources.get(id)}getLayer(id){return this.layers.get(id)}
 addSource(id,source){this.sources.set(id,{data:source.data,setData(data){this.data=data}})}addLayer(layer){this.layers.set(layer.id,layer)}
 removeSource(id){this.sources.delete(id)}removeLayer(id){this.layers.delete(id)}fitBounds(){this.focused=true}
 on(...args){this.events.push(args)}off(...args){this.events=this.events.filter(e=>!e.every((a,i)=>a===args[i]))}
 emit(name,event){for(const e of [...this.events])if(e[0]===name)e.at(-1)(event)}
}
test('map lifecycle preserves other feeds and restores synthetic state after style reload',()=>{
 const map=new FakeMap();let selected;const controller=attachReplay(map,{onSelect:id=>selected=id});
 assert.equal(map.sources.size,1);map.loaded=true;map.emit('load');controller.update(47);
 assert.equal(map.layers.size,LAYERS.length+1);assert.equal(map.getSource(SOURCE_ID).data.features.filter(f=>f.properties.kind==='asset').length,4);
 assert.equal(map.focused,false);controller.focus();assert.equal(map.focused,true);
 const data=map.getSource(SOURCE_ID).data;map.sources.delete(SOURCE_ID);LAYERS.forEach(l=>map.layers.delete(l.id));map.emit('style.load');
 assert.deepEqual(map.getSource(SOURCE_ID).data,data);map.emit('click',{features:[{properties:{asset_id:'demo-unit-01'}}]});assert.equal(selected,'demo-unit-01');
 controller.dispose();assert.equal(map.sources.size,1);assert.equal(map.layers.size,1);assert.equal(map.events.length,0);map.emit('style.load');assert.equal(map.sources.size,1);
});
test('layer filters remove only the requested synthetic kinds',()=>{
 const map=new FakeMap();map.loaded=true;const controller=attachReplay(map);
 map.emit('load');controller.update(47);
 const before=map.getSource(SOURCE_ID).data.features.length;
 controller.setLayers({tracks:false,uncertainty:false});
 const after=map.getSource(SOURCE_ID).data.features;
 assert.ok(after.length<before);
 assert.equal(after.filter(f=>f.properties.kind==='track').length,0);
 assert.equal(after.filter(f=>f.properties.kind==='uncertainty').length,0);
 assert.ok(after.some(f=>f.properties.kind==='asset'));
 controller.dispose();
});
test('workspace reader validates every page and note before accepting an import',async()=>{
 const text='Synthetic source',hash=createHash('sha256').update(text).digest('hex');
 const input={schema:'itdx-document-workspace/v1',documents:[{id:'doc-1',name:'Example',sha256:hash,markings:[],pages:[{page:1,text,text_sha256:hash}]}],tasks:Array.from({length:16},(_,i)=>({task_id:String(i+1),title:'Test objective',implementation_status:'NOT_IMPLEMENTED',reference_ids:[]})),notes:[]};
 const valid=await verifyWorkspace(JSON.stringify(input));assert.equal(valid.import_check.pages_verified,1);assert.equal(valid.import_check.original_files_verified,false);
 const corrupt=structuredClone(input);corrupt.documents[0].pages[0].text='changed';await assert.rejects(()=>verifyWorkspace(JSON.stringify(corrupt)));
 const note=structuredClone(input);note.notes=[{document_id:'doc-1',page:1,quote:'invented',source_sha256:hash,page_sha256:hash}];await assert.rejects(()=>verifyWorkspace(JSON.stringify(note)));
 input.documents.push(input.documents[0]);await assert.rejects(()=>verifyWorkspace(JSON.stringify(input)));
});
