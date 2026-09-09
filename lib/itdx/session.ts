"use client"
import {useSyncExternalStore} from 'react'
import {createSession} from './session-core.mjs'
export type {ITDXContext} from './session-core.mjs'
const session=createSession({emit:context=>window.dispatchEvent(new CustomEvent('fusarium:itdx-context',{detail:context}))})
export function useITDXContext(){return useSyncExternalStore(session.subscribe,session.get,()=>session.empty)}
export const selectITDXContext=session.select
/** Context references only. Registering does not grant access or invoke actions. */
export const registerITDXAdapter=session.register
export const registeredITDXAdapters=session.registered
