"use client"
import {useSyncExternalStore} from 'react'
import {ASSETS,SAMPLE_COUNT,snapshot} from './replay-core.mjs'
import {logDemoEvent} from './demo-log'

export type ItdxReplayLayerKey='assets'|'tracks'|'uncertainty'|'boundary'|'corridor'
export type ItdxReplayLayers=Record<ItdxReplayLayerKey,boolean>
export const ITDX_REPLAY_SPEEDS=[1,5,10,20] as const
export type ItdxReplaySpeed=(typeof ITDX_REPLAY_SPEEDS)[number]
const defaultLayers:ItdxReplayLayers={assets:true,tracks:true,uncertainty:true,boundary:true,corridor:true}
type State={enabled:boolean;playing:boolean;index:number;speed:ItdxReplaySpeed;selected:string;focusRequest:number;focusTarget:string|null;layers:ItdxReplayLayers;layerStatus:string}
const initial:State={enabled:false,playing:false,index:0,speed:20,selected:ASSETS[0].id,focusRequest:0,focusTarget:null,layers:defaultLayers,layerStatus:'LAYER_DETACHED'}

function sampleIntervalMs(speed:number){
  return Math.max(50,(10*1000)/Math.max(1,speed))
}

function asSpeed(value:unknown):ItdxReplaySpeed{
  return ITDX_REPLAY_SPEEDS.includes(value as ItdxReplaySpeed)?(value as ItdxReplaySpeed):20
}
const CHANNEL='itdx-demo-replay'
let state=initial
let seq=0
let clock:ReturnType<typeof setInterval>|null=null
let lastTick=0
const listeners=new Set<()=>void>()
let channel:BroadcastChannel|null=null
let applyingRemote=false

function advanceClock(){
  if(!state.playing)return
  const now=Date.now()
  const interval=sampleIntervalMs(state.speed)
  const steps=Math.max(1,Math.min(12,Math.floor((now-lastTick)/interval)||1))
  lastTick=now
  for(let i=0;i<steps;i++){
    if(!state.playing)break
    replay.tick()
  }
}

function syncClock(playing:boolean){
  if(typeof window==='undefined')return
  const hidden=typeof document!=='undefined'&&document.hidden
  if(clock){
    window.clearInterval(clock)
    clock=null
  }
  if(playing&&!hidden){
    lastTick=Date.now()
    clock=window.setInterval(advanceClock,Math.min(200,sampleIntervalMs(state.speed)))
    window.setTimeout(advanceClock,0)
  }
}

function publish(next:State,reason:string){
  if(typeof window==='undefined'||applyingRemote)return
  try{
    window.sessionStorage.setItem(CHANNEL,JSON.stringify({enabled:next.enabled,playing:next.playing,index:next.index,speed:next.speed,selected:next.selected,layers:next.layers,seq}))
    window.dispatchEvent(new CustomEvent('fusarium:itdx-replay',{detail:{...next,reason,seq}}))
    if(reason!=='tick-quiet'&&reason!=='layer-status'&&reason!=='fly-to'){
      channel?.postMessage({...next,reason,seq})
    }
  }catch{/* Isolate storage / channel failure. */}
  if(reason==='tick-quiet'||reason==='layer-status')return
  const frame=snapshot(next.index)
  const asset=frame.assets.find(item=>item.id===next.selected)
  logDemoEvent({
    type:reason,
    clock:frame.replay_time,
    index:next.index,
    assetId:next.selected,
    position:asset?.position??null,
    layers:next.layers,
    focusTarget:next.focusTarget,
    runId:typeof window!=='undefined'?(window.sessionStorage.getItem('itdx-run-id')||'itdx-bulldog-demo'):'itdx-bulldog-demo',
  })
}

function set(patch:Partial<State>,reason='state'){
  if(Object.entries(patch).every(([key,value])=>state[key as keyof State]===value))return
  seq+=1
  state={...state,...patch}
  syncClock(state.playing)
  listeners.forEach(fn=>fn())
  publish(state,reason)
}

function applyRemote(next:Partial<State>&{seq?:number;reason?:string}){
  if(typeof next.seq==='number'&&next.seq<=seq)return
  if(state.playing&&typeof next.index==='number'&&next.index<state.index)return
  if(state.playing&&(next.reason==='seek'||next.reason==='fly-to'))return
  applyingRemote=true
  try{
    if(typeof next.seq==='number')seq=next.seq
    state={...state,...next}
    syncClock(state.playing)
    listeners.forEach(fn=>fn())
  }finally{
    applyingRemote=false
  }
}

if(typeof window!=='undefined'){
  document.addEventListener('visibilitychange',()=>{
    syncClock(state.playing)
  })
  try{
    const saved=window.sessionStorage.getItem(CHANNEL)
    if(saved){
      const parsed=JSON.parse(saved) as Partial<State>&{seq?:number}
      const {seq:savedSeq,...rest}=parsed
      if(typeof savedSeq==='number')seq=savedSeq
      state={...state,...rest,speed:asSpeed(rest.speed),playing:false,focusRequest:0,focusTarget:null}
    }
  }catch{/* Ignore corrupt session restore. */}
  try{
    channel=new BroadcastChannel(CHANNEL)
    channel.onmessage=event=>{
      const data=event.data
      if(!data||typeof data!=='object')return
      applyRemote({
        enabled:data.enabled,
        playing:data.playing,
        index:data.index,
        speed:asSpeed(data.speed),
        selected:data.selected,
        layers:data.layers||state.layers,
        layerStatus:data.layerStatus||state.layerStatus,
        seq:data.seq,
        reason:data.reason,
      })
    }
  }catch{/* BroadcastChannel is optional for same-tab SPA. */}
}

const subscribe=(callback:()=>void)=>{listeners.add(callback);return()=>{listeners.delete(callback)}}
export const replay={
 getState:()=>state,
 enable:(enabled:boolean)=>set({enabled,...(!enabled?{playing:false}:{} )},enabled?'overlay-on':'overlay-off'),
 play:()=>{
  if(state.playing){set({playing:false},'pause');return}
  set({enabled:true,playing:true,index:state.index===SAMPLE_COUNT-1?0:state.index},'play')
 },
 pause:()=>set({playing:false},'pause'),
 setSpeed:(speed:ItdxReplaySpeed)=>{if(!ITDX_REPLAY_SPEEDS.includes(speed))return;set({speed},'speed')},
 seek:(index:number)=>{if(!Number.isInteger(index)||index<0||index>=SAMPLE_COUNT)throw Error('Invalid replay index');set({index,playing:false},'seek')},
 tick:()=>{if(!state.playing)return;const index=Math.min(SAMPLE_COUNT-1,state.index+1);set({index,playing:index<SAMPLE_COUNT-1},index%5===0||index===SAMPLE_COUNT-1?'tick':'tick-quiet')},
 select:(selected:string)=>{if(ASSETS.some(a=>a.id===selected))set({selected,enabled:true,focusTarget:selected,focusRequest:state.focusRequest+1},'select')},
 focus:()=>set({enabled:true,focusTarget:null,focusRequest:state.focusRequest+1},'fly-to'),
 setLayer:(key:ItdxReplayLayerKey,visible:boolean)=>{
  const layers={...state.layers,[key]:visible}
  const enabled=Object.values(layers).some(Boolean)
  set({layers,enabled,...(!enabled?{playing:false}:{})},'layer-toggle')
 },
 status:(layerStatus:string)=>set({layerStatus},'layer-status'),
}
export function useReplay(){return useSyncExternalStore(subscribe,()=>state,()=>initial)}
