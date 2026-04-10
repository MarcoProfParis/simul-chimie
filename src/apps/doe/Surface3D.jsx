// ─── Surface3D.jsx v3 ─────────────────────────────────────────────────────────
// Canvas 2D pur — aucune dépendance externe
// Fixes : canvas noir, pan souris/tactile, boutons +/−/reset, réponse vers le haut

import React, { useRef, useEffect, useState, useCallback } from "react";
import { ArrowPathIcon, PlusIcon, MinusIcon } from "@heroicons/react/24/outline";

function getColor(t) {
  const stops = [[0,[30,80,160]],[0.25,[30,180,180]],[0.5,[50,180,60]],[0.75,[220,200,30]],[1,[210,50,30]]];
  let lo = stops[0], hi = stops[stops.length-1];
  for (let i = 0; i < stops.length-1; i++) {
    if (t >= stops[i][0] && t <= stops[i+1][0]) { lo=stops[i]; hi=stops[i+1]; break; }
  }
  const f = (t - lo[0]) / (hi[0] - lo[0] || 1);
  return lo[1].map((c,i) => Math.round(c + f*(hi[1][i]-c)));
}

function project(x, y, z, rotX, rotY, zoom, cx, cy, panX, panY) {
  const cosY=Math.cos(rotY), sinY=Math.sin(rotY);
  const x1=x*cosY-z*sinY, z1=x*sinY+z*cosY;
  const cosX=Math.cos(rotX), sinX=Math.sin(rotX);
  const y2=y*cosX-z1*sinX, z2=y*sinX+z1*cosX;
  const fov=3+zoom, scale=fov/(fov+z2+2);
  return { sx: cx+x1*scale*115*zoom+panX, sy: cy+y2*scale*115*zoom+panY, depth: z2 };
}

const INIT = { rotX:0.42, rotY:0.58, zoom:1.0, panX:0, panY:0 };

