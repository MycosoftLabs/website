"use client"
import {useState} from 'react'
import Link from 'next/link'
import {verifyWorkspace,type WorkspaceImport} from '@/lib/itdx/workspace-import.mjs'
import {snapshot,allMeasurements} from '@/lib/itdx/replay-core.mjs'
import {replay,useReplay} from '@/lib/itdx/replay-store'
import styles from './itdx.module.css'

function download(name:string,value:unknown){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export default function ITDXWorkspace(){
 const [workspace,setWorkspace]=useState<WorkspaceImport|null>(null),[selected,setSelected]=useState(''),[page,setPage]=useState(1),[query,setQuery]=useState(''),[message,setMessage]=useState('Load a source workspace exported by the v1.3 local application.'),[busy,setBusy]=useState(false)
 const state=useReplay(),frame=snapshot(state.index)
 const doc=workspace?.documents.find(d=>d.id===selected),source=doc?.pages[page-1]
 const docs=workspace?.documents.filter(d=>d.name.toLowerCase().includes(query.toLowerCase())||d.pages.some(p=>p.text.toLowerCase().includes(query.toLowerCase())))??[]
 return <section className={styles.workspace}>
  <p className={styles.badge}>ITDX v1.3 · SOURCE REVIEW & FICTIONAL REPLAY</p>
  <h1>Evidence, time, and uncertainty</h1>
  <p>Review cited training documents and show predefined demo assets in the shared Earth Simulator map. The ITDX control dock stays available across Fusarium apps.</p>
  <div className={styles.row}><Link href="/fusarium/earth-simulator" onClick={()=>replay.enable(true)}>Open Earth Simulator with demo enabled</Link><button onClick={()=>download('itdx-fictional-frame-'+state.index+'.geojson',frame.geojson)}>Export current GeoJSON</button><button onClick={()=>download('itdx-fictional-measurements.json',allMeasurements())}>Export all 484 measurement records</button></div>
  <div className={styles.columns}>
   <article className={styles.card}><h2>Reproducible observation limits</h2><p>{frame.model.formula}</p><p>At σ = 35 m, nominal radius is {frame.model.radius_m.toFixed(2)} m. Coverage counts errors inside this circle against known synthetic ground truth. It is a finite replay measurement, not validation on field data.</p><p className={styles.muted}>{frame.model.boundary}</p></article>
   <article className={styles.card}><h2>Load your document workspace</h2><p>In the local app, open Source workspace → Integrity & export → Export workspace JSON. Select that file here.</p><label>Workspace JSON <input type="file" accept=".json,application/json" disabled={busy} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setBusy(true);try{if(f.size>24_000_000)throw Error('Maximum file size is 24 MB');const w=await verifyWorkspace(await f.text());setWorkspace(w);setSelected(w.documents[0]?.id??'');setPage(1);setMessage(`${w.documents.length} documents; ${w.import_check.pages_verified} page hashes verified. Original PDF bytes were not included or verified.`)}catch(error){setMessage(error instanceof Error?error.message:'Import failed')}finally{setBusy(false);e.target.value=''}}}/></label><p role="status">{busy?'Verifying page hashes…':message}</p><p className={styles.muted}>This importer keeps content in browser memory and makes no upload request. Reload clears it. Supplied markings remain visible. A matching hash establishes byte consistency, not source truth.</p>{workspace&&<button onClick={()=>{setWorkspace(null);setSelected('');setMessage('Loaded workspace cleared.')}}>Clear loaded workspace</button>}</article>
  </div>
  {workspace&&<>
    <div className={styles.columns}>
     <article className={styles.card}><h2>Source library</h2><label>Find document or page text <input value={query} onChange={e=>setQuery(e.target.value)}/></label><div className={styles.list}>{docs.map(d=><button key={d.id} aria-pressed={d.id===selected} onClick={()=>{setSelected(d.id);setPage(1)}}>{d.name} · {d.pages.length} pages</button>)}</div><p className={styles.muted}>Document matches include page text. Use the page selector to inspect the original text and cite its exact page.</p></article>
     <article className={styles.card}><h2>Source page</h2>{doc&&source&&<><strong>{doc.name}</strong><p className={styles.warning}>{doc.markings.join(' · ')||'Markings as supplied'}</p><label>PDF page <select value={page} onChange={e=>setPage(Number(e.target.value))}>{doc.pages.map(p=><option key={p.page} value={p.page}>{p.page} / {doc.pages.length}</option>)}</select></label><pre className={styles.text}>{source.text}</pre><p className={`${styles.muted} ${styles.status}`}>{doc.name}, PDF page {page}. Source SHA-256: {doc.sha256}</p><p className={styles.muted}>For diagrams, tables and original page images, use the local application.</p></>}</article>
    </div>
    <article className={styles.card}><h2>16 objectives · explicit implementation status</h2><p>Source references do not establish task completion or Army acceptance.</p><div className={styles.scroll}><table><thead><tr><th>Task</th><th>Objective</th><th>Status</th><th>Source references</th></tr></thead><tbody>{workspace.tasks.map(t=><tr key={t.task_id}><td>{t.task_id}</td><td>{t.title}</td><td>{t.implementation_status}</td><td>{t.reference_ids?.length??0}</td></tr>)}</tbody></table></div></article>
    <article className={styles.card}><h2>Saved source notes</h2>{workspace.notes.length?workspace.notes.map(n=><div className={styles.card} key={n.id}><strong>{n.reviewer} · {n.review_status} · page {n.page}</strong><blockquote>{n.quote}</blockquote><p>{n.note}</p><button onClick={()=>{setSelected(n.document_id);setPage(n.page)}}>Open cited page</button></div>):<p>No saved notes. Add exact quotations and reviewer notes in the local application, then export again.</p>}</article>
  </>}
 </section>
}
