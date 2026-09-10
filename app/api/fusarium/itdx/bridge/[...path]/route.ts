import {NextRequest,NextResponse} from 'next/server'
import {requireFusariumOwner} from '@/lib/auth/api-auth'
import {allowedPath,isFormspacePath,rewriteAsset,limitedBody} from '@/lib/itdx/gateway.mjs'
import {
  readLabStatic,
  staticComputeDenied,
  staticEmptyList,
  staticFormAtlas,
  staticFormspace,
  staticLabBootstrap,
  staticWorkspace,
  staticWorkspacePage,
} from '@/lib/itdx/static-lab.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const privateHeaders={'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie, Authorization','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}
const frameHeaders={
  ...privateHeaders,
  'X-Frame-Options':'SAMEORIGIN',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'none'; form-action 'self'",
}

function packagedFile(path:string){
  const file=readLabStatic(path)
  if(!file)return null
  const type=file.type
  const body=/html|javascript/.test(type)?rewriteAsset(new TextDecoder().decode(file.bytes)):file.bytes
  return new NextResponse(body,{status:200,headers:{...frameHeaders,'Content-Type':type}})
}

function packagedApi(path:string,search:URLSearchParams){
  if(path==='/api/bootstrap'||path==='/api/health')return NextResponse.json(staticLabBootstrap(),{headers:privateHeaders})
  if(path==='/api/workspace')return NextResponse.json(staticWorkspace(),{headers:privateHeaders})
  if(path==='/api/workspace/page'){
    const page=staticWorkspacePage(search.get('id')||'',Number(search.get('page')||'1'))
    if(!page)return NextResponse.json({error:'Unknown packaged document'},{status:404,headers:privateHeaders})
    return NextResponse.json(page,{headers:privateHeaders})
  }
  if(path==='/api/workspace/search')return NextResponse.json({hits:[]},{headers:privateHeaders})
  if(path==='/api/rankings'||path==='/api/civil-cases')return NextResponse.json(staticEmptyList(),{headers:privateHeaders})
  if(path==='/api/formspace')return NextResponse.json(staticFormspace(),{headers:privateHeaders})
  if(path==='/api/form-atlas')return NextResponse.json(staticFormAtlas(),{headers:privateHeaders})
  return NextResponse.json(staticComputeDenied(),{headers:privateHeaders})
}

async function forward(request:NextRequest,context:{params:Promise<{path:string[]}>}){
  const auth=await requireFusariumOwner();if(auth.error)return auth.error
  const path=allowedPath((await context.params).path,request.method)
  if(!path)return NextResponse.json({error:'Unsupported ITDX path'},{status:404,headers:privateHeaders})
  if(!path.startsWith('/api/')){
    const packaged=packagedFile(path)
    if(packaged)return packaged
  }
  const itdxOrigin=process.env.ITDX_BACKEND_URL?.trim()
  const formspaceOrigin=process.env.FORMSPACE_BACKEND_URL?.trim()
  const origin=isFormspacePath(path)&&formspaceOrigin?formspaceOrigin:itdxOrigin
  const token=process.env.ITDX_BACKEND_TOKEN?.trim()
  const bound=Boolean(origin&&token&&token.length>=32)
  if(request.method==='POST'&&(!bound||request.headers.get('origin')!==new URL(request.url).origin||!request.headers.get('content-type')?.startsWith('application/json'))){
    if(!bound)return NextResponse.json(staticComputeDenied(),{headers:privateHeaders})
    return NextResponse.json({error:'Same-origin JSON request required'},{status:403,headers:privateHeaders})
  }
  if(!bound){
    if(request.method==='POST')return NextResponse.json(staticComputeDenied(),{headers:privateHeaders})
    return packagedApi(path,request.nextUrl.searchParams)
  }
  try{
    const base=new URL(origin as string)
    if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash||base.pathname!=='/')throw Error('Invalid configured backend origin')
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
    const outgoing:Record<string,string>={...frameHeaders,'Content-Type':type}
    const disposition=response.headers.get('content-disposition');if(disposition)outgoing['Content-Disposition']=disposition
    return new NextResponse(rewritten,{status:response.status,headers:outgoing})
  }catch{
    if(!path.startsWith('/api/')){
      const packaged=packagedFile(path)
      if(packaged)return packaged
    }
    if(request.method==='GET')return packagedApi(path,request.nextUrl.searchParams)
    return NextResponse.json(staticComputeDenied(),{headers:privateHeaders})
  }
}
export const GET=forward
export const POST=forward
