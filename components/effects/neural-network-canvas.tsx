"use client"

import { useEffect, useRef } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Quantum Neural Network — Three.js background component
// Adapted from Jeremboo / inconvergent. Mycosoft green palette. No UI controls.
// Lazy-starts via IntersectionObserver. Cleans up fully on unmount.
// ─────────────────────────────────────────────────────────────────────────────

interface Props { className?: string }

// Noise GLSL (simplex) — shared by both shaders
const NOISE_GLSL = `
vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289v4(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289v3(i);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.,i1.z,i2.z,1.))
    +i.y+vec4(0.,i1.y,i2.y,1.))
    +i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 xx=x_*ns.x+ns.yyyy;
  vec4 yy=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(xx)-abs(yy);
  vec4 b0=vec4(xx.xy,yy.xy);
  vec4 b1=vec4(xx.zw,yy.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`

const NODE_VERT = `${NOISE_GLSL}
attribute float nodeSize;
attribute float nodeType;
attribute vec3 nodeColor;
attribute float distanceFromRoot;
uniform float uTime;
uniform vec3 uPulsePositions[3];
uniform float uPulseTimes[3];
uniform float uPulseSpeed;
uniform float uBaseNodeSize;
varying vec3 vColor;
varying float vNodeType;
varying float vPulseIntensity;
varying float vDistanceFromRoot;
varying float vGlow;
float getPulse(vec3 wp,vec3 pp,float pt){
  if(pt<0.)return 0.;
  float ts=uTime-pt;
  if(ts<0.||ts>4.)return 0.;
  float pr=ts*uPulseSpeed;
  float d=distance(wp,pp);
  return smoothstep(3.,0.,abs(d-pr))*smoothstep(4.,0.,ts);
}
void main(){
  vNodeType=nodeType;vColor=nodeColor;vDistanceFromRoot=distanceFromRoot;
  vec3 wp=(modelMatrix*vec4(position,1.)).xyz;
  float pi=0.;
  for(int i=0;i<3;i++) pi+=getPulse(wp,uPulsePositions[i],uPulseTimes[i]);
  vPulseIntensity=min(pi,1.);
  float breathe=sin(uTime*.7+distanceFromRoot*.15)*.15+.85;
  float sz=nodeSize*breathe*(1.+vPulseIntensity*2.5);
  vGlow=.5+.5*sin(uTime*.5+distanceFromRoot*.2);
  vec3 pos=position;
  if(nodeType>.5){ float n=snoise(position*.08+uTime*.08); pos+=normal*n*.15; }
  vec4 mv=modelViewMatrix*vec4(pos,1.);
  gl_PointSize=sz*uBaseNodeSize*(1000./-mv.z);
  gl_Position=projectionMatrix*mv;
}`

const NODE_FRAG = `
uniform float uTime;
uniform vec3 uPulseColors[3];
varying vec3 vColor;
varying float vNodeType;
varying float vPulseIntensity;
varying float vDistanceFromRoot;
varying float vGlow;
void main(){
  vec2 c=2.*gl_PointCoord-1.;
  float d=length(c);
  if(d>1.)discard;
  float g1=1.-smoothstep(0.,.5,d);
  float g2=1.-smoothstep(0.,1.,d);
  float gs=pow(g1,1.2)+g2*.3;
  float bc=.9+.1*sin(uTime*.6+vDistanceFromRoot*.25);
  vec3 col=vColor*bc;
  if(vPulseIntensity>0.){
    vec3 pc=mix(vec3(1.),uPulseColors[0],.4);
    col=mix(col,pc,vPulseIntensity*.8);
    col*=(1.+vPulseIntensity*1.2);
    gs*=(1.+vPulseIntensity);
  }
  col+=vec3(1.)*smoothstep(.4,0.,d)*.3;
  col*=(1.+vGlow*.1);
  float alpha=gs*(.95-.3*d);
  gl_FragColor=vec4(col,alpha);
}`

