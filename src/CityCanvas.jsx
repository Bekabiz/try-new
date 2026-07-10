import { useEffect, useRef } from 'react';

const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const norm = (v) => {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x/l, y: v.y/l, z: v.z/l };
};
const cross = (a,b) => ({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const dot = (a,b) => a.x*b.x+a.y*b.y+a.z*b.z;

function seeded(seed) {
  let s = seed % 2147483647;
  return () => ((s = s * 16807 % 2147483647) - 1) / 2147483646;
}

function makeCity() {
  const rnd = seeded(28191);
  const buildings = [];
  const cols = 10;
  const rows = 17;
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if ((x === 4 || x === 5) && z % 4 !== 1) continue;
      if (z === 7 && x > 1 && x < 8) continue;
      const px = (x - (cols-1)/2) * 118 + (rnd()-.5)*22;
      const pz = z * 120 + (rnd()-.5)*22;
      const centerBoost = 1 - Math.min(1, Math.abs(px)/620);
      let h = 60 + rnd()*170 + centerBoost*110;
      let w = 48 + rnd()*48;
      let d = 48 + rnd()*48;
      const special = (z === 9 && x === 5) || (z === 12 && x === 3);
      if (special) { h *= 1.55; w *= 1.15; d *= 1.15; }
      buildings.push({ x:px, z:pz, w, d, h, seed:rnd(), special, row:z });
    }
  }
  return buildings;
}

const buildings = makeCity();
const links = [
  [7,31],[31,62],[62,96],[20,54],[54,83],[83,124],[12,43],[43,78],[78,113],
  [4,36],[36,68],[68,102],[24,57],[57,90],[90,132],[46,74],[74,106]
].filter(([a,b]) => buildings[a] && buildings[b]);

