import {snapshot, BOUNDS} from './replay-core.mjs';

export const SOURCE_ID='itdx-fictional-replay';
export const LAYERS=[
  {id:SOURCE_ID+'-area',type:'fill',filter:['in',['get','kind'],['literal',['boundary','corridor','uncertainty']]],paint:{'fill-color':['get','color'],'fill-opacity':0.12}},
  {id:SOURCE_ID+'-edges',type:'line',filter:['in',['get','kind'],['literal',['boundary','corridor','uncertainty']]],paint:{'line-color':['get','color'],'line-width':2}},
  {id:SOURCE_ID+'-tracks',type:'line',filter:['==',['get','kind'],'track'],paint:{'line-color':['get','color'],'line-width':2,'line-dasharray':[3,2]}},
  {id:SOURCE_ID+'-points',type:'circle',filter:['==',['get','kind'],'asset'],paint:{'circle-color':['get','color'],'circle-radius':8,'circle-stroke-color':'#ffffff','circle-stroke-width':2}},
  {id:SOURCE_ID+'-labels',type:'symbol',filter:['==',['get','kind'],'asset'],layout:{'text-field':['get','label'],'text-size':12,'text-offset':[1.2,0],'text-anchor':'left'},paint:{'text-color':'#ffffff','text-halo-color':'#081821','text-halo-width':2}},
].map(l=>({...l,source:SOURCE_ID}));

/** Owns only the synthetic source/layers. Reattaches after style replacement. */
export function attachReplay(map,{onSelect=()=>{},onStatus=()=>{}}={}) {
  let active=true,index=0;
  const install=()=>{
    if(!active||!map.isStyleLoaded())return;
    try{
      const data=snapshot(index).geojson;
      if(map.getSource(SOURCE_ID))map.getSource(SOURCE_ID).setData(data);
      else map.addSource(SOURCE_ID,{type:'geojson',data});
      for(const layer of LAYERS)if(!map.getLayer(layer.id))map.addLayer(layer);
      onStatus('LAYER_ATTACHED');
    }catch(error){onStatus('LAYER_ERROR: '+error.message);}
  };
  const select=e=>{const id=e.features?.[0]?.properties?.asset_id;if(id)onSelect(String(id));};
  map.on('load',install);map.on('style.load',install);map.on('click',SOURCE_ID+'-points',select);
  install();
  return {
    update(next){snapshot(next);index=next;install();},
    focus(){map.fitBounds(BOUNDS,{padding:72,maxZoom:14,duration:700});},
    dispose(){
      active=false;map.off('load',install);map.off('style.load',install);map.off('click',SOURCE_ID+'-points',select);
      try{for(const layer of [...LAYERS].reverse())if(map.getLayer(layer.id))map.removeLayer(layer.id);if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID);}catch{/* A destroyed map already owns no usable layers. */}
      onStatus('LAYER_DETACHED');
    },
  };
}
