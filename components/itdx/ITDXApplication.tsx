"use client"
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {FUSARIUM_SECTIONS} from '@/components/fusarium/fusarium-catalog'
import {replay} from '@/lib/itdx/replay-store'
import {GATEWAY_BASE} from '@/lib/itdx/gateway.mjs'
import {useITDXContext,selectITDXContext} from '@/lib/itdx/session'
import ITDXWorkspace from './ITDXWorkspace'
import {ITDXExplanationCards} from './ITDXExplanationCards'
import {ITDXTask8Panel} from './ITDXTask8Panel'
import {ITDXTruthPanel} from './ITDXTruthPanel'
import {ITDXSituationPanel} from './ITDXSituationPanel'
import {ITDXWekaWalkthrough} from './ITDXWekaWalkthrough'
import {ITDXSyntheticArmyIntelBriefing} from './ITDXSyntheticArmyIntelBriefing'
import {LOCAL_DATASET_ID} from '@/lib/itdx/run-narration.mjs'
import {useFusariumRoleOptional} from '@/lib/fusarium/personnel/role-context'
import {FusariumRoleLens} from '@/components/fusarium/personnel/fusarium-role-lens'
import {FusariumCatalogBrowser,FusariumOutcomesPanel,FusariumSurveyPanel} from '@/components/fusarium/personnel/personnel-panels'
import styles from './itdx.module.css'

type Backend={status:string;version?:string;documents?:number;message?:string;optionalCompute?:string}
const views=[['lab','Algorithm lab','/index.html'],['walkthrough','Walkthrough','/index.html#walkthrough'],['sources','Documents & citations','/workspace.html'],['ranking','Source review & Borda','/workbench.html'],['frames','NLM / Form Space','/formspace.html'],['tests','Run & test','/index.html#tests'],['exports','Evidence exports','/index.html#evidence'],['services','System connections','/index.html#integrations']] as const

function labReady(status:string){
  return status==='CONNECTED'||status==='STATIC_UI'||status==='SUPPLIED'
}

