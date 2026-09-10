"use client"
import {useEffect,useRef} from 'react'
import {usePathname} from 'next/navigation'
import type {Map} from 'maplibre-gl'
import {attachLivePathways,attachReplay,type ReplayLayerController} from '@/lib/itdx/map-layer.mjs'
import {replay,useReplay} from '@/lib/itdx/replay-store'

export default function ITDXReplayLayer({map}:{map:Map|null}){
 const state=useReplay(),pathname=usePathname()
 const controller=useRef<ReplayLayerController|null>(null)
 const live=useRef<{setData:(next:GeoJSON.FeatureCollection)=>void;dispose:()=>void}|null>(null)
 const didAutoFocus=useRef(false)
 const active=state.enabled&&Boolean(pathname?.startsWith('/fusarium/earth-simulator'))
 useEffect(()=>{
   if(!active||!map)return
   didAutoFocus.current=false
   controller.current=attachReplay(map,{onSelect:replay.select,onStatus:replay.status})
   controller.current.setLayers(state.layers)
   live.current=attachLivePathways(map)
   const onTruth=(event:Event)=>{
     const detail=(event as CustomEvent).detail
     if(detail?.byId)controller.current?.setFusion(detail.byId)
   }
   const onPathways=(event:Event)=>{
     const detail=(event as CustomEvent).detail
     const geojson=detail?.geojson
     if(geojson?.type==='FeatureCollection')live.current?.setData(geojson)
   }
   window.addEventListener('fusarium:itdx-truth',onTruth)
   window.addEventListener('fusarium:itdx-pathways',onPathways)
   return()=>{
     window.removeEventListener('fusarium:itdx-truth',onTruth)
     window.removeEventListener('fusarium:itdx-pathways',onPathways)
     live.current?.dispose();live.current=null
     controller.current?.dispose();controller.current=null
   }
 },[map,active])
 useEffect(()=>{controller.current?.update(state.index)},[map,active,state.index])
 useEffect(()=>{controller.current?.setLayers(state.layers)},[map,active,state.layers])
 useEffect(()=>{
   if(!active||!map||!state.focusRequest)return
   if(state.focusTarget)controller.current?.focusAsset(state.focusTarget)
   else controller.current?.focus()
 },[map,active,state.focusRequest,state.focusTarget])
 useEffect(()=>{
   if(!active||!map||didAutoFocus.current)return
   didAutoFocus.current=true
   replay.focus()
 },[map,active])
 return null
}