export default function Surface3D({ model, fit, factors, col, response }) {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);
  const stateRef  = useRef({ ...INIT, dragging:false, panning:false, lastX:0, lastY:0, lastDist:null, lastMidX:0, lastMidY:0 });
  const animRef   = useRef(null);
  const gridRef   = useRef(null); // grille mémorisée pour le hit-test au clic

  const contFactors = factors.filter(f => f.continuous);
  const [f1Idx, setF1Idx] = useState(0);
  const [f2Idx, setF2Idx] = useState(Math.min(1, contFactors.length-1));
  const [fixedVals, setFixedVals] = useState(() => {
    const fv={}; factors.forEach(f=>{fv[f.id]=0;}); return fv;
  });
  const [pickedPoint, setPickedPoint] = useState(null); // point sélectionné au clic

  const fa = contFactors[f1Idx] || contFactors[0];
  const fb = contFactors[f2Idx] || contFactors[Math.min(1,contFactors.length-1)];

  const predict = useCallback((c1, c2) => {
    if (!fit || !model) return 0;
    const coded = { ...fixedVals, [fa?.id]: c1, [fb?.id]: c2 };
    let y = fit.coeffs[0];
    model.terms.forEach((t, i) => {
      let val;
      // Terme quadratique pur : encodé id + "2" (ex: "X12" = X1²)
      const quadFactor = factors.find(fac => t === fac.id + "2");
      if (quadFactor) {
        val = (coded[quadFactor.id] ?? 0) ** 2;
      } else {
        // Termes linéaires et interactions
        const tf = factors.filter(fac => t.includes(fac.id));
        val = tf.reduce((p, fac) => p * (coded[fac.id] ?? 0), 1);
      }
      y += fit.coeffs[i + 1] * val;
    });
    return y;
  }, [fit, model, factors, fa, fb, fixedVals]);

  const draw = useCallback(() => {
    const canvas=canvasRef.current, wrap=wrapRef.current;
    if (!canvas||!wrap||!fa||!fb) return;

    // Dimensionner le canvas sur le wrapper — clé du fix "canvas noir"
    const dpr=window.devicePixelRatio||1;
    const W=wrap.clientWidth, H=wrap.clientHeight;
    if (!W||!H) return;
    canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);

    const ctx=canvas.getContext("2d");
    ctx.save(); ctx.scale(dpr,dpr);
    ctx.clearRect(0,0,W,H);

    const {rotX,rotY,zoom,panX,panY}=stateRef.current;
    const cx=W/2, cy=H/2;
    const proj=(x,y,z)=>project(x,y,z,rotX,rotY,zoom,cx,cy,panX,panY);
    const gl=(ax,ay,az,bx,by,bz)=>{
      const a=proj(ax,ay,az),b=proj(bx,by,bz);
      ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.stroke();
    };

    const GRID=24, N=5;
    const grid=[];
    let zMin=Infinity, zMax=-Infinity;
    for (let i=0;i<=GRID;i++){
      grid[i]=[];
      for (let j=0;j<=GRID;j++){
        const z=predict(-1+2*i/GRID,-1+2*j/GRID);
        grid[i][j]=z; if(z<zMin)zMin=z; if(z>zMax)zMax=z;
      }
    }
    const zR=zMax-zMin||1;
    // Mémoriser la grille pour le hit-test au clic
    gridRef.current = { grid, zMin, zR, GRID, rotX, rotY, zoom, panX, panY, W, H };
    const toW=(i,j)=>({x:-1+2*i/GRID, y:-((grid[i][j]-zMin)/zR-0.5), z:-1+2*j/GRID});

    // Grilles des 3 plans
    // Le plan sol (XZ) couvre X∈[−1,+1] et Z∈[−1,+1] → largeur 2
    // Les murs (XY et YZ) doivent avoir la même hauteur effective :
    // Y va de +0.5 (bas, valeur min) à −0.5 (haut, valeur max) → hauteur 1
    // Pour que les cases soient carrées, on double les subdivisions verticales des murs
    ctx.strokeStyle="rgba(160,170,200,0.35)"; ctx.lineWidth=0.7;

    // Plan sol (XZ) à y = +0.5 — N subdivisions, cases carrées
    for(let k=0;k<=N;k++){
      const t=-1+2*k/N;
      gl(t, 0.5,-1, t, 0.5, 1);   // lignes || Z
      gl(-1,0.5, t, 1, 0.5, t);   // lignes || X
    }

    // Plan mur arrière (XY) à z = −1
    // X ∈ [−1,+1] → N subdivisions · Y ∈ [+0.5,−0.5] → N/2 subdivisions (cases carrées)
    for(let k=0;k<=N;k++){
      const t=-1+2*k/N;
      gl(t, 0.5,-1, t,-0.5,-1);                  // lignes || Y (verticales)
      const y = 0.5 - k/N;                        // Y de +0.5 à -0.5 en N pas
      gl(-1, y,-1, 1, y,-1);                      // lignes || X (horizontales)
    }

    // Plan mur latéral (YZ) à x = −1
    // Z ∈ [−1,+1] → N subdivisions · Y ∈ [+0.5,−0.5] → N/2 subdivisions (cases carrées)
    for(let k=0;k<=N;k++){
      const t=-1+2*k/N;
      gl(-1, 0.5,t,-1,-0.5, t);                   // lignes || Y (verticales)
      const y = 0.5 - k/N;                         // Y de +0.5 à -0.5 en N pas
      gl(-1, y,-1,-1, y, 1);                       // lignes || Z (horizontales)
    }

    // Surface
    const faces=[];
    for(let i=0;i<GRID;i++)for(let j=0;j<GRID;j++){
      const pts=[toW(i,j),toW(i+1,j),toW(i+1,j+1),toW(i,j+1)];
      const pr=pts.map(p=>proj(p.x,p.y,p.z));
      const avg=pr.reduce((s,p)=>s+p.depth,0)/4;
      const zV=(grid[i][j]+grid[i+1][j]+grid[i+1][j+1]+grid[i][j+1])/4;
      faces.push({pr,avg,t:(zV-zMin)/zR});
    }
    faces.sort((a,b)=>a.avg-b.avg);
    faces.forEach(({pr,t})=>{
      const[r,g,b]=getColor(t);
      ctx.beginPath();ctx.moveTo(pr[0].sx,pr[0].sy);
      for(let k=1;k<pr.length;k++)ctx.lineTo(pr[k].sx,pr[k].sy);
      ctx.closePath(); ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.12)"; ctx.lineWidth=0.3; ctx.stroke();
    });

    // Arêtes boîte
    ctx.strokeStyle="rgba(130,140,175,0.55)"; ctx.lineWidth=1;
    [[-1,0.5,-1],[1,0.5,-1],[1,0.5,1],[-1,0.5,1]].forEach((p,i,arr)=>{
      const a=proj(...p),b=proj(...arr[(i+1)%4]);
      ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.stroke();
    });
    gl(-1,0.5,-1,-1,-0.5,-1);
    // Axes avec flèches
    const axis=(x1,y1,z1,x2,y2,z2,lbl,color)=>{
      const f=proj(x1,y1,z1),t=proj(x2,y2,z2);
      ctx.beginPath();ctx.moveTo(f.sx,f.sy);ctx.lineTo(t.sx,t.sy);
      ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.stroke();
      const dx=t.sx-f.sx,dy=t.sy-f.sy,len=Math.sqrt(dx*dx+dy*dy)||1;
      const nx=dx/len,ny=dy/len;
      ctx.beginPath();ctx.moveTo(t.sx,t.sy);
      ctx.lineTo(t.sx-nx*8-ny*4,t.sy-ny*8+nx*4);
      ctx.lineTo(t.sx-nx*8+ny*4,t.sy-ny*8-nx*4);
      ctx.closePath();ctx.fillStyle=color;ctx.fill();
      ctx.fillStyle=color;ctx.font="bold 11px monospace";
      ctx.fillText(lbl,t.sx+6,t.sy+4);
    };
    axis(-1,0.5,-1,1.45,0.5,-1,fa.name||fa.id,"#6366f1");
    axis(-1,0.5,-1,-1,0.5,1.45,fb.name||fb.id,"#10b981");
    // Axe Z : même longueur que X et Y (1.45), label = nom de la réponse
    const zLabel = response ? `${response.name||response.id}${response.unit?` (${response.unit})`:""} ↑` : "Y ↑";
    axis(-1,0.5,-1,-1,-1.45,-1, zLabel, "#f59e0b");

    // Graduations Z
    ctx.strokeStyle="rgba(100,120,160,0.4)";ctx.lineWidth=0.7;
    [0,0.25,0.5,0.75,1].forEach(t=>{
      const p=proj(-1,-(t-0.5),-1);
      ctx.fillStyle="#8899bb";ctx.font="9px monospace";ctx.textAlign="right";
      ctx.fillText((zMin+t*zR).toFixed(1),p.sx-6,p.sy+3);
      gl(-1,-(t-0.5),-1,-1.07,-(t-0.5),-1);
    });

    // Graduations X
    [-1,-0.5,0,0.5,1].forEach(t=>{
      const p=proj(t,0.5,-1.12);
      const mid=(fa.low.real+fa.high.real)/2,half=(fa.high.real-fa.low.real)/2;
      ctx.fillStyle="#6366f1";ctx.font="8px monospace";ctx.textAlign="center";
      ctx.fillText((mid+t*half).toFixed(1)+(fa.unit?` ${fa.unit}`:""),p.sx,p.sy+10);
    });

    // Graduations Y
    [-1,-0.5,0,0.5,1].forEach(t=>{
      const p=proj(-1.1,0.5,t);
      const mid=(fb.low.real+fb.high.real)/2,half=(fb.high.real-fb.low.real)/2;
      ctx.fillStyle="#10b981";ctx.font="8px monospace";ctx.textAlign="right";
      ctx.fillText((mid+t*half).toFixed(1)+(fb.unit?` ${fb.unit}`:""),p.sx-4,p.sy+4);
    });
    ctx.textAlign="left";

    // Barre de couleur
    const bx=W-20,by=16,bh=H-44;
    for(let i=0;i<bh;i++){
      const[r,g,b]=getColor(1-i/bh);
      ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fillRect(bx,by+i,10,1);
    }
    ctx.strokeStyle="#c0c8e0";ctx.lineWidth=0.5;ctx.strokeRect(bx,by,10,bh);
    ctx.fillStyle="#64748b";ctx.font="8px monospace";ctx.textAlign="right";
    ctx.fillText(zMax.toFixed(1),bx-2,by+8);
    ctx.fillText(((zMin+zMax)/2).toFixed(1),bx-2,by+bh/2+4);
    ctx.fillText(zMin.toFixed(1),bx-2,by+bh-2);
    ctx.textAlign="left";
    ctx.restore();
  },[predict,fa,fb]);

  const redraw=useCallback(()=>{
    if(animRef.current)cancelAnimationFrame(animRef.current);
    animRef.current=requestAnimationFrame(draw);
  },[draw]);

  const reset=()=>{ Object.assign(stateRef.current,INIT); redraw(); };
  const zoomIn=()=>{ stateRef.current.zoom=Math.min(2.5,stateRef.current.zoom+0.15); redraw(); };
  const zoomOut=()=>{ stateRef.current.zoom=Math.max(0.3,stateRef.current.zoom-0.15); redraw(); };

  // Montage avec délais pour laisser le layout s'établir
  useEffect(()=>{
    const wrap=wrapRef.current; if(!wrap) return;
    const ro=new ResizeObserver(()=>redraw());
    ro.observe(wrap);
    const t1=setTimeout(redraw,30);
    const t2=setTimeout(redraw,150);
    const t3=setTimeout(redraw,400);
    return ()=>{ ro.disconnect(); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  },[redraw]);

  useEffect(()=>{ redraw(); },[redraw,f1Idx,f2Idx,fixedVals]);

  // Souris — clic gauche = rotation, clic droit / ctrl = pan
  const onMouseDown=(e)=>{
    e.preventDefault();
    const isPan=e.button===2||e.ctrlKey;
    stateRef.current.dragging=!isPan; stateRef.current.panning=isPan;
    stateRef.current.lastX=e.clientX; stateRef.current.lastY=e.clientY;
    stateRef.current._wasDragging=false; // reset à chaque nouveau clic
  };
  const onMouseMove=(e)=>{
    const{dragging,panning}=stateRef.current; if(!dragging&&!panning) return;
    stateRef.current._wasDragging=true; // marque qu'on a bougé
    const dx=e.clientX-stateRef.current.lastX, dy=e.clientY-stateRef.current.lastY;
    if(dragging){stateRef.current.rotY+=dx*0.008;stateRef.current.rotX+=dy*0.008;}
    if(panning){stateRef.current.panX+=dx;stateRef.current.panY+=dy;}
    stateRef.current.lastX=e.clientX;stateRef.current.lastY=e.clientY;
    redraw();
  };
  const onMouseUp=()=>{stateRef.current.dragging=false;stateRef.current.panning=false;};
  const onContextMenu=(e)=>e.preventDefault();
  const onWheel=(e)=>{
    e.preventDefault();
    stateRef.current.zoom=Math.max(0.3,Math.min(2.5,stateRef.current.zoom-e.deltaY*0.001));
    redraw();
  };

  // Tactile — 1 doigt = rotation, 2 doigts = zoom + pan
  const onTouchStart=(e)=>{
    e.preventDefault();
    if(e.touches.length===1){
      stateRef.current.dragging=true; stateRef.current.panning=false;
      stateRef.current.lastX=e.touches[0].clientX; stateRef.current.lastY=e.touches[0].clientY;
      stateRef.current.lastDist=null;
    } else if(e.touches.length===2){
      stateRef.current.dragging=false;
      const dx=e.touches[0].clientX-e.touches[1].clientX;
      const dy=e.touches[0].clientY-e.touches[1].clientY;
      stateRef.current.lastDist=Math.sqrt(dx*dx+dy*dy);
      stateRef.current.lastMidX=(e.touches[0].clientX+e.touches[1].clientX)/2;
      stateRef.current.lastMidY=(e.touches[0].clientY+e.touches[1].clientY)/2;
    }
  };
  const onTouchMove=(e)=>{
    e.preventDefault();
    if(e.touches.length===1&&stateRef.current.dragging){
      const dx=e.touches[0].clientX-stateRef.current.lastX;
      const dy=e.touches[0].clientY-stateRef.current.lastY;
      stateRef.current.rotY+=dx*0.008; stateRef.current.rotX+=dy*0.008;
      stateRef.current.lastX=e.touches[0].clientX; stateRef.current.lastY=e.touches[0].clientY;
      redraw();
    } else if(e.touches.length===2){
      const dx=e.touches[0].clientX-e.touches[1].clientX;
      const dy=e.touches[0].clientY-e.touches[1].clientY;
      const dist=Math.sqrt(dx*dx+dy*dy);
      const midX=(e.touches[0].clientX+e.touches[1].clientX)/2;
      const midY=(e.touches[0].clientY+e.touches[1].clientY)/2;
      if(stateRef.current.lastDist!==null){
        stateRef.current.zoom=Math.max(0.3,Math.min(2.5,stateRef.current.zoom+(dist-stateRef.current.lastDist)*0.005));
        stateRef.current.panX+=midX-stateRef.current.lastMidX;
        stateRef.current.panY+=midY-stateRef.current.lastMidY;
      }
      stateRef.current.lastDist=dist;
      stateRef.current.lastMidX=midX; stateRef.current.lastMidY=midY;
      redraw();
    }
  };
  const onTouchEnd=()=>{stateRef.current.dragging=false;stateRef.current.lastDist=null;};

  // Clic sur la surface → afficher les coordonnées du point le plus proche
  const onCanvasClick = (e) => {
    // Ne déclencher que si la souris n'a pas bougé (pas un drag)
    if (stateRef.current._wasDragging) { stateRef.current._wasDragging = false; return; }
    const g = gridRef.current;
    if (!g || !fa || !fb) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const { grid, zMin, zR, GRID, rotX, rotY, zoom, panX, panY, W, H } = g;
    const cx = W / 2, cy = H / 2;
    let bestDist = Infinity, bestI = 0, bestJ = 0;
    for (let i = 0; i <= GRID; i++) {
      for (let j = 0; j <= GRID; j++) {
        const xw = -1 + 2*i/GRID;
        const yw = -((grid[i][j]-zMin)/zR - 0.5);
        const zw = -1 + 2*j/GRID;
        const p = project(xw, yw, zw, rotX, rotY, zoom, cx, cy, panX, panY);
        const dist = (p.sx - clickX)**2 + (p.sy - clickY)**2;
        if (dist < bestDist) { bestDist = dist; bestI = i; bestJ = j; }
      }
    }
    const c1 = -1 + 2*bestI/GRID;
    const c2 = -1 + 2*bestJ/GRID;
    const z  = grid[bestI][bestJ];
    const midX = (fa.low.real+fa.high.real)/2, halfX = (fa.high.real-fa.low.real)/2;
    const midY = (fb.low.real+fb.high.real)/2, halfY = (fb.high.real-fb.low.real)/2;
    setPickedPoint({
      c1, c2, z,
      realX: +(midX + c1*halfX).toFixed(2),
      realY: +(midY + c2*halfY).toFixed(2),
    });
  };

  if(!fa||!fb||!fit) return(
    <div className="text-sm text-gray-400 p-4">Besoin d'au moins 2 facteurs continus et un modèle calculé.</div>
  );

  const toReal=(f,v)=>{
    const mid=(f.low.real+f.high.real)/2,half=(f.high.real-f.low.real)/2;
    return (mid+v*half).toFixed(2);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Sélecteurs si > 2 facteurs */}
      {contFactors.length>2&&(
        <div className="flex flex-wrap gap-3">
          {[["Axe X",f1Idx,setF1Idx],["Axe Y",f2Idx,setF2Idx]].map(([lbl,val,set])=>(
            <div key={lbl} className="flex items-center gap-2">
              <label className="text-xs text-gray-500">{lbl} :</label>
              <select value={val} onChange={e=>set(+e.target.value)}
                className="text-xs rounded border border-gray-200 dark:border-gray-700 px-2 py-1 bg-white dark:bg-gray-900">
                {contFactors.map((f,i)=><option key={f.id} value={i}>{f.name||f.id}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Facteurs fixes */}
      {contFactors.filter(f=>f.id!==fa.id&&f.id!==fb.id).map(f=>(
        <div key={f.id} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-24 truncate">{f.name||f.id} fixé :</span>
          <input type="range" min="-1" max="1" step="0.1"
            value={fixedVals[f.id]??0}
            onChange={e=>setFixedVals(v=>({...v,[f.id]:+e.target.value}))}
            className="flex-1"/>
          <span className="text-xs font-mono text-gray-400 w-32 text-right">
            {toReal(f,fixedVals[f.id]??0)}{f.unit?` ${f.unit}`:""} ({(fixedVals[f.id]??0).toFixed(1)})
          </span>
        </div>
      ))}

      {/* Canvas */}
      <div ref={wrapRef}
           className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
           style={{aspectRatio:"4/3",minHeight:"240px"}}>
        <canvas
          ref={canvasRef}
          style={{position:"absolute",inset:0,width:"100%",height:"100%",
                  display:"block",touchAction:"none",cursor:"grab"}}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove}
          onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onContextMenu={onContextMenu} onWheel={onWheel}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          onClick={onCanvasClick}
        />

        {/* Boutons superposés */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10">
          <button onClick={reset} title="Réinitialiser"
            className="size-7 rounded-md bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-600
                       flex items-center justify-center text-gray-500 dark:text-gray-300
                       hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-colors">
            <ArrowPathIcon className="size-3.5"/>
          </button>
          <button onClick={zoomIn} title="Zoom +"
            className="size-7 rounded-md bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-600
                       flex items-center justify-center text-gray-500 dark:text-gray-300
                       hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-colors">
            <PlusIcon className="size-3.5"/>
          </button>
          <button onClick={zoomOut} title="Zoom −"
            className="size-7 rounded-md bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-600
                       flex items-center justify-center text-gray-500 dark:text-gray-300
                       hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-colors">
            <MinusIcon className="size-3.5"/>
          </button>
        </div>

        <div className="absolute bottom-2 left-2 text-[9px] text-gray-400
                        bg-white/75 dark:bg-gray-900/80 rounded px-2 py-1 leading-4 z-10">
          🖱 Gauche = rotation · Droit = déplacer · Molette = zoom<br/>
          📱 1 doigt = rotation · 2 doigts = zoom &amp; déplacer
        </div>
      </div>

      {/* ── Point sélectionné au clic ── */}
      {pickedPoint ? (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-xs flex-1">
              <div>
                <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {fa.name||fa.id}
                </span>
                <p className="font-mono font-semibold text-indigo-700 dark:text-indigo-300">
                  {pickedPoint.realX}{fa.unit?` ${fa.unit}`:""}
                  <span className="font-normal text-gray-400 ml-1">({pickedPoint.c1.toFixed(2)})</span>
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {fb.name||fb.id}
                </span>
                <p className="font-mono font-semibold text-indigo-700 dark:text-indigo-300">
                  {pickedPoint.realY}{fb.unit?` ${fb.unit}`:""}
                  <span className="font-normal text-gray-400 ml-1">({pickedPoint.c2.toFixed(2)})</span>
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {response?.name||"Y"} prédit
                </span>
                <p className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                  {pickedPoint.z.toFixed(2)}{response?.unit?` ${response.unit}`:""}
                </p>
              </div>
            </div>
            <button onClick={()=>setPickedPoint(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors mt-0.5 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4">
                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"/>
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
            Cliquez n'importe où sur la surface pour lire les coordonnées
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
          👆 Cliquez sur la surface pour obtenir les coordonnées d'un point
        </p>
      )}
      <div className="flex flex-wrap gap-4 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-indigo-500 rounded"/>
          X : {fa.name||fa.id} [{toReal(fa,-1)} → {toReal(fa,1)}{fa.unit?` ${fa.unit}`:""}]
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-emerald-500 rounded"/>
          Y : {fb.name||fb.id} [{toReal(fb,-1)} → {toReal(fb,1)}{fb.unit?` ${fb.unit}`:""}]
        </span>
        {response && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 bg-amber-500 rounded"/>
            Z ↑ : {response.name||response.id}{response.unit?` (${response.unit})`:""}
          </span>
        )}
      </div>
    </div>
  );
}
