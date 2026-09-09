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
 if(!origin||!token||token.length<32)return NextResponse.json({error:'ITDX backend is not configured',connection_status:'NOT_CONFIGURED',qualification:'NOT_SUPPLIED',note:'Optional 8765/8766 lab is unset. Earth Sim uses MAS 188 + MINDEX 189 instead.'},{status:200,headers:privateHeaders})
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
 }catch{return NextResponse.json({error:'ITDX backend unavailable or response rejected',connection_status:'UNAVAILABLE'},{status:502,headers:privateHeaders})}
}
export const GET=forward
export const POST=forward
