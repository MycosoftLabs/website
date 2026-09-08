// View/event unit tests. This is not browser layout or visual verification.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'web/workbench.js'),'utf8');
const elements={};const handlers={};let removed=0;
const element=()=>({innerHTML:'',textContent:'',className:'',setAttribute(){},remove(){removed++;}});
const sandbox={console,document:{querySelector(s){return elements[s]??=(element());},addEventListener(k,f){handlers[k]=f;}},window:{print(){}},fetch:async url=>({ok:true,json:async()=>url==='/api/bootstrap'?{csrf_token:'test-only'}:[]}),__rank:JSON.parse(fs.readFileSync(path.join(root,'web/examples/ranking.json'))),__case:JSON.parse(fs.readFileSync(path.join(root,'web/examples/civil_evidence.json'))),assert,handlers,removed:()=>removed};
const tests=`
assert(document.querySelector('#workspace').innerHTML.includes('Source reports & civil matrix'));
ranking=__rank; page='ranking';render();assert(rankView().includes('Invented evaluator 1'));
await handlers.click({target:{closest:()=>({dataset:{action:'add-ballot'}})}});assert.equal(ranking.ballots.length,4);
handlers.change({target:{dataset:{ballot:'3',candidate:'A'},value:'2'}});assert.equal(ranking.ballots[3].scores.A,2);
handlers.change({target:{dataset:{field:'ranking.title'},value:'<img onerror=evil>'}});assert(rankView().includes('&lt;img onerror=evil&gt;'));assert(!rankView().includes('<img onerror'));
assert(removed()>0);
page='evidence';evidence=__case;render();assert(evidenceView().includes('HUMINT'));
handlers.change({target:{dataset:{tag:'ascope',record:'0'},checked:true,value:'Areas'}});assert(evidence.records[0].ascope.includes('Areas'));
handlers.change({target:{dataset:{field:'evidence.records.0.confidence'},value:''}});assert.equal(evidence.records[0].confidence,null);
console.log(JSON.stringify({status:'PASS',checks:8,scope:'Workbench JavaScript view/event unit tests; no browser layout verification'}));
`;
vm.runInNewContext('(async()=>{'+source+'\n'+tests+'})()',sandbox).catch(e=>{console.error(e);process.exitCode=1;});
