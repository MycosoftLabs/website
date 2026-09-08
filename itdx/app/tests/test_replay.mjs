import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {snapshot,allMeasurements,ASSETS,EARTH_RADIUS_M,RADIUS_M,distanceM,circle} from '../web/replay-core.mjs';

test('fixed replay is repeatable; no future or delayed observations leak',()=>{
 assert.deepEqual(snapshot(120),snapshot(120));assert.equal(allMeasurements().records.length,484);
 for(const bad of [-1,121,1.5,NaN,'2'])assert.throws(()=>snapshot(bad));
 assert.equal(snapshot(0).assets[3].position,null);assert.equal(snapshot(6).assets[3].valid_reports,0);
 assert.equal(snapshot(7).assets[3].valid_reports,1);assert.equal(snapshot(7).assets[3].age_seconds,70);
 assert.equal(snapshot(11).assets[2].age_seconds,10);assert.equal(snapshot(11).assets[2].missing_reports,2);
});
test('geodesic circles satisfy independent distance checks at equator and high latitude',()=>{
 assert.ok(Math.abs((1-Math.exp(-(RADIUS_M**2)/(2*35**2)))-.95)<1e-14);
 for(const center of [[0,0],[70,60],[-100,-70]]){
  const ring=circle(center,RADIUS_M);assert.deepEqual(ring[0],ring.at(-1));
  for(const p of ring)assert.ok(Math.abs(distanceM(center,p)-RADIUS_M)<1e-5);
 }
 assert.ok(Math.abs(distanceM([0,0],[1,0])-EARTH_RADIUS_M*Math.PI/180)<1e-7);
});
test('reported empirical coverage and RMSE agree with independent raw-record calculation',()=>{
 const rows=allMeasurements().records,frame=snapshot(120);
 for(const a of frame.assets){
  const valid=rows.filter(r=>r.asset_id===a.id&&!r.missing&&r.available_at_index<=120);
  const errors=valid.map(r=>Math.sqrt((r.observed_xy[0]-r.truth_xy[0])**2+(r.observed_xy[1]-r.truth_xy[1])**2));
  assert.equal(a.coverage_count,errors.filter(e=>e<=RADIUS_M).length);
  assert.equal(a.empirical_coverage,a.coverage_count/valid.length);
  assert.ok(Math.abs(a.rmse_m-Math.sqrt(errors.reduce((n,e)=>n+e*e,0)/valid.length))<1e-10);
  assert.equal(a.probability_data_true,null);assert.equal(a.probability_deception,null);
 }
 assert.ok(frame.assets[0].empirical_coverage>.85);assert.ok(frame.assets[1].empirical_coverage<.5);
 assert.ok(frame.assets[1].rmse_m>2*frame.assets[0].rmse_m);
});
test('every exported feature has synthetic provenance and valid geometry',()=>{
 for(const index of [0,7,40,120]){
  const data=JSON.parse(JSON.stringify(snapshot(index).geojson));
  for(const f of data.features){assert.equal(f.properties.data_origin,'SYNTHETIC_EXERCISE');assert.ok(f.geometry.coordinates.flat(Infinity).every(Number.isFinite));if(f.geometry.type==='Polygon')assert.deepEqual(f.geometry.coordinates[0][0],f.geometry.coordinates[0].at(-1));}
 }
});
test('local replay kernel matches shared Earth module when repository sources are present',t=>{
 const path=new URL('../../../lib/itdx/replay-core.mjs',import.meta.url);if(!existsSync(path))return t.skip('Standalone local distribution');
 assert.equal(readFileSync(path,'utf8'),readFileSync(new URL('../web/replay-core.mjs',import.meta.url),'utf8'));
});
