/** Fixed fictional replay. No live feeds, route planning, or intent inference. */
import { BOUNDARY_XY, CORRIDOR_XY, applyFusionProperties, inRectXY, scoreAsset } from './truth-fusion.mjs';
export const REPLAY_SCHEMA = 'itdx-fictional-replay/v1';
export const STEP_SECONDS = 10;
export const SAMPLE_COUNT = 121;
export const EARTH_RADIUS_M = 6371008.8;
export const NOMINAL_COVERAGE = 0.95;
export const SIGMA_M = 35;
export const RADIUS_M = SIGMA_M * Math.sqrt(-2 * Math.log(1 - NOMINAL_COVERAGE));
export const START_UTC = '2026-09-08T12:00:00Z';
/** 3ID / OPERATION BULLDOG land AO. PDF text named 3ID, Bulldog, Georgia; installation name was not extractable. */
export const AO_PLACE = 'Fort Stewart, Liberty County, Georgia';
export const AO_ORIGIN_LNG = -81.6072;
export const AO_ORIGIN_LAT = 31.8697;
export const AO_GEOCODE_SOURCE = 'public Wikipedia / USGS GNIS Fort Stewart 31°52′11″N 81°36′26″W; OPORD extractable text: 3ID, OPERATION BULLDOG, Georgia';
export function toLngLat(x,y) {
  const dLat = (y / EARTH_RADIUS_M) * 180 / Math.PI;
  const dLon = (x / EARTH_RADIUS_M) * 180 / Math.PI / Math.cos(AO_ORIGIN_LAT * Math.PI / 180);
  return [AO_ORIGIN_LNG + dLon, AO_ORIGIN_LAT + dLat];
}
export const BOUNDS = [toLngLat(-2500, -2200), toLngLat(2500, 2200)];
export const ASSETS = [
  {id:'demo-unit-01',label:'DEMO UNIT 01',kind:'fictional unit marker',color:'#50d6b0',fault:'none',path:[[-1900,-1200],[-1200,-900],[-300,-800],[500,-400],[1500,600]]},
  {id:'demo-vehicle-02',label:'DEMO VEHICLE 02',kind:'fictional transport marker',color:'#fab85e',fault:'bias after sample 40',path:[[-1700,1100],[-700,1200],[100,600],[800,800],[1700,1300]]},
  {id:'demo-sensor-03',label:'DEMO SENSOR 03',kind:'fictional mobile sensor',color:'#8cbcff',fault:'missing every eleventh report',path:[[1200,-1400],[800,-500],[100,100],[-600,800],[-1400,1400]]},
  {id:'demo-air-04',label:'DEMO AIR 04',kind:'fictional air marker',color:'#ce9eff',fault:'reports delayed 70 seconds',path:[[-1800,1600],[-500,1700],[1600,1300],[1900,-300],[200,-1400]]},
];
function random(seed) { let x=seed>>>0; return () => {x^=x<<13;x^=x>>>17;x^=x<<5;return ((x>>>0)+1)/4294967297;}; }
function normal(rng) {return Math.sqrt(-2*Math.log(rng()))*Math.cos(2*Math.PI*rng());}
export function distanceM(a,b) {
  const rad=Math.PI/180, dlat=(b[1]-a[1])*rad,dlon=(b[0]-a[0])*rad;
  const h=Math.sin(dlat/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dlon/2)**2;
  return 2*EARTH_RADIUS_M*Math.asin(Math.sqrt(Math.max(0,Math.min(1,h))));
}
export function truthAt(asset,index) {
  const t=Math.max(0,Math.min(SAMPLE_COUNT-1,index))/(SAMPLE_COUNT-1)*(asset.path.length-1);
  const j=Math.min(asset.path.length-2,Math.floor(t)), f=t-j;
  return [asset.path[j][0]*(1-f)+asset.path[j+1][0]*f,asset.path[j][1]*(1-f)+asset.path[j+1][1]*f];
}
const records = ASSETS.map((asset,k)=>{
  const rng=random(1031+k*193);
  return Array.from({length:SAMPLE_COUNT},(_,index)=>{
    const truth=truthAt(asset,index),bias=k===1&&index>=40?140:0;
    const observed=[truth[0]+SIGMA_M*normal(rng)+bias,truth[1]+SIGMA_M*normal(rng)];
    const missing=k===2&&index%11===0;
    return {index,observed_at:new Date(Date.parse(START_UTC)+index*STEP_SECONDS*1000).toISOString(),truth_xy:truth,
      observed_xy:missing?null:observed,error_m:missing?null:Math.hypot(observed[0]-truth[0],observed[1]-truth[1]),
      radius_m:RADIUS_M,missing,available_at_index:index+(k===3?7:0)};
  });
});
function feature(kind,id,geometry,extra={}) {return {type:'Feature',id,geometry,properties:{...extra,kind,id,data_origin:'SYNTHETIC_EXERCISE'}};}
export function circle(center,radius) {
  const lat=center[1]*Math.PI/180,lon=center[0]*Math.PI/180,d=radius/EARTH_RADIUS_M;
  const ring=Array.from({length:65},(_,i)=>{
    const bearing=i/64*2*Math.PI;
    const y=Math.asin(Math.sin(lat)*Math.cos(d)+Math.cos(lat)*Math.sin(d)*Math.cos(bearing));
    const x=lon+Math.atan2(Math.sin(bearing)*Math.sin(d)*Math.cos(lat),Math.cos(d)-Math.sin(lat)*Math.sin(y));
    return [x*180/Math.PI,y*180/Math.PI];
  });ring[ring.length-1]=ring[0].slice();return ring;
}
export function snapshot(requestedIndex=0) {
  if(!Number.isInteger(requestedIndex)||requestedIndex<0||requestedIndex>=SAMPLE_COUNT)throw new Error('Replay index must be an integer 0–120');
  const index=requestedIndex,features=[],assets=[];
  const boundary=[[-2500,-2200],[2500,-2200],[2500,2200],[-2500,2200],[-2500,-2200]].map(([x,y])=>toLngLat(x,y));
  const corridor=[[-2300,-1600],[2100,-1600],[2100,1800],[-2300,1800],[-2300,-1600]].map(([x,y])=>toLngLat(x,y));
  features.push(feature('boundary','exercise-boundary',{type:'Polygon',coordinates:[boundary]},{label:'Authored fictional exercise boundary',color:'#64d7be'}));
  features.push(feature('corridor','exercise-corridor',{type:'Polygon',coordinates:[corridor]},{label:'Authored display corridor; no movement feasibility inference',color:'#9caac6'}));
  const prelim=ASSETS.map((asset,k)=>{
    const received=records[k].filter(r=>r.available_at_index<=index),valid=received.filter(r=>!r.missing);
    const latest=valid.at(-1),position=latest?toLngLat(...latest.observed_xy):null;
    const truthLngLat=latest?toLngLat(...latest.truth_xy):null;
    const inside=valid.filter(r=>r.error_m<=r.radius_m).length;
    const age=latest?(index-latest.index)*STEP_SECONDS:null;
    const corridorHold=latest?.observed_xy?inRectXY(latest.observed_xy,CORRIDOR_XY):null;
    const boundaryHold=latest?.observed_xy?inRectXY(latest.observed_xy,BOUNDARY_XY):null;
    const circleHold=latest&&latest.error_m!=null?latest.error_m<=RADIUS_M:null;
    return {...asset,position,truth_lnglat:truthLngLat,observed_xy:latest?.observed_xy??null,truth_xy:latest?.truth_xy??null,
      observed_at:latest?.observed_at??null,age_seconds:age,sigma_m:SIGMA_M,
      current_position_status:age===0?'CURRENT_SYNTHETIC_OBSERVATION':latest?'LAST_OBSERVED_POSITION':'NO_OBSERVATION',
      latest_error_at_observation_m:latest?.error_m??null,haversine_error_m:position&&truthLngLat?distanceM(position,truthLngLat):null,
      nominal_radius_m:RADIUS_M,circle_hold:circleHold,corridor_hold:corridorHold,boundary_hold:boundaryHold,
      received_reports:received.length,valid_reports:valid.length,missing_reports:received.length-valid.length,
      coverage_count:inside,empirical_coverage:valid.length?inside/valid.length:null,
      rmse_m:valid.length?Math.sqrt(valid.reduce((s,r)=>s+r.error_m**2,0)/valid.length):null,
      assumption_status:k===1&&index>=40?'DECLARED_BIAS_VIOLATES_ZERO_MEAN_MODEL':'SIMULATED_ZERO_MEAN_NOISE'};
  });
  prelim.forEach((stats)=>{
    const fusion=scoreAsset(stats,prelim.filter(item=>item.id!==stats.id));
    const scored={...stats,probability_data_true:fusion.p_truth,probability_deception:fusion.p_unsupported,
      p_truth:fusion.p_truth,p_unsupported:fusion.p_unsupported,p_truth_pct:fusion.p_truth_pct,
      p_unsupported_pct:fusion.p_unsupported_pct,halo_color:fusion.halo_color,data_quality:fusion.quality,
      quality_flags:fusion.quality_flags,deception_status:fusion.deception_status,truth_fusion:fusion,
      badge:`${stats.label} ${fusion.p_truth_pct}`};
    assets.push(scored);
    features.push(feature('track',stats.id+'-authored-track',{type:'LineString',coordinates:stats.path.map(([x,y])=>toLngLat(x,y))},{label:stats.label+' — preset path',color:stats.color,asset_id:stats.id}));
    if(stats.position){
      features.push(feature('uncertainty',stats.id+'-uncertainty',{type:'Polygon',coordinates:[circle(stats.position,RADIUS_M)]},{label:'Nominal 95% observation-time circle under stated model',color:stats.color,asset_id:stats.id}));
      features.push(applyFusionProperties(feature('asset',stats.id,{type:'Point',coordinates:stats.position},{...scored,path:undefined,color:stats.color,asset_id:stats.id}),fusion));
    }
  });
  return {schema:REPLAY_SCHEMA,data_origin:'SYNTHETIC_EXERCISE',execution_mode:'fixed_recorded_simulation',
    index,replay_time:new Date(Date.parse(START_UTC)+index*STEP_SECONDS*1000).toISOString(),assets,
    model:{sigma_m:SIGMA_M,nominal_coverage:NOMINAL_COVERAGE,radius_m:RADIUS_M,
      formula:'r = sigma × sqrt(−2 ln(1−p)); isotropic independent zero-mean Gaussian XY errors',
      empirical_formula:'observed errors within radius / valid received reports; descriptive coverage, not a probability that a report is true',
      fusion:'P(truth)=σ(Σ w_i logit(s_i)/Σ w_i) on BOUND scored channels. Geometry always; NLM/MAS excluded when UNQUALIFIED or NOT_SUPPLIED. Class-p is not a geo radius.',
      boundary:'Synthetic markers on a land tangent plane at Fort Stewart, GA (public geocode). Paths are authored exercise geometry, not live COP or OPORD MGRS. Uncertainty is observation-time Gaussian XY only; class probability is not a geo radius.',
      ao_place:AO_PLACE,ao_origin:[AO_ORIGIN_LNG,AO_ORIGIN_LAT],ao_geocode_source:AO_GEOCODE_SOURCE},
    geojson:{type:'FeatureCollection',features}};
}
export function allMeasurements() {return {schema:REPLAY_SCHEMA,data_origin:'SYNTHETIC_EXERCISE',records:ASSETS.flatMap((a,k)=>records[k].map(r=>({asset_id:a.id,...r}))) };}
