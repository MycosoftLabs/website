import test from 'node:test';import assert from 'node:assert/strict';import {createSession} from '../../lib/itdx/session-core.mjs';
test('shared context reaches consumers without accepting arbitrary actions or payloads',()=>{
 const emitted=[],seen=[],session=createSession({emit:c=>emitted.push(c),newId:()=> 'synthetic-session'});
 const stop=session.register({appId:'test-reader',onContext:c=>seen.push(c)});
 session.select({runId:'run-test',dataOrigin:'SYNTHETIC_TEST'});assert.equal(seen.at(-1).runId,'run-test');assert.equal(emitted.length,1);
 session.select({runId:'run-test'});assert.equal(emitted.length,1);
 assert.throws(()=>session.select({runId:'../../outside'}));assert.throws(()=>session.select({command:'execute'}));
 assert.throws(()=>session.register({appId:'test-reader',onContext:()=>{}}));stop();session.select({documentId:'doc-test'});assert.equal(seen.length,2);assert.deepEqual(session.registered(),[]);
});
test('consumer mutations and failures cannot replace the producer session',()=>{
 const session=createSession({newId:()=> 'synthetic-session'});let good;
 session.register({appId:'unreliable-reader',onContext:c=>{c.runId='modified';if(c.revision)throw Error('consumer failed')}});
 session.register({appId:'good-reader',onContext:c=>{good=c}});session.select({runId:'run-real-test'});
 assert.equal(good.runId,'run-real-test');assert.equal(session.get().runId,'run-real-test');
});