export default function CityCanvas({ progressRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    let raf = 0;
    let running = true;
    let mx = 0, my = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.7);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.7);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const pointer = (e) => {
      mx = (e.clientX / window.innerWidth - .5) * 2;
      my = (e.clientY / window.innerHeight - .5) * 2;
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', pointer, { passive:true });

    const projectFactory = (cam, target, width, height) => {
      const forward = norm({x:target.x-cam.x,y:target.y-cam.y,z:target.z-cam.z});
      let right = norm(cross(forward,{x:0,y:1,z:0}));
      const up = norm(cross(right,forward));
      const focal = Math.min(width,height) * 1.03;
      return (p) => {
        const delta = {x:p.x-cam.x,y:p.y-cam.y,z:p.z-cam.z};
        const x = dot(delta,right), y = dot(delta,up), z = dot(delta,forward);
        if (z < 20) return null;
        return { x:width/2 + x*focal/z, y:height*.53 - y*focal/z, z, scale:focal/z };
      };
    };

    const path = (points, fill, stroke, alpha=1, lineWidth=1) => {
      const good = points.filter(Boolean);
      if (good.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(good[0].x,good[0].y);
      for(let i=1;i<good.length;i++) ctx.lineTo(good[i].x,good[i].y);
      ctx.closePath();
      ctx.globalAlpha = alpha;
      if(fill){ctx.fillStyle=fill;ctx.fill();}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
      ctx.globalAlpha = 1;
    };

    const draw = (time) => {
      if(!running) return;
      const width = canvas.clientWidth, height = canvas.clientHeight;
      ctx.clearRect(0,0,width,height);
      const rawP = reduced ? .22 : clamp(progressRef.current || 0);
      const p = ease(rawP);
      const intro = clamp(rawP/.22);
      const travel = clamp((rawP-.12)/.88);

      const cam = {
        x: mix(-20, 120, travel) + mx*35*(1-travel*.65),
        y: mix(520, 120, travel) + my*18,
        z: mix(-930, 1030, travel)
      };
      const target = {
        x: mix(0, -35, travel),
        y: mix(70, 95, travel),
        z: mix(620, 1450, travel)
      };
      const project = projectFactory(cam,target,width,height);

      const bg = ctx.createRadialGradient(width*.63,height*.47,10,width*.63,height*.47,Math.max(width,height)*.72);
      bg.addColorStop(0,`rgba(0,130,124,${.18 + intro*.07})`);
      bg.addColorStop(.36,'rgba(1,55,52,.16)');
      bg.addColorStop(1,'rgba(1,29,28,0)');
      ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);

      // atmospheric particles
      ctx.globalCompositeOperation='lighter';
      for(let i=0;i<65;i++){
        const sx = ((i*193 + time*.009*(1+i%3)) % (width+120))-60;
        const sy = ((i*83 + Math.sin(time*.00035+i)*80) % (height+80))-40;
        const a = .08 + (i%7)*.018;
        ctx.fillStyle=`rgba(203,255,252,${a})`;
        ctx.beginPath();ctx.arc(sx,sy,(i%4===0?1.5:.8),0,Math.PI*2);ctx.fill();
      }
      ctx.globalCompositeOperation='source-over';

      // horizon glow
      const horizon = project({x:0,y:0,z:1900});
      if(horizon){
        const hg=ctx.createRadialGradient(horizon.x,horizon.y,0,horizon.x,horizon.y,width*.7);
        hg.addColorStop(0,'rgba(203,255,252,.15)');hg.addColorStop(1,'rgba(203,255,252,0)');
        ctx.fillStyle=hg;ctx.fillRect(0,0,width,height);
      }

      // ground plane and roads
      const groundAlpha = .16 + intro*.22;
      for(let x=-720;x<=720;x+=118){
        const a=project({x,y:0,z:-30}), b=project({x,y:0,z:2200});
        if(a&&b){ctx.strokeStyle=`rgba(122,218,208,${groundAlpha*(Math.abs(x)<100?1.4:.7)})`;ctx.lineWidth=Math.abs(x)<100?1.25:.6;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
      }
      for(let z=0;z<=2200;z+=120){
        const a=project({x:-720,y:0,z}), b=project({x:720,y:0,z});
        if(a&&b){ctx.strokeStyle=`rgba(122,218,208,${groundAlpha*.72})`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
      }
      // bright central transit path
      const roadA=project({x:-18,y:1,z:-40}),roadB=project({x:-18,y:1,z:2250});
      const roadC=project({x:18,y:1,z:-40}),roadD=project({x:18,y:1,z:2250});
      if(roadA&&roadB&&roadC&&roadD){
        ctx.strokeStyle='rgba(203,255,252,.46)';ctx.lineWidth=1;
        [[roadA,roadB],[roadC,roadD]].forEach(([a,b])=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();});
      }

      // prepare buildings, grow in waves
      const renderables=[];
      buildings.forEach((b,idx)=>{
        const grow = clamp((intro*1.28 - (b.row/17)*.36 - b.seed*.12)/.7);
        const hh = Math.max(1,b.h*ease(grow));
        const top=project({x:b.x,y:hh,z:b.z});
        const base=project({x:b.x,y:0,z:b.z});
        if(!top||!base) return;
        renderables.push({b,hh,depth:base.z,idx});
      });
      renderables.sort((a,b)=>b.depth-a.depth);

      const palette = ['#063d39','#074843','#05342f','#0a4d47'];
      renderables.forEach(({b,hh,idx,depth})=>{
        const x0=b.x-b.w/2,x1=b.x+b.w/2,z0=b.z-b.d/2,z1=b.z+b.d/2;
        const p000=project({x:x0,y:0,z:z0}),p100=project({x:x1,y:0,z:z0}),p110=project({x:x1,y:hh,z:z0}),p010=project({x:x0,y:hh,z:z0});
        const p001=project({x:x0,y:0,z:z1}),p101=project({x:x1,y:0,z:z1}),p111=project({x:x1,y:hh,z:z1}),p011=project({x:x0,y:hh,z:z1});
        if(!p000||!p100||!p110||!p010||!p001||!p101||!p111||!p011)return;
        const fade=clamp((2100-depth)/340)*clamp((depth-25)/100);
        const baseColor=palette[idx%palette.length];
        path([p000,p100,p110,p010],baseColor,'rgba(188,255,248,.13)',fade,.65);
        path([p100,p101,p111,p110],'#032b29','rgba(188,255,248,.1)',fade,.55);
        path([p010,p110,p111,p011],b.special?'#0d6861':'#0a554f','rgba(214,255,252,.22)',fade,.7);

        // roof crown / antenna
        if(b.special){
          const c=project({x:b.x,y:hh+26,z:b.z}), t=project({x:b.x,y:hh+72,z:b.z});
          if(c&&t){ctx.globalCompositeOperation='lighter';ctx.strokeStyle='rgba(203,255,252,.78)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.fillStyle='#cbfffc';ctx.beginPath();ctx.arc(t.x,t.y,2.2,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';}
        }

        // window strips drawn as projected short strokes on front face
        if(depth<1450 && hh>35){
          const floors=Math.min(13,Math.floor(hh/19));
          const bays=Math.min(5,Math.max(2,Math.floor(b.w/17)));
          for(let fy=1;fy<floors;fy++){
            for(let bx=0;bx<bays;bx++){
              if((fy*11+bx*7+idx)%5===0) continue;
              const yy=(fy/floors)*hh*.82+7;
              const xa=mix(x0+6,x1-8,bx/Math.max(1,bays-1));
              const a=project({x:xa,y:yy,z:z0-.4}),bb=project({x:xa+Math.min(8,b.w/bays*.45),y:yy,z:z0-.4});
              if(a&&bb){
                const pulse=.36+.34*Math.sin(time*.0018+idx+fy*.7);
                ctx.strokeStyle=`rgba(${idx%9===0?'250,209,255':'203,255,252'},${pulse*fade})`;
                ctx.lineWidth=Math.max(.45,Math.min(1.15,a.scale*.7));
                ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(bb.x,bb.y);ctx.stroke();
              }
            }
          }
        }
      });

      // data routes between building roofs
      if(rawP>.12){
        ctx.globalCompositeOperation='lighter';
        links.forEach(([ai,bi],li)=>{
          const a=buildings[ai],b=buildings[bi];
          const pa=project({x:a.x,y:a.h+16,z:a.z}), pb=project({x:b.x,y:b.h+16,z:b.z});
          if(!pa||!pb) return;
          const routeReveal=clamp((rawP-.12-li*.008)/.28);
          if(routeReveal<=0)return;
          const cx=(pa.x+pb.x)/2, cy=Math.min(pa.y,pb.y)-38-Math.abs(pa.x-pb.x)*.04;
          ctx.strokeStyle=`rgba(106,245,218,${.14+.25*routeReveal})`;ctx.lineWidth=.8;
          ctx.setLineDash([3,8]);ctx.lineDashOffset=-time*.02-li*4;
          ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.quadraticCurveTo(cx,cy,pb.x,pb.y);ctx.stroke();ctx.setLineDash([]);
          const tt=(time*.00015+li*.083)%1;
          const omt=1-tt;
          const qx=omt*omt*pa.x+2*omt*tt*cx+tt*tt*pb.x;
          const qy=omt*omt*pa.y+2*omt*tt*cy+tt*tt*pb.y;
          ctx.fillStyle=li%4===0?'rgba(250,209,255,.95)':'rgba(203,255,252,.95)';
          ctx.beginPath();ctx.arc(qx,qy,1.8+routeReveal,0,Math.PI*2);ctx.fill();
        });
        ctx.globalCompositeOperation='source-over';
      }

      // central intelligence core beam
      const core=buildings.reduce((best,b)=>b.h>best.h?b:best,buildings[0]);
      const cp=project({x:core.x,y:core.h+70,z:core.z});
      if(cp){
        const pulse=.5+.5*Math.sin(time*.002);
        const rg=ctx.createRadialGradient(cp.x,cp.y,0,cp.x,cp.y,42+pulse*16);
        rg.addColorStop(0,'rgba(203,255,252,.78)');rg.addColorStop(.22,'rgba(0,130,124,.3)');rg.addColorStop(1,'rgba(0,130,124,0)');
        ctx.fillStyle=rg;ctx.beginPath();ctx.arc(cp.x,cp.y,58,0,Math.PI*2);ctx.fill();
      }

      // foreground scan line and vignette
      const scanY=((time*.04)%height);
      const scan=ctx.createLinearGradient(0,scanY-35,0,scanY+35);
      scan.addColorStop(0,'rgba(203,255,252,0)');scan.addColorStop(.5,'rgba(203,255,252,.025)');scan.addColorStop(1,'rgba(203,255,252,0)');
      ctx.fillStyle=scan;ctx.fillRect(0,scanY-35,width,70);
      const vig=ctx.createRadialGradient(width/2,height/2,Math.min(width,height)*.25,width/2,height/2,Math.max(width,height)*.72);
      vig.addColorStop(0,'rgba(1,29,28,0)');vig.addColorStop(1,'rgba(1,20,19,.58)');ctx.fillStyle=vig;ctx.fillRect(0,0,width,height);

      raf=requestAnimationFrame(draw);
    };
    raf=requestAnimationFrame(draw);
    return()=>{running=false;cancelAnimationFrame(raf);window.removeEventListener('resize',resize);window.removeEventListener('pointermove',pointer);};
  },[progressRef]);

  return <canvas ref={canvasRef} className="city-canvas" aria-hidden="true" />;
}