export default function ITDXApplication(){
 const duty=useFusariumRoleOptional()
 const [view,setView]=useState('lab'),[backend,setBackend]=useState<Backend>({status:'CHECKING'}),[runtime,setRuntime]=useState('NOT_CHECKED'),[counter,setCounter]=useState(0)
 const frame=useRef<HTMLIFrameElement>(null),context=useITDXContext()
 const selected=views.find(v=>v[0]===view)
 useEffect(()=>{
  const next=duty?.persona.entitlements.defaultItdxView
  if(next)setView(next)
 },[duty?.persona.persona_id])
 useEffect(()=>{
  let cancelled=false;const controller=new AbortController()
  const check=async()=>{
   try{const r=await fetch(GATEWAY_BASE+'/api/bootstrap',{cache:'no-store',signal:controller.signal});const data=await r.json();if(cancelled)return;const docs=Array.isArray(data?.documents)?data.documents.length:0
    const optional=typeof data?.optional_compute==='string'?data.optional_compute:(data?.connection_status==='NOT_SUPPLIED'?'NOT_SUPPLIED':'SUPPLIED')
    if(data?.lab_ui==='SUPPLIED'||data?.connection_status==='STATIC_UI'||data?.version){
      setBackend({status:data.connection_status==='STATIC_UI'?'STATIC_UI':'CONNECTED',version:data.version,documents:docs,optionalCompute:optional,message:data.note})
    }else if(r.ok&&docs>0){setBackend({status:'CONNECTED',version:data.version,documents:docs,optionalCompute:optional})}
    else{setBackend({status:data.connection_status||'UNAVAILABLE',optionalCompute:optional,message:data.note||data.error||data.message})}
   }catch{if(!cancelled)setBackend({status:'UNAVAILABLE',optionalCompute:'NOT_SUPPLIED',message:'Optional 8765 compute request failed. Packaged ITDX tabs still mount.'})}
   try{const r=await fetch('/api/fusarium/operator/state',{cache:'no-store',signal:controller.signal});const data=await r.json();if(!cancelled)setRuntime(r.ok?String(data.status||'UNKNOWN'):'UNAVAILABLE')}catch{if(!cancelled)setRuntime('UNAVAILABLE')}
  };void check();return()=>{cancelled=true;controller.abort()}
 },[counter])
 useEffect(()=>{
  const receive=(event:MessageEvent)=>{
   if(event.origin!==window.location.origin||event.source!==frame.current?.contentWindow)return
   if(event.data?.type==='itdx:replay'){
    try{
     replay.enable(true)
     const current=replay.getState()
     if(Number.isInteger(event.data.index)&&!current.playing)replay.seek(event.data.index)
     if(typeof event.data.assetId==='string')replay.select(event.data.assetId)
     if(event.data.play===true&&!replay.getState().playing)replay.play()
     try{window.sessionStorage.setItem('itdx-run-id',typeof event.data.runId==='string'?event.data.runId:'itdx-bulldog-demo')}catch{/* ignore */}
    }catch{/* Ignore invalid child replay. */}
    return
   }
   if(event.data?.type!=='itdx:selection')return
   const d=event.data.context
   try{selectITDXContext({...(typeof d?.runId==='string'?{runId:d.runId}:{}),...(typeof d?.datasetId==='string'?{datasetId:d.datasetId}:{}),...(typeof d?.documentId==='string'?{documentId:d.documentId}:{}),...(typeof d?.dataOrigin==='string'?{dataOrigin:d.dataOrigin}:{})})}catch{/* Ignore invalid child references. */}
  };window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive)
 },[])
 useEffect(()=>{
  if(view!=='walkthrough'&&view!=='replay'&&view!=='tests')return
  replay.enable(true)
  try{window.sessionStorage.setItem('itdx-run-id','itdx-bulldog-demo')}catch{/* ignore */}
  try{selectITDXContext({runId:'itdx-bulldog-demo',datasetId:LOCAL_DATASET_ID,dataOrigin:'SYNTHETIC_EXERCISE'})}catch{/* ignore */}
 },[view])
 return <section className={`${styles.workspace} ${styles.application}`} data-testid="itdx-application">
  <p className={styles.badge}>FUSARIUM / ITDX APPLICATION v1.4</p><h1>ITDX demonstration workspace</h1>
  <p>v1.4 cite path is MAS <code>http://192.168.0.188:8001</code>, MINDEX <code>http://192.168.0.189:8000</code>, and Google Maps traffic/pathways. Optional 8765/8766 compute is extra, not a gate. Earth Sim overlay lives on /fusarium/earth-simulator.</p>
  <div className={styles.row}><strong>ITDX application: {labReady(backend.status)?'v1.4 SUPPLIED':backend.status}</strong><span className={styles.chip} data-testid="itdx-lab-status">optional 8765 compute {backend.optionalCompute||'NOT_CHECKED'}</span><span>{backend.version?'v'+backend.version:''} {backend.documents!==undefined?backend.documents+' documents':''}</span><span>Fusarium runtime: {runtime}</span><button onClick={()=>setCounter(c=>c+1)}>Refresh connections</button><Link href="/fusarium/earth-simulator">Earth Simulator</Link></div>
  <p className={styles.muted}>Selected run: {context.runId||'none'} · dataset: {context.datasetId||'none'} · origin: {context.dataOrigin}. Google Maps Directions/Matrix/Geocode remain SUPPLIED on the website BFF. 8765 down or AirNow missing does not hide these tabs.</p>
  <FusariumRoleLens surface="itdx"/>
  <nav className={styles.row} aria-label="ITDX application views">{views.map(v=><button key={v[0]} aria-pressed={view===v[0]} onClick={()=>setView(v[0])}>{v[1]}</button>)}<button aria-pressed={view==='replay'} onClick={()=>setView('replay')}>Earth replay & portable reader</button><button aria-pressed={view==='apps'} onClick={()=>setView('apps')}>Fusarium applications</button><button aria-pressed={view==='personnel'} onClick={()=>setView('personnel')}>Personnel catalog</button><button aria-pressed={view==='survey'} onClick={()=>setView('survey')}>Survey</button><button aria-pressed={view==='outcomes'} onClick={()=>setView('outcomes')}>Outcomes / KO</button></nav>
  {(view==='lab'||view==='walkthrough'||view==='replay'||view==='tests')&&<ITDXSyntheticArmyIntelBriefing variant="workspace" isActive/>}
  {(view==='walkthrough'||view==='replay'||view==='tests'||view==='frames')&&<ITDXWekaWalkthrough compact={view==='lab'||view==='replay'}/>}
  {(view==='walkthrough'||view==='replay'||view==='tests')&&<><ITDXExplanationCards/><ITDXSituationPanel/><ITDXTruthPanel/><ITDXTask8Panel/></>}
  {selected&&<iframe ref={frame} className={styles.applicationFrame} data-testid="itdx-application-frame" title={'ITDX '+selected[1]} src={GATEWAY_BASE+selected[2]} sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"/>}
  {view==='replay'&&<ITDXWorkspace/>}
  {view==='apps'&&<div className={styles.columns}>{FUSARIUM_SECTIONS.map(section=><article className={styles.card} key={section.id}><h2>{section.title}</h2><div className={styles.list}>{section.items.map(app=><Link key={app.id} href={app.href}>{app.title}</Link>)}</div><p className={styles.muted}>Navigation and shared context interface available. App-specific evidence consumption must be registered and tested; opening a route does not establish backend integration.</p></article>)}</div>}
  {view==='personnel'&&<FusariumCatalogBrowser/>}
  {view==='survey'&&<FusariumSurveyPanel/>}
  {view==='outcomes'&&<FusariumOutcomesPanel/>}
 </section>
}
