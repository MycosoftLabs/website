import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {allowedPath,rewriteAsset,limitedBody,GATEWAY_BASE} from '../../lib/itdx/gateway.mjs';
test('gateway accepts only known paths and methods, rejecting traversal and arbitrary proxying',()=>{
 for(const path of [['api','run'],['api','workspace','notes']])assert.ok(allowedPath(path,'POST'));
 assert.equal(allowedPath(['api','jobs','job-123'],'GET'),'/api/jobs/job-123');
 for(const path of [['..','secrets'],['api','%2e%2e'],['https:','evil'],['api','unknown'],['api','run?x']])assert.equal(allowedPath(path,'GET'),null);
 assert.equal(allowedPath(['api','bootstrap'],'POST'),null);assert.equal(allowedPath(['api','run'],'DELETE'),null);
});
test('mounted application URLs remain behind the authenticated Fusarium gateway',()=>{
 const source='<script src="/app.js"></script><a href="/">Home</a><a href="https://example.com">External</a>';
 const result=rewriteAsset(source);assert.ok(result.includes('src="'+GATEWAY_BASE+'/app.js"'));assert.ok(result.includes('href="'+GATEWAY_BASE+'/index.html"'));assert.ok(result.includes('href="https://example.com"'));
 for(const name of ['app.js','workspace.mjs','workbench.js','index.html','workspace.html','workbench.html']){
  const raw=readFileSync(new URL('../app/web/'+name,import.meta.url),'utf8'),mounted=rewriteAsset(raw);
  assert.equal(/(["'`])\/api\/(?!fusarium\/itdx\/bridge\/)/.test(mounted),false,name);assert.equal(/(?:src|href)=["']\/(?:app|styles|workspace|workbench|examples|earth-grid)/.test(mounted),false,name);
 }
 assert.equal(rewriteAsset("api('/api/'+kind,args)"),"api('"+GATEWAY_BASE+"/api/'+kind,args)");
});
test('bounded gateway body reader accepts exact limits and rejects oversized streamed output',async()=>{
 assert.equal((await limitedBody(new Response('abcd'),4)).length,4);
 await assert.rejects(()=>limitedBody(new Response('abcde'),4));
 await assert.rejects(()=>limitedBody(new Response('a',{headers:{'content-length':'999'}}),4));
});
