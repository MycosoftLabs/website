"use client"
import {useState} from 'react'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {ASSETS,snapshot} from '@/lib/itdx/replay-core.mjs'
import {replay,useReplay} from '@/lib/itdx/replay-store'
import {useITDXContext} from '@/lib/itdx/session'
import styles from './itdx.module.css'

export default function ITDXReplayDock(){
 const context=useITDXContext()
 const state=useReplay(),[open,setOpen]=useState(false),pathname=usePathname()
 const frame=snapshot(state.index),asset=frame.assets.find(a=>a.id===state.selected)??frame.assets[0]
 const mapRoute=pathname?.startsWith('/fusarium/earth-simulator')||pathname?.startsWith('/fusarium/crep')
 if(!asset)return null
 return <aside className={styles.dock} aria-label="ITDX fictional replay controls">
   <div className={styles.row}><span className={styles.badge}>ITDX · SYNTHETIC DEMO</span><button onClick={()=>setOpen(!open)} aria-expanded={open}>{open?'Collapse':'Open'}</button></div>
   {open&&<>
    <p className={styles.muted}>ITDX run: {context.runId||'none selected'} · origin: {context.dataOrigin}</p>
    <p className={styles.muted}>Four invented markers on the Fort Stewart, GA land AO (public geocode). Overlay stays synthetic / live=false.</p>
    <div className={styles.row}><label><input type="checkbox" checked={state.enabled} onChange={e=>replay.enable(e.target.checked)}/> Show demo layer</label><button onClick={replay.focus}>Focus demo</button></div>
    <div className={styles.row}><button onClick={replay.play}>{state.playing?'Pause':'Play 20×'}</button><button onClick={()=>replay.seek(0)}>Reset</button><time>{frame.replay_time.slice(11,19)}Z</time></div>
    <input className={styles.range} type="range" aria-label="Replay sample" min={0} max={120} value={state.index} onChange={e=>replay.seek(Number(e.target.value))}/>
    <div className={styles.row}>{ASSETS.map(a=><button key={a.id} aria-pressed={a.id===asset.id} onClick={()=>replay.select(a.id)}>{a.label.replace('DEMO ','')}</button>)}</div>
    <strong>{asset.label}</strong><p className={styles.warning}>{asset.current_position_status.replaceAll('_',' ')}</p>
    <dl><dt>Observation age</dt><dd>{asset.age_seconds??'—'} s</dd><dt>Nominal 95% radius</dt><dd>{asset.nominal_radius_m.toFixed(1)} m</dd><dt>Measured coverage</dt><dd>{asset.empirical_coverage===null?'—':(100*asset.empirical_coverage).toFixed(1)+'%'} ({asset.coverage_count}/{asset.valid_reports})</dd><dt>Position RMSE</dt><dd>{asset.rmse_m?.toFixed(1)??'—'} m</dd></dl>
    <p className={styles.muted}>Circle describes observation-time error under a zero-mean Gaussian model. Delayed positions are not extrapolated. Biased reports violate that model. Truth/deception probabilities are not inferred.</p>
    <p className={`${styles.muted} ${styles.status}`}>{mapRoute?state.layerStatus:'Open Earth Simulator to view markers.'}</p>
    <div className={styles.row}><Link href="/fusarium/earth-simulator">Earth Simulator</Link><Link href="/fusarium/itdx">ITDX workspace</Link></div>
   </>}
 </aside>
}
