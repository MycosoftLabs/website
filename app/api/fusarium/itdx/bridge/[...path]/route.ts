import {NextRequest,NextResponse} from 'next/server'
import {requireFusariumOwner} from '@/lib/auth/api-auth'
import {allowedPath,isFormspacePath,rewriteAsset,limitedBody} from '@/lib/itdx/gateway.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const privateHeaders={'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie, Authorization','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}
async function forward(request:NextRequest,context:{params:Promise<{path:string[]}>}){
 const auth=await requireFusariumOwner();if(auth.error)return auth.error
 const path=allowedPath((await context.params).path,request.method)
 if(!path)return NextResponse.json({error:'Unsupported ITDX path'},{status:404,headers:privateHeaders})
 const itdxOrigin=process.env.ITDX_BACKEND_URL?.trim()
 const formspaceOrigin=process.env.FORMSPACE_BACKEND_URL?.trim()
 const origin=isFormspacePath(path)&&formspaceOrigin?formspaceOrigin:itdxOrigin
 const token=process.env.ITDX_BACKEND_TOKEN?.trim()
 const unboundNote='Optional 8765/8766 lab is unset. Earth Sim uses MAS 188 + MINDEX 189. qualification=NOT_SUPPLIED — not a missing owner env.'
 if(!origin||!token||token.length<32){
  if(!path.startsWith('/api/')){
   return new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ITDX lab NOT_SUPPLIED</title></head><body><p>ITDX optional lab is <strong>NOT_SUPPLIED</strong>.</p><p>${unboundNote}</p><p>p is never invented. live COP stays false.</p></body></html>`,{status:200,headers:{...privateHeaders,'Content-Type':'text/html; charset=utf-8'}})
  }
  return NextResponse.json({connection_status:'NOT_SUPPLIED',qualification:'NOT_SUPPLIED',note:unboundNote},{status:200,headers:privateHeaders})
 }
 if(request.method==='POST'&&(request.headers.get('origin')!==new URL(request.url).origin||!request.headers.get('content-type')?.startsWith('application/json')))return NextResponse.json({error:'Same-origin JSON request required'},{status:403,headers:privateHeaders})
 try{
  const base=new URL(origin);if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash||base.pathname!=='/')throw Error('Invalid configured backend origin')
  const url=new URL(path+request.nextUrl.search,base)
  const headers:Record<string,string>={Authorization:'Bearer '+token}
  let body:Uint8Array|undefined
  if(request.method==='POST'){
   body=await limitedBody(new Response(request.body),24_000_000)
   headers['Content-Type']='application/json';headers['X-ITDX-Token']=request.headers.get('x-itdx-token')||''
  }
  const response=await fetch(url,{method:request.method,headers,body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(60_000)})
  const type=response.headers.get('content-type')||'application/octet-stream',bytes=await limitedBody(response)
  const rewritten=!path.startsWith('/api/')&&(/html|javascript/.test(type))?rewriteAsset(new TextDecoder().decode(bytes)):bytes
  const outgoing:Record<string,string>={...privateHeaders,'Content-Type':type,'X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'none'; form-action 'self'"}
  const disposition=response.headers.get('content-disposition');if(disposition)outgoing['Content-Disposition']=disposition
  return new NextResponse(rewritten,{status:response.status,headers:outgoing})
 }catch{
  if(!path.startsWith('/api/')){
   return new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ITDX lab UNAVAILABLE</title></head><body><p>ITDX optional lab is <strong>UNAVAILABLE</strong>.</p><p>Earth Sim cites MAS 188 + MINDEX 189. qualification=UNQUALIFIED. No invented p.</p></body></html>`,{status:200,headers:{...privateHeaders,'Content-Type':'text/html; charset=utf-8'}})
  }
  return NextResponse.json({connection_status:'UNAVAILABLE',qualification:'UNQUALIFIED',note:'Optional 8765/8766 lab did not accept the request. Earth Sim uses MAS 188 + MINDEX 189.'},{status:200,headers:privateHeaders})
 }
}
export const GET=forward
export const POST=forward