const CONN_VERT = `${NOISE_GLSL}
attribute vec3 startPoint;
attribute vec3 endPoint;
attribute float connectionStrength;
attribute float pathIndex;
attribute vec3 connectionColor;
uniform float uTime;
uniform vec3 uPulsePositions[3];
uniform float uPulseTimes[3];
uniform float uPulseSpeed;
varying vec3 vColor;
varying float vConnectionStrength;
varying float vPulseIntensity;
varying float vPathPosition;
float getPulse(vec3 wp,vec3 pp,float pt){
  if(pt<0.)return 0.;
  float ts=uTime-pt;
  if(ts<0.||ts>4.)return 0.;
  float pr=ts*uPulseSpeed;
  float d=distance(wp,pp);
  return smoothstep(3.,0.,abs(d-pr))*smoothstep(4.,0.,ts);
}
void main(){
  float t=position.x;
  vPathPosition=t;
  vec3 mid=mix(startPoint,endPoint,.5);
  vec3 perp=normalize(cross(normalize(endPoint-startPoint),vec3(0.,1.,0.)));
  if(length(perp)<.1)perp=vec3(1.,0.,0.);
  mid+=perp*sin(t*3.14159)*.15;
  vec3 p0=mix(startPoint,mid,t);
  vec3 p1=mix(mid,endPoint,t);
  vec3 fp=mix(p0,p1,t);
  fp+=perp*snoise(vec3(pathIndex*.08,t*.6,uTime*.15))*.12;
  vec3 wp=(modelMatrix*vec4(fp,1.)).xyz;
  float pi=0.;
  for(int i=0;i<3;i++) pi+=getPulse(wp,uPulsePositions[i],uPulseTimes[i]);
  vPulseIntensity=min(pi,1.);
  vColor=connectionColor;
  vConnectionStrength=connectionStrength;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(fp,1.);
}`

const CONN_FRAG = `
uniform float uTime;
uniform vec3 uPulseColors[3];
varying vec3 vColor;
varying float vConnectionStrength;
varying float vPulseIntensity;
varying float vPathPosition;
void main(){
  float f1=sin(vPathPosition*25.-uTime*4.)*.5+.5;
  float f2=sin(vPathPosition*15.-uTime*2.5+1.57)*.5+.5;
  float flow=(f1+f2*.5)/1.5;
  vec3 col=vColor*(.8+.2*sin(uTime*.6+vPathPosition*12.));
  float fi=.4*flow*vConnectionStrength;
  if(vPulseIntensity>0.){
    col=mix(col,mix(vec3(1.),uPulseColors[0],.3)*1.2,vPulseIntensity*.7);
    fi+=vPulseIntensity*.8;
  }
  col*=(.7+fi+vConnectionStrength*.5);
  float alpha=.7*vConnectionStrength+flow*.3;
  alpha=mix(alpha,min(1.,alpha*2.5),vPulseIntensity);
  gl_FragColor=vec4(col,alpha);
}`

