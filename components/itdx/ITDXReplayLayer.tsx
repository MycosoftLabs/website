"use client"
import {useEffect,useRef} from 'react'
import {usePathname} from 'next/navigation'
import type {Map} from 'maplibre-gl'
import {attachReplay,type ReplayLayerController} from '@/lib/itdx/map-layer.mjs'
import {replay,useReplay} from '@/lib/itdx/replay-store'

export default function ITDXReplayLayer({map}:{map:Map|null}){
 const state=useReplay(),pathname=usePathname()
 const controller=useRef<ReplayLayerController|null>(null)
 const active=state.enabled&&Boolean(pathname?.startsWith('/fusarium/'))
 useEffect(()=>{
   if(!active||!map)return
   controller.current=attachReplay(map,{onSelect:replay.select,onStatus:replay.status})
   return()=>{controller.current?.dispose();controller.current=null}
 },[map,active])
 useEffect(()=>{controller.current?.update(state.index)},[map,active,state.index])
 useEffect(()=>{if(state.focusRequest)controller.current?.focus()},[map,active,state.focusRequest])
 return null
}
