"use client"
import {useEffect,useRef} from 'react'
import {usePathname} from 'next/navigation'
import type {Map} from 'maplibre-gl'
import {attachLivePathways,attachReplay,type ReplayLayerController} from '@/lib/itdx/map-layer.mjs'
import {replay,useReplay} from '@/lib/itdx/replay-store'
import {setEarthSimScenarioActive} from '@/lib/crep/viewport-memory-governor'

const EARTH_SIM_PREFIX='/fusarium/earth-simulator'
const MAX_LIVE_PATHWAY_FEATURES=48

function clipPathways(geojson:GeoJSON.FeatureCollection|null|undefined):GeoJSON.FeatureCollection|null{
  const features=Array.isArray(geojson?.features)?geojson.features.slice(0,MAX_LIVE_PATHWAY_FEATURES):[]
  if(!features.length)return null
  return {type:'FeatureCollection',features}
}

export default function ITDXReplayLayer({map}:{map:Map|null}){
 const state=useReplay(),pathname=usePathname()
 const controller=useRef<ReplayLayerController|null>(null)
 const live=useRef<{setData:(next:GeoJSON.FeatureCollection)=>void;dispose:()=>void}|null>(null)
 const onEarthSim=Boolean(pathname?.startsWith(EARTH_SIM_PREFIX))
 const active=state.enabled&&onEarthSim
 useEffect(()=>{
   if(!onEarthSim)return
   if(!replay.getState().enabled)replay.enable(true)
 },[onEarthSim])
 useEffect(()=>{
   setEarthSimScenarioActive(active)
   return()=>setEarthSimScenarioActive(false)
 },[active])
 useEffect(()=>{
   if(!active||!map)return
   controller.current=attachReplay(map,{onSelect:replay.select,onStatus:replay.status})
   controller.current.setLayers(state.layers)
   live.current=attachLivePathways(map)
   const onTruth=(event:Event)=>{
     const detail=(event as CustomEvent).detail
     if(detail?.byId)controller.current?.setFusion(detail.byId)
   }
   const onPathways=(event:Event)=>{
     const detail=(event as CustomEvent).detail
     const clipped=clipPathways(detail?.geojson)
     if(clipped)live.current?.setData(clipped)
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
 return null
}
