#!/usr/bin/env node
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {snapshot,allMeasurements} from './web/replay-core.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
try{
 const path=process.argv[2]||new URL('./sample_results/replay_result.json',import.meta.url),result=JSON.parse(readFileSync(path,'utf8'));
 if(result.schema!=='itdx-replay-result/v1')throw Error('Unsupported replay result');
 if(result.kernel_sha256!==hash(readFileSync(new URL('./web/replay-core.mjs',import.meta.url))))throw Error('Replay kernel identity mismatch');
 if(result.measurements_sha256!==hash(JSON.stringify(allMeasurements())))throw Error('Raw measurement replay mismatch');
 if(result.frame_sha256!==hash(JSON.stringify(snapshot(result.index))))throw Error('Frame replay mismatch');
 console.log(JSON.stringify({status:'PASS',records:allMeasurements().records.length,index:result.index,scope:'Exact local synthetic fixture replay; hashes do not establish source truth or signer identity'},null,2));
}catch(error){console.error(JSON.stringify({status:'FAIL',error:error.message}));process.exitCode=1}
