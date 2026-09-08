"use client"
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {FUSARIUM_SECTIONS} from '@/components/fusarium/fusarium-catalog'
import {replay} from '@/lib/itdx/replay-store'
import {GATEWAY_BASE} from '@/lib/itdx/gateway.mjs'
import {useITDXContext,selectITDXContext} from '@/lib/itdx/session'
import ITDXWorkspace from './ITDXWorkspace'
import styles from './itdx.module.css'

type Backend={status:string;version?:string;documents?:number;message?:string}
const views=[['lab','Algorithm lab','/index.html'],['walkthrough','Walkthrough','/index.html#walkthrough'],['sources','Documents & citations','/workspace.html'],['ranking','Source review & Borda','/workbench.html'],['frames','NLM / Form Space','/index.html#formspace'],['tests','Run & test','/index.html#tests'],['exports','Evidence exports','/index.html#evidence'],['services','System connections','/index.html#integrations']] as const

export default function ITDXApplication(){
 const [view,setView]=useState('lab'),[backend,setBackend]=useState<Backend>({status:'CHECKING'}),[runtime,setRuntime]=useState('NOT_CHECKED'),[counter,setCounter]=useState(0)
 const frame=useRef<HTMLIFrameElement>(null),context=useITDXContext()
 const selected=views.find(v=>v[0]===view)
 useEffect(()=>{
  let cancelled=false;const controller=new AbortController()
  const check=async()=>{
   try{const r=await fetch(GATEWAY_BASE+'/api/bootstrap',{cache:'no-store',signal:controller.signal});const data=await r.json();if(cancelled)return;setBackend(r.ok?{status:'CONNECTED',version:data.version,documents:data.documents.length}:{status:data.connection_status||'UNAVAILABLE',message:data.error})}catch{if(!cancelled)setBackend({status:'UNAVAILABLE',message:'Backend request failed'})}
   try{const r=await fetch('/api/fusarium/operator/state',{cache:'no-store',signal:controller.signal});const data=await r.json();if(!cancelled)setRuntime(r.ok?String(data.status||'UNKNOWN'):'UNAVAILABLE')}catch{if(!cancelled)setRuntime('UNAVAILABLE')}
  };void check();return()=>{cancelled=true;controller.abort()}
 },[counter])
 useEffect(()=>{
  const receive=(event:MessageEvent)=>{
   if(event.origin!==window.location.origin||event.source!==frame.current?.contentWindow)return
   if(event.data?.type==='itdx:replay'){try{replay.seek(event.data.index);replay.select(event.data.assetId);replay.enable(true)}catch{}return}
   if(event.data?.type!=='itdx:selection')return
   const d=event.data.context
   try{selectITDXContext({...(typeof d?.runId==='string'?{runId:d.runId}:{}),...(typeof d?.datasetId==='string'?{datasetId:d.datasetId}:{}),...(typeof d?.documentId==='string'?{documentId:d.documentId}:{}),...(typeof d?.dataOrigin==='string'?{dataOrigin:d.dataOrigin}:{})})}catch{/* Ignore invalid child references. */}
  };window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive)
 },[])
 return <section className={`${styles.workspace} ${styles.application}`}>
  <p className={styles.badge}>FUSARIUM / ITDX APPLICATION</p><h1>ITDX demonstration workspace</h1>
  <p>The complete algorithm lab, source review, frames, test runs and exports share one backend. Earth Simulator is a connected view of this application.</p>
  <div className={styles.row}><strong>ITDX backend: {backend.status}</strong><span>{backend.version?'v'+backend.version:''} {backend.documents!==undefined?backend.documents+' documents':''}</span><span>Fusarium runtime: {runtime}</span><button onClick={()=>setCounter(c=>c+1)}>Refresh connections</button><Link href="/fusarium/earth-simulator">Earth Simulator</Link></div>
  <p className={styles.muted}>Selected run: {context.runId||'none'} · dataset: {context.datasetId||'none'} · origin: {context.dataOrigin}. Selection references are available to registered Fusarium consumers; they do not grant access or run another app.</p>
  <nav className={styles.row} aria-label="ITDX application views">{views.map(v=><button key={v[0]} aria-pressed={view===v[0]} onClick={()=>setView(v[0])}>{v[1]}</button>)}<button aria-pressed={view==='replay'} onClick={()=>setView('replay')}>Earth replay & portable reader</button><button aria-pressed={view==='apps'} onClick={()=>setView('apps')}>Fusarium applications</button></nav>
  {selected&&(backend.status==='CONNECTED'?<iframe ref={frame} className={styles.applicationFrame} title={'ITDX '+selected[1]} src={GATEWAY_BASE+selected[2]} sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"/>:<article className={styles.card}><h2>Connect the ITDX service</h2><p>{backend.message||'Checking the configured backend…'}</p><p>The website server needs ITDX_BACKEND_URL and ITDX_BACKEND_TOKEN. Run the packaged authenticated Python service beside the website, with its persistent data volume and your private document pack. The portable reader and fixed replay remain available while disconnected.</p><p className={styles.muted}>No synthetic success response is substituted for a missing backend. Setup and container instructions are in itdx/integration/FUSARIUM_APP_SETUP.md.</p></article>)}
  {view==='replay'&&<ITDXWorkspace/>}
  {view==='apps'&&<div className={styles.columns}>{FUSARIUM_SECTIONS.map(section=><article className={styles.card} key={section.id}><h2>{section.title}</h2><div className={styles.list}>{section.items.map(app=><Link key={app.id} href={app.href}>{app.title}</Link>)}</div><p className={styles.muted}>Navigation and shared context interface available. App-specific evidence consumption must be registered and tested; opening a route does not establish backend integration.</p></article>)}</div>}
 </section>
}