export function NeuralNetworkCanvas({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let disposed = false
    let animId = 0
    let running = false
    let threeCleanup: (() => void) | null = null

    // Lazy-import Three.js + addons
    Promise.all([
      import("three"),
      import("three/addons/controls/OrbitControls.js"),
      import("three/addons/postprocessing/EffectComposer.js"),
      import("three/addons/postprocessing/RenderPass.js"),
      import("three/addons/postprocessing/UnrealBloomPass.js"),
      import("three/addons/postprocessing/OutputPass.js"),
    ]).then(([THREE, OC, EC, RP, UBP, OP]) => {
      if (disposed) return

      const { OrbitControls } = OC as { OrbitControls: new (cam: unknown, el: HTMLElement) => unknown & { enableDamping: boolean; dampingFactor: number; rotateSpeed: number; minDistance: number; maxDistance: number; autoRotate: boolean; autoRotateSpeed: number; enablePan: boolean; update: () => void; dispose: () => void } }
      const { EffectComposer } = EC as { EffectComposer: new (r: unknown) => { addPass: (p: unknown) => void; render: () => void; setSize: (w: number, h: number) => void } }
      const { RenderPass } = RP as { RenderPass: new (s: unknown, c: unknown) => unknown }
      const { UnrealBloomPass } = UBP as { UnrealBloomPass: new (res: unknown, str: number, rad: number, thr: number) => { resolution: { set: (w: number, h: number) => void } } }
      const { OutputPass } = OP as { OutputPass: new () => unknown }

      const container = canvas.parentElement!
      let W = container.offsetWidth
      let H = container.offsetHeight || 600

      // ── Mycosoft green palette ─────────────────────────────────────────────
      const palette = [
        new THREE.Color(0x22c55e),  // green-500
        new THREE.Color(0x10b981),  // emerald-500
        new THREE.Color(0x34d399),  // emerald-400
        new THREE.Color(0x4ade80),  // green-400
        new THREE.Color(0x6ee7b7),  // emerald-300
      ]

      // ── Scene ──────────────────────────────────────────────────────────────
      const scene = new THREE.Scene()
      scene.fog = new THREE.FogExp2(0x000000, 0.003)

      const camera = new THREE.PerspectiveCamera(65, W / H, 0.1, 1000)
      camera.position.set(0, 4, 14)  // 50% closer = 50% more zoomed in

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" })
      renderer.setSize(W, H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      renderer.setClearColor(0x020c06, 1)
      renderer.outputColorSpace = THREE.SRGBColorSpace

      // ── Controls ───────────────────────────────────────────────────────────
      const controls = new OrbitControls(camera, renderer.domElement as HTMLElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.rotateSpeed = 0.6
      controls.minDistance = 8
      controls.maxDistance = 60
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.25
      controls.enablePan = false
      controls.enableZoom = false   // prevents scroll wheel hijacking page scroll

      // ── Post-processing ────────────────────────────────────────────────────
      const composer = new EffectComposer(renderer)
      composer.addPass(new RenderPass(scene, camera))
      const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 1.8, 0.6, 0.7)
      composer.addPass(bloom)
      composer.addPass(new OutputPass())

      // ── Pulse uniforms ─────────────────────────────────────────────────────
      function makePulseUniforms() {
        return {
          uTime: { value: 0 },
          uPulsePositions: { value: [new THREE.Vector3(1e3,1e3,1e3), new THREE.Vector3(1e3,1e3,1e3), new THREE.Vector3(1e3,1e3,1e3)] },
          uPulseTimes: { value: [-1e3, -1e3, -1e3] },
          uPulseColors: { value: [new THREE.Color(0x22c55e), new THREE.Color(0x10b981), new THREE.Color(0x34d399)] },
          uPulseSpeed: { value: 18 },
          uBaseNodeSize: { value: 0.6 },
        }
      }

      // ── Node class ─────────────────────────────────────────────────────────
      class Node3 {
        position: InstanceType<typeof THREE.Vector3>
        connections: { node: Node3; strength: number }[] = []
        level: number; type: number
        size: number; distanceFromRoot = 0
        constructor(pos: InstanceType<typeof THREE.Vector3>, level = 0, type = 0) {
          this.position = pos; this.level = level; this.type = type
          this.size = type === 0 ? (Math.random() * 0.6 + 0.8) : (Math.random() * 0.5 + 0.5)
        }
        connect(n: Node3, s = 1) {
          if (!this.connections.some(c => c.node === n)) {
            this.connections.push({ node: n, strength: s })
            n.connections.push({ node: this, strength: s })
          }
        }
        has(n: Node3) { return this.connections.some(c => c.node === n) }
      }

      // ── Network generation — crystalline sphere ────────────────────────────
      function generateNetwork() {
        const nodes: Node3[] = []
        const root = new Node3(new THREE.Vector3(0,0,0), 0, 0)
        root.size = 2.0; nodes.push(root)
        const layers = 5; const gr = (1 + Math.sqrt(5)) / 2
        for (let layer = 1; layer <= layers; layer++) {
          const r = layer * 4
          const n = Math.floor(layer * 10)
          for (let i = 0; i < n; i++) {
            const phi = Math.acos(1 - 2 * (i + 0.5) / n)
            const theta = 2 * Math.PI * i / gr
            const pos = new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi))
            const node = new Node3(pos, layer, layer === layers || Math.random() < 0.3 ? 1 : 0)
            node.distanceFromRoot = r; nodes.push(node)
            if (layer > 1) {
              const prev = nodes.filter(x => x.level === layer - 1 && x !== root)
                .sort((a, b) => pos.distanceTo(a.position) - pos.distanceTo(b.position))
              for (let j = 0; j < Math.min(3, prev.length); j++) {
                const d = pos.distanceTo(prev[j].position)
                node.connect(prev[j], Math.max(0.3, 1 - d / (r * 2)))
              }
            } else { root.connect(node, 0.9) }
          }
          const ln = nodes.filter(x => x.level === layer)
          for (const nd of ln) {
            const nearby = ln.filter(x => x !== nd)
              .sort((a, b) => nd.position.distanceTo(a.position) - nd.position.distanceTo(b.position))
              .slice(0, 5)
            for (const nb of nearby) {
              if (nd.position.distanceTo(nb.position) < r * 0.8 && !nd.has(nb)) nd.connect(nb, 0.6)
            }
          }
        }
        return nodes
      }

      // ── Build Three.js meshes from nodes ───────────────────────────────────
      let nodesMesh: InstanceType<typeof THREE.Points> | null = null
      let connMesh: InstanceType<typeof THREE.LineSegments> | null = null

      function buildMeshes(nodes: Node3[]) {
        if (nodesMesh) { scene.remove(nodesMesh); nodesMesh.geometry.dispose(); (nodesMesh.material as InstanceType<typeof THREE.ShaderMaterial>).dispose() }
        if (connMesh)  { scene.remove(connMesh);  connMesh.geometry.dispose();  (connMesh.material as InstanceType<typeof THREE.ShaderMaterial>).dispose() }

        // Nodes geometry
        const nPos: number[] = [], nType: number[] = [], nSize: number[] = [], nCol: number[] = [], nDist: number[] = []
        nodes.forEach(nd => {
          nPos.push(nd.position.x, nd.position.y, nd.position.z)
          nType.push(nd.type); nSize.push(nd.size); nDist.push(nd.distanceFromRoot)
          const c = palette[Math.min(nd.level, palette.length - 1)].clone()
          c.offsetHSL((Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08)
          nCol.push(c.r, c.g, c.b)
        })
        const ng = new THREE.BufferGeometry()
        ng.setAttribute("position", new THREE.Float32BufferAttribute(nPos, 3))
        ng.setAttribute("nodeType", new THREE.Float32BufferAttribute(nType, 1))
        ng.setAttribute("nodeSize", new THREE.Float32BufferAttribute(nSize, 1))
        ng.setAttribute("nodeColor", new THREE.Float32BufferAttribute(nCol, 3))
        ng.setAttribute("distanceFromRoot", new THREE.Float32BufferAttribute(nDist, 1))
        const nm = new THREE.ShaderMaterial({ uniforms: makePulseUniforms(), vertexShader: NODE_VERT, fragmentShader: NODE_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
        palette.forEach((c, i) => { if (i < 3) nm.uniforms.uPulseColors.value[i].copy(c) })
        nodesMesh = new THREE.Points(ng, nm); scene.add(nodesMesh)

        // Connections geometry
        const cPos: number[] = [], cSt: number[] = [], cEn: number[] = [], cStr: number[] = [], cCol: number[] = [], cPi: number[] = []
        const seen = new Set<string>()
        let pi = 0
        nodes.forEach((nd, ni) => {
          nd.connections.forEach(({ node: cn, strength }) => {
            const ci = nodes.indexOf(cn); if (ci < 0) return
            const key = [Math.min(ni, ci), Math.max(ni, ci)].join("-")
            if (seen.has(key)) return; seen.add(key)
            const segs = 20
            for (let s = 0; s < segs; s++) {
              const t = s / (segs - 1)
              cPos.push(t, 0, 0)
              cSt.push(nd.position.x, nd.position.y, nd.position.z)
              cEn.push(cn.position.x, cn.position.y, cn.position.z)
              cPi.push(pi); cStr.push(strength)
              const avg = Math.min(Math.floor((nd.level + cn.level) / 2), palette.length - 1)
              const c = palette[avg % palette.length].clone()
              c.offsetHSL((Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08)
              cCol.push(c.r, c.g, c.b)
            }
            pi++
          })
        })
        const cg = new THREE.BufferGeometry()
        cg.setAttribute("position", new THREE.Float32BufferAttribute(cPos, 3))
        cg.setAttribute("startPoint", new THREE.Float32BufferAttribute(cSt, 3))
        cg.setAttribute("endPoint", new THREE.Float32BufferAttribute(cEn, 3))
        cg.setAttribute("connectionStrength", new THREE.Float32BufferAttribute(cStr, 1))
        cg.setAttribute("connectionColor", new THREE.Float32BufferAttribute(cCol, 3))
        cg.setAttribute("pathIndex", new THREE.Float32BufferAttribute(cPi, 1))
        const cm = new THREE.ShaderMaterial({ uniforms: makePulseUniforms(), vertexShader: CONN_VERT, fragmentShader: CONN_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
        palette.forEach((c, i) => { if (i < 3) cm.uniforms.uPulseColors.value[i].copy(c) })
        connMesh = new THREE.LineSegments(cg, cm); scene.add(connMesh)
      }

      // ── Click → pulse ──────────────────────────────────────────────────────
      const raycaster = new THREE.Raycaster()
      const ptr = new THREE.Vector2()
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
      const hit = new THREE.Vector3()
      let lastPulse = 0
      const clock = new THREE.Clock()

      function triggerPulse(cx: number, cy: number) {
        const rect = canvas.getBoundingClientRect()
        ptr.x = ((cx - rect.left) / rect.width) * 2 - 1
        ptr.y = -((cy - rect.top) / rect.height) * 2 + 1
        raycaster.setFromCamera(ptr, camera)
        plane.normal.copy(camera.position).normalize()
        plane.constant = -plane.normal.dot(camera.position) + camera.position.length() * 0.5
        if (!raycaster.ray.intersectPlane(plane, hit)) return
        const t = clock.getElapsedTime()
        lastPulse = (lastPulse + 1) % 3
        const col = palette[Math.floor(Math.random() * palette.length)]
        if (nodesMesh) {
          const u = (nodesMesh.material as InstanceType<typeof THREE.ShaderMaterial>).uniforms
          u.uPulsePositions.value[lastPulse].copy(hit)
          u.uPulseTimes.value[lastPulse] = t
          u.uPulseColors.value[lastPulse].copy(col)
        }
        if (connMesh) {
          const u = (connMesh.material as InstanceType<typeof THREE.ShaderMaterial>).uniforms
          u.uPulsePositions.value[lastPulse].copy(hit)
          u.uPulseTimes.value[lastPulse] = t
          u.uPulseColors.value[lastPulse].copy(col)
        }
      }

      canvas.addEventListener("click", (e) => { if (running) triggerPulse(e.clientX, e.clientY) })
      canvas.addEventListener("touchstart", (e) => {
        if (!running || !e.touches[0]) return
        e.preventDefault()
        triggerPulse(e.touches[0].clientX, e.touches[0].clientY)
      }, { passive: false })

      // ── Resize ─────────────────────────────────────────────────────────────
      function onResize() {
        W = container.offsetWidth
        H = container.offsetHeight || 600
        camera.aspect = W / H
        camera.updateProjectionMatrix()
        renderer.setSize(W, H)
        composer.setSize(W, H)
        bloom.resolution.set(W, H)
      }
      const ro = new ResizeObserver(onResize)
      ro.observe(container)

      // ── Animation loop ─────────────────────────────────────────────────────
      function loop() {
        if (!running) return
        const t = clock.getElapsedTime()
        if (nodesMesh) {
          const u = (nodesMesh.material as InstanceType<typeof THREE.ShaderMaterial>).uniforms
          u.uTime.value = t
          nodesMesh.rotation.y = Math.sin(t * 0.04) * 0.05
        }
        if (connMesh) {
          const u = (connMesh.material as InstanceType<typeof THREE.ShaderMaterial>).uniforms
          u.uTime.value = t
          connMesh.rotation.y = Math.sin(t * 0.04) * 0.05
        }
        controls.update()
        composer.render()
        animId = requestAnimationFrame(loop)
      }

      function start() { if (running) return; running = true; loop() }
      function stop()  { running = false; cancelAnimationFrame(animId) }

      // ── IntersectionObserver — only animate when section is on screen ──────
      const io = new IntersectionObserver(
        (entries) => { entries[0].isIntersecting ? start() : stop() },
        { threshold: 0.05 }
      )
      io.observe(container)

      // ── Init ───────────────────────────────────────────────────────────────
      buildMeshes(generateNetwork())

      threeCleanup = () => {
        stop(); io.disconnect(); ro.disconnect()
        if (nodesMesh) { scene.remove(nodesMesh); nodesMesh.geometry.dispose(); (nodesMesh.material as InstanceType<typeof THREE.ShaderMaterial>).dispose() }
        if (connMesh)  { scene.remove(connMesh);  connMesh.geometry.dispose();  (connMesh.material as InstanceType<typeof THREE.ShaderMaterial>).dispose() }
        renderer.dispose()
        controls.dispose()
      }
    }).catch(console.error)

    return () => {
      disposed = true
      threeCleanup?.()
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block" }}
      aria-hidden="true"
    />
  )
}
