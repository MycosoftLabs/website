"use client"
import {useSyncExternalStore} from 'react'
import {ASSETS,SAMPLE_COUNT} from './replay-core.mjs'

type State={enabled:boolean;playing:boolean;index:number;selected:string;focusRequest:number;layerStatus:string}
const initial:State={enabled:false,playing:false,index:0,selected:ASSETS[0].id,focusRequest:0,layerStatus:'LAYER_DETACHED'}
let state=initial
const listeners=new Set<()=>void>()
function set(patch:Partial<State>){if(Object.entries(patch).every(([key,value])=>state[key as keyof State]===value))return;state={...state,...patch};listeners.forEach(f=>f())}
const subscribe=(callback:()=>void)=>{listeners.add(callback);return()=>{listeners.delete(callback)}}
export const replay={
 enable:(enabled:boolean)=>set({enabled,...(!enabled?{playing:false}:{} )}),
 play:()=>set({enabled:true,playing:!state.playing,index:state.index===SAMPLE_COUNT-1?0:state.index}),
 pause:()=>set({playing:false}),
 seek:(index:number)=>{if(!Number.isInteger(index)||index<0||index>=SAMPLE_COUNT)throw Error('Invalid replay index');set({index,playing:false})},
 tick:()=>{if(!state.playing)return;const index=Math.min(SAMPLE_COUNT-1,state.index+1);set({index,playing:index<SAMPLE_COUNT-1})},
 select:(selected:string)=>{if(ASSETS.some(a=>a.id===selected))set({selected})},
 focus:()=>set({enabled:true,focusRequest:state.focusRequest+1}),
 status:(layerStatus:string)=>set({layerStatus}),
}
export function useReplay(){return useSyncExternalStore(subscribe,()=>state,()=>initial)}
