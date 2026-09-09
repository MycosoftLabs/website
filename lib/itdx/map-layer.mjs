import {snapshot, BOUNDS, AO_PLACE, AO_ORIGIN_LNG, AO_ORIGIN_LAT, AO_GEOCODE_SOURCE} from './replay-core.mjs';
import {applyFusionProperties} from './truth-fusion.mjs';

export const SOURCE_ID='itdx-fictional-replay';
export const LIVE_SOURCE_ID='itdx-live-pathways';
export const LIVE_LAYERS=[
  {id:LIVE_SOURCE_ID+'-fill',type:'fill',filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':'#38bdf8','fill-opacity':0.14}},
  {id:LIVE_SOURCE_ID+'-line',type:'line',filter:['in',['geometry-type'],['literal',['LineString','MultiLineString']]],paint:{'line-color':'#38bdf8','line-width':3,'line-opacity':0.88}},
].map(layer=>({...layer,source:LIVE_SOURCE_ID}));
export const KIND_TO_LAYER={asset:'assets',track:'tracks',uncertainty:'uncertainty',boundary:'boundary',corridor:'corridor'};
export const LAYERS=[
  {id:SOURCE_ID+'-area',type:'fill',filter:['in',['get','kind'],['literal',['boundary','corridor','uncertainty']]],paint:{'fill-color':['get','color'],'fill-opacity':0.12}},
  {id:SOURCE_ID+'-edges',type:'line',filter:['in',['get','kind'],['literal',['boundary','corridor','uncertainty']]],paint:{'line-color':['get','color'],'line-width':2}},
  {id:SOURCE_ID+'-tracks',type:'line',filter:['==',['get','kind'],'track'],paint:{'line-color':['get','color'],'line-width':2,'line-dasharray':[3,2]}},
  {id:SOURCE_ID+'-halo',type:'circle',filter:['==',['get','kind'],'asset'],paint:{'circle-color':['coalesce',['get','halo_color'],'#9caac6'],'circle-radius':16,'circle-opacity':0.38,'circle-blur':0.35}},
  {id:SOURCE_ID+'-points',type:'circle',filter:['==',['get','kind'],'asset'],paint:{'circle-color':['get','color'],'circle-radius':8,'circle-stroke-color':'#ffffff','circle-stroke-width':2}},
  {id:SOURCE_ID+'-labels',type:'symbol',filter:['==',['get','kind'],'asset'],layout:{'text-field':['coalesce',['get','badge'],['get','label']],'text-size':12,'text-offset':[1.2,0],'text-anchor':'left'},paint:{'text-color':'#ffffff','text-halo-color':'#081821','text-halo-width':2}},
].map(l=>({...l,source:SOURCE_ID}));

const ALL_KINDS={assets:true,tracks:true,uncertainty:true,boundary:true,corridor:true};

function filterGeojson(data,layers){
  const features=(data.features||[]).filter(feature=>{
    const mapped=KIND_TO_LAYER[feature.properties?.kind];
    return mapped?layers[mapped]!==false:true;
  });
  return {...data,features};
}

function describeFrame(frame,data){
  const counts={};
  for(const feature of data.features||[]){
    const kind=feature.properties?.kind||'unknown';
    counts[kind]=(counts[kind]||0)+1;
  }
  const center=[(BOUNDS[0][0]+BOUNDS[1][0])/2,(BOUNDS[0][1]+BOUNDS[1][1])/2];
  return {
    synthetic:true,
    live:false,
    source:SOURCE_ID,
    schema:frame.schema,
    data_origin:frame.data_origin,
    index:frame.index,
    timestamp:frame.replay_time,
    featureCount:data.features?.length||0,
    kinds:counts,
    center,
    bounds:BOUNDS,
    ao_place:AO_PLACE,
    origin:[AO_ORIGIN_LNG,AO_ORIGIN_LAT],
    geocode_source:AO_GEOCODE_SOURCE,
  };
}

function styleReady(map){
  try{
    if(typeof map.isStyleLoaded==='function')return Boolean(map.isStyleLoaded());
  }catch{/* Map can throw while the style is swapping. */}
  return Boolean(map?.style&&typeof map.addSource==='function');
}

function flyToBounds(map){
  try{map.fitBounds(BOUNDS,{padding:72,maxZoom:14,duration:900});}
  catch{
    const center=[(BOUNDS[0][0]+BOUNDS[1][0])/2,(BOUNDS[0][1]+BOUNDS[1][1])/2];
    if(typeof map.flyTo==='function')map.flyTo({center,zoom:10,duration:900});
  }
}

/** Owns only the synthetic source/layers. Reattaches after style replacement. */
export function attachReplay(map,{onSelect=()=>{},onStatus=()=>{}}={}) {
  let active=true,index=0,layers={...ALL_KINDS},fusionById={};
  const install=()=>{
    if(!active||!styleReady(map))return;
    try{
      const frame=snapshot(index);
      const geojson={
        ...frame.geojson,
        features:(frame.geojson.features||[]).map(feature=>{
          const id=feature.properties?.asset_id||feature.properties?.id;
          return applyFusionProperties(feature,fusionById[id]||feature.properties?.truth_fusion||null);
        }),
      };
      const data=filterGeojson(geojson,layers);
      if(map.getSource(SOURCE_ID))map.getSource(SOURCE_ID).setData(data);
      else map.addSource(SOURCE_ID,{type:'geojson',data});
      for(const layer of LAYERS)if(!map.getLayer(layer.id))map.addLayer(layer);
      onStatus('LAYER_ATTACHED');
      if(typeof console!=='undefined'&&console.info){
        console.info('[ITDX map receive]',{...describeFrame(frame,data),truth:frame.assets.map(a=>({id:a.id,p_truth:a.p_truth,quality:a.data_quality}))});
      }
    }catch(error){onStatus('LAYER_ERROR: '+error.message);}
  };
  const select=e=>{const id=e.features?.[0]?.properties?.asset_id;if(id)onSelect(String(id));};
  map.on('load',install);
  map.on('style.load',install);
  map.on('idle',install);
  map.on('styledata',install);
  map.on('click',SOURCE_ID+'-points',select);
  install();
  return {
    update(next){snapshot(next);index=next;install();},
    setFusion(next){fusionById=next&&typeof next==='object'?next:{};install();},
    setLayers(next){layers={...ALL_KINDS,...next};install();},
    focus(){map.fitBounds(BOUNDS,{padding:72,maxZoom:14,duration:900});},
    focusAsset(id){
      const asset=snapshot(index).assets.find(item=>item.id===id);
      if(asset?.position){
        if(typeof map.flyTo==='function')map.flyTo({center:asset.position,zoom:13,duration:700});
        else map.fitBounds([asset.position,asset.position],{padding:72,maxZoom:13,duration:700});
        return;
      }
      map.fitBounds(BOUNDS,{padding:72,maxZoom:14,duration:900});
    },
    dispose(){
      active=false;map.off('load',install);map.off('style.load',install);map.off('idle',install);map.off('styledata',install);map.off('click',SOURCE_ID+'-points',select);
      try{for(const layer of [...LAYERS].reverse())if(map.getLayer(layer.id))map.removeLayer(layer.id);if(map.getSource(SOURCE_ID))map.removeSource(SOURCE_ID);}catch{/* A destroyed map already owns no usable layers. */}
      onStatus('LAYER_DETACHED');
    },
  };
}

/** Public OSM / MAS GeoJSON pathways. Separate from synthetic exercise tracks. */
export function attachLivePathways(map) {
  let active=true
  let geojson={type:'FeatureCollection',features:[]}
  const install=()=>{
    if(!active||!styleReady(map))return
    try{
      if(map.getSource(LIVE_SOURCE_ID))map.getSource(LIVE_SOURCE_ID).setData(geojson)
      else map.addSource(LIVE_SOURCE_ID,{type:'geojson',data:geojson})
      for(const layer of LIVE_LAYERS)if(!map.getLayer(layer.id))map.addLayer(layer)
    }catch{/* Style swap can reject one frame. */}
  }
  map.on('load',install)
  map.on('style.load',install)
  install()
  return {
    setData(next){
      geojson=next&&Array.isArray(next.features)?next:{type:'FeatureCollection',features:[]}
      install()
    },
    dispose(){
      active=false
      map.off('load',install)
      map.off('style.load',install)
      try{for(const layer of [...LIVE_LAYERS].reverse())if(map.getLayer(layer.id))map.removeLayer(layer.id);if(map.getSource(LIVE_SOURCE_ID))map.removeSource(LIVE_SOURCE_ID)}catch{/* destroyed map */}
    },
  }
}
