import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here=dirname(fileURLToPath(import.meta.url)); const compiled=mkdtempSync(join(tmpdir(),"sensing-visuals-"))
for(const file of ["contracts","transforms"]){const source=readFileSync(join(here,"..",`${file}.ts`),"utf8").replaceAll('./contracts','./contracts.mjs');writeFileSync(join(compiled,`${file}.mjs`),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText)}
const contracts=await import(pathToFileURL(join(compiled,"contracts.mjs")).href); const transforms=await import(pathToFileURL(join(compiled,"transforms.mjs")).href)
after(()=>rmSync(compiled,{recursive:true,force:true}))

test("maps only supplied finite samples into a bounded plot",()=>{const points=transforms.samplesToPoints([{timestamp:1,value:2},{timestamp:2,value:4},{timestamp:3,value:3}],100,50);assert.equal(points.length,3);assert.match(transforms.pointsToPath(points),/^M/);assert.equal(transforms.samplesToPoints([{timestamp:1,value:Number.NaN}],100,50).length,0)})
test("computes a bounded magnitude spectrum without synthesizing samples",()=>{const bins=transforms.magnitudeSpectrum([0,1,0,-1],4);assert.equal(bins.length,3);assert.equal(bins[1].frequencyHz,1);assert.ok(bins[1].magnitude>bins[0].magnitude);assert.deepEqual(transforms.magnitudeSpectrum([],4),[])})
test("builds histogram and heat cells from supplied values",()=>{assert.equal(transforms.histogram([1,1,2,3],2).reduce((sum,b)=>sum+b.count,0),4);const cells=transforms.heatCells({width:2,height:2,values:[1,2,3,4],unit:"C"});assert.equal(cells.length,4);assert.equal(cells[3].ratio,1);assert.deepEqual(transforms.heatCells({width:2,height:2,values:[1],unit:"C"}),[])})
test("positions supplied evidence events chronologically",()=>{const placed=transforms.timelinePositions([{id:"b",timestamp:20,modality:"radar",label:"b"},{id:"a",timestamp:10,modality:"camera",label:"a"}]);assert.equal(placed[0].id,"a");assert.equal(placed[0].ratio,0);assert.equal(placed[1].ratio,1)})
test("device sample contract rejects mismatched and fabricated-looking shapes",()=>{const base={deviceId:"d",sensorId:"s",modality:"bioelectric",unit:"mV",timestamps:[1,2],values:[.1,.2],provenance:{sourceId:"evidence-1"},state:"available"};assert.deepEqual(contracts.validateDeviceSensorSampleSeries(base),[]);assert.match(contracts.validateDeviceSensorSampleSeries({...base,values:[.1]}).join(" "),/equal length/);assert.match(contracts.validateDeviceSensorSampleSeries({...base,values:[Number.NaN,1]}).join(" "),/finite/)})
test("source layer has no random, network, environment, or timer seam",()=>{const source=["contracts","transforms"].map(f=>readFileSync(join(here,"..",`${f}.ts`),"utf8")).join("\n");assert.doesNotMatch(source,/Math\.random|\bfetch\s*\(|process\.env|setInterval|setTimeout/)})
