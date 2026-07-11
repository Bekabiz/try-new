import { useEffect, useRef } from 'react';

const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const seg = (p, a, b) => clamp((p - a) / (b - a));
const norm = (v) => { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; };
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;

function seeded(seed) {
  let s = Math.abs(Math.floor(seed)) % 2147483647;
  if (s < 2) s = 2;
  return () => ((s = s * 16807 % 2147483647) - 1) / 2147483646;
}

/* ================= CITY (realistic dusk) ================= */
const KIND = {
  glass:    { front: '#2c3a4c', side: '#212e3d', roof: '#3a4a5d', win: '207,228,255' },
  concrete: { front: '#464b53', side: '#373c43', roof: '#54595f', win: '255,215,155' },
  brick:    { front: '#4c3b31', side: '#3b2e27', roof: '#584639', win: '255,210,150' },
  stone:    { front: '#3f444e', side: '#31363e', roof: '#4c525a', win: '255,224,175' },
};
const KIND_LIST = ['glass', 'concrete', 'brick', 'stone', 'concrete', 'glass'];

function makeCity() {
  const rnd = seeded(90210);
  const bs = [];
  const cols = 10, rows = 16;
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if ((x === 4 || x === 5) && z % 5 !== 2) continue; // central avenue
      const px = (x - (cols - 1) / 2) * 122 + (rnd() - .5) * 26;
      const pz = z * 132 + (rnd() - .5) * 26;
      const centerBoost = 1 - Math.min(1, Math.abs(px) / 640);
      let h = 55 + rnd() * 165 + centerBoost * 120;
      let w = 50 + rnd() * 46;
      let d = 50 + rnd() * 46;
      const kind = KIND_LIST[Math.floor(rnd() * KIND_LIST.length)];
      if (kind === 'glass') h *= 1.2;
      bs.push({ x: px, z: pz, w, d, h, seed: rnd(), kind, row: z, hero: false });
    }
  }
  // hero glass tower the camera flies into
  const hero = { x: 148, z: 1460, w: 130, d: 115, h: 430, seed: .42, kind: 'glass', row: 11, hero: true };
  bs.push(hero);
  return { bs, hero };
}
const { bs: CITY, hero: HERO } = makeCity();

/* ================= OFFICE data ================= */
const SHIRTS = ['#4a5560', '#6b5d52', '#546049', '#5c4f63', '#63584c', '#465a66'];
const HAIR = ['#2e2620', '#4a3826', '#171310', '#5c5148', '#3d332a'];
function makeOffice() {
  const rnd = seeded(4411);
  const desks = [];
  for (let r = 0; r < 8; r++) {
    const z = 210 + r * 168;
    [-238, 238].forEach((x, bi) => {
      desks.push({
        x, z, bank: bi === 0 ? 1 : -1, // bank sign: direction toward aisle
        person: rnd() > .3,
        shirt: SHIRTS[Math.floor(rnd() * SHIRTS.length)],
        hair: HAIR[Math.floor(rnd() * HAIR.length)],
        papers: 1 + Math.floor(rnd() * 3),
        pr: rnd(),
        hero: false,
      });
    });
  }
  const heroDesk = desks.find(d => d.x < 0 && Math.abs(d.z - 882) < 30) || desks[9];
  heroDesk.hero = true; heroDesk.person = true;
  return { desks, heroDesk };
}
const { desks: DESKS, heroDesk: HERO_DESK } = makeOffice();

const TEAL = '15,158,153';       // Evriel system color — the only unreal color in the film
const ROOM = { xw: 690, z1: 1920, ceil: 342 };

export default function SceneCanvas({ progressRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    let raf = 0, running = true, mx = 0, my = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.6);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
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
    window.addEventListener('pointermove', pointer, { passive: true });

    const projector = (cam, target, W, H) => {
      const fwd = norm({ x: target.x - cam.x, y: target.y - cam.y, z: target.z - cam.z });
      let right = norm(cross(fwd, { x: 0, y: 1, z: 0 }));
      const up = norm(cross(right, fwd));
      const focal = Math.min(W, H) * 1.05;
      return (p) => {
        const d = { x: p.x - cam.x, y: p.y - cam.y, z: p.z - cam.z };
        const x = dot(d, right), y = dot(d, up), z = dot(d, fwd);
        if (z < 18) return null;
        return { x: W / 2 + x * focal / z, y: H * .52 - y * focal / z, z, scale: focal / z };
      };
    };

    const poly = (pts, fill, stroke, alpha = 1, lw = 1) => {
      const g = pts.filter(Boolean);
      if (g.length < 3) return false;
      ctx.beginPath(); ctx.moveTo(g[0].x, g[0].y);
      for (let i = 1; i < g.length; i++) ctx.lineTo(g[i].x, g[i].y);
      ctx.closePath();
      ctx.globalAlpha = alpha;
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
      ctx.globalAlpha = 1;
      return true;
    };

    /* ---------------- CITY SCENE ---------------- */
    const drawCity = (t, time, W, H) => {
      const tr = ease(t);
      const cam = {
        x: mix(-140, HERO.x - 50, tr) + mx * 32 * (1 - tr * .7),
        y: mix(640, 195, tr) + my * 16,
        z: mix(-1000, HERO.z - 330, tr),
      };
      const target = { x: mix(0, HERO.x, tr), y: mix(120, 205, tr), z: mix(720, HERO.z, tr) };
      const project = projector(cam, target, W, H);

      // dusk sky
      const sky = ctx.createLinearGradient(0, 0, 0, H * .78);
      sky.addColorStop(0, '#0c1526');
      sky.addColorStop(.5, '#1c3050');
      sky.addColorStop(.82, '#54506a');
      sky.addColorStop(1, '#b06a45');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * .78);
      ctx.fillStyle = '#171d26'; ctx.fillRect(0, H * .78 - 1, W, H * .22 + 2);

      // stars
      const srnd = seeded(77);
      for (let i = 0; i < 46; i++) {
        const sx = srnd() * W, sy = srnd() * H * .42;
        const tw = .25 + .35 * Math.abs(Math.sin(time * .0011 + i * 2.3));
        ctx.fillStyle = `rgba(235,240,255,${tw})`;
        ctx.fillRect(sx, sy, 1.3, 1.3);
      }
      // aircraft blink
      const ax = ((time * .022) % (W + 260)) - 130, ay = H * .1;
      ctx.fillStyle = `rgba(255,120,110,${.35 + .55 * (Math.sin(time * .01) > .4 ? 1 : 0)})`;
      ctx.beginPath(); ctx.arc(ax, ay, 1.6, 0, Math.PI * 2); ctx.fill();

      // distant skyline silhouette
      const drnd = seeded(31);
      ctx.fillStyle = '#141c2b';
      for (let i = 0; i < 26; i++) {
        const bw = 26 + drnd() * 60, bh = 22 + drnd() * 64, bx = (i / 26) * W + drnd() * 20 - 10;
        ctx.fillRect(bx, H * .78 - bh, bw, bh);
      }

      // ground haze
      const haze = ctx.createLinearGradient(0, H * .55, 0, H);
      haze.addColorStop(0, 'rgba(23,29,38,0)');
      haze.addColorStop(1, 'rgba(15,19,26,.9)');
      ctx.fillStyle = haze; ctx.fillRect(0, H * .4, W, H * .6);

      // street grid (asphalt)
      for (let x = -732; x <= 732; x += 122) {
        const a = project({ x, y: 0, z: -60 }), b = project({ x, y: 0, z: 2200 });
        if (a && b) { ctx.strokeStyle = 'rgba(90,100,116,.3)'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      for (let z = 0; z <= 2200; z += 132) {
        const a = project({ x: -732, y: 0, z }), b = project({ x: 732, y: 0, z });
        if (a && b) { ctx.strokeStyle = 'rgba(90,100,116,.22)'; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      // central avenue edges + warm dashes
      [[-52], [52]].forEach(([x]) => {
        const a = project({ x, y: .5, z: -60 }), b = project({ x, y: .5, z: 2200 });
        if (a && b) { ctx.strokeStyle = 'rgba(216,196,150,.5)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      });
      const ca = project({ x: 0, y: .5, z: -60 }), cb = project({ x: 0, y: .5, z: 2200 });
      if (ca && cb) {
        ctx.strokeStyle = 'rgba(216,196,150,.4)'; ctx.lineWidth = .9;
        ctx.setLineDash([4, 10]); ctx.beginPath(); ctx.moveTo(ca.x, ca.y); ctx.lineTo(cb.x, cb.y); ctx.stroke(); ctx.setLineDash([]);
      }
      // street lamps
      for (let z = 90; z < 2100; z += 264) {
        [[-70], [70]].forEach(([x]) => {
          const p = project({ x, y: 26, z });
          if (!p) return;
          const r = Math.max(1.2, p.scale * 3);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 6);
          g.addColorStop(0, 'rgba(255,214,150,.85)'); g.addColorStop(1, 'rgba(255,214,150,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 6, 0, Math.PI * 2); ctx.fill();
        });
      }
      // cars
      for (let i = 0; i < 3; i++) {
        const zt = ((time * .11 + i * 730) % 2160);
        const toward = project({ x: -24, y: 5, z: 2160 - zt });
        if (toward) {
          ctx.fillStyle = 'rgba(255,250,235,.95)';
          const r = Math.max(.7, toward.scale * 2.4);
          ctx.beginPath(); ctx.arc(toward.x - r * 1.4, toward.y, r, 0, Math.PI * 2); ctx.arc(toward.x + r * 1.4, toward.y, r, 0, Math.PI * 2); ctx.fill();
        }
        const away = project({ x: 24, y: 5, z: (zt + 380) % 2160 });
        if (away) {
          ctx.fillStyle = 'rgba(255,80,70,.9)';
          const r = Math.max(.6, away.scale * 2);
          ctx.beginPath(); ctx.arc(away.x - r * 1.3, away.y, r, 0, Math.PI * 2); ctx.arc(away.x + r * 1.3, away.y, r, 0, Math.PI * 2); ctx.fill();
        }
      }

      // buildings (painter)
      const grow = seg(t, 0, .3);
      const renderables = [];
      CITY.forEach((b, idx) => {
        const g = clamp((grow * 1.5 - (b.row / 16) * .34 - b.seed * .1) / .8);
        const hh = Math.max(2, b.h * ease(g));
        const base = project({ x: b.x, y: 0, z: b.z });
        if (!base) return;
        renderables.push({ b, hh, depth: base.z, idx });
      });
      renderables.sort((a, b) => b.depth - a.depth);

      renderables.forEach(({ b, hh, idx, depth }) => {
        const k = KIND[b.kind];
        const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2;
        const P = (x, y, z) => project({ x, y, z });
        const fade = clamp((2150 - depth) / 320) * clamp((depth - 22) / 90);
        // front (near z), visible side, roof
        poly([P(x0, 0, z0), P(x1, 0, z0), P(x1, hh, z0), P(x0, hh, z0)], k.front, 'rgba(10,14,20,.35)', fade, .6);
        const sideX = cam.x > b.x ? x1 : x0;
        poly([P(sideX, 0, z0), P(sideX, 0, z1), P(sideX, hh, z1), P(sideX, hh, z0)], k.side, 'rgba(10,14,20,.3)', fade, .5);
        poly([P(x0, hh, z0), P(x1, hh, z0), P(x1, hh, z1), P(x0, hh, z1)], k.roof, 'rgba(10,14,20,.3)', fade, .5);
        // rooftop details: water tank / AC unit on some
        if (b.seed > .6 && depth < 1500) {
          const u0 = P(b.x - 10, hh, b.z), u1 = P(b.x + 10, hh, b.z), u2 = P(b.x + 10, hh + 12, b.z), u3 = P(b.x - 10, hh + 12, b.z);
          poly([u0, u1, u2, u3], '#2b3038', null, fade * .9);
        }
        // red beacon on tall towers
        if (b.h > 240) {
          const bp = P(b.x, hh + 6, b.z);
          if (bp) {
            const blink = Math.sin(time * .004 + idx) > .2 ? .9 : .2;
            ctx.fillStyle = `rgba(255,84,74,${blink * fade})`;
            ctx.beginPath(); ctx.arc(bp.x, bp.y, Math.max(1, bp.scale * 2), 0, Math.PI * 2); ctx.fill();
          }
        }
        // windows — warm lived-in light
        if (depth < 1700 && hh > 30) {
          const floors = Math.min(15, Math.floor(hh / 17));
          const bays = Math.min(6, Math.max(2, Math.floor(b.w / 15)));
          for (let fy = 1; fy < floors; fy++) {
            for (let bx = 0; bx < bays; bx++) {
              const lit = ((fy * 13 + bx * 7 + idx * 5) % 10) < (b.hero ? 8 : 5.6);
              if (!lit) continue;
              const yy = (fy / floors) * hh * .86 + 6;
              const xa = mix(x0 + 5, x1 - 9, bx / Math.max(1, bays - 1));
              const a = P(xa, yy, z0 - .4), bb = P(xa + Math.min(9, b.w / bays * .5), yy, z0 - .4);
              if (a && bb) {
                const warm = (fy + bx + idx) % 6 !== 0;
                const col = warm ? k.win : '205,225,255';
                const flick = .55 + .25 * Math.sin(time * .0016 + idx + fy);
                ctx.strokeStyle = `rgba(${col},${flick * fade})`;
                ctx.lineWidth = Math.max(.5, Math.min(1.6, a.scale * .9));
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.stroke();
              }
            }
          }
        }
        // hero building: one window glows brighter as we approach — the one we enter
        if (b.hero) {
          const wp = P(b.x - 18, 205, z0 - .5);
          if (wp) {
            const pull = seg(t, .55, 1);
            const g = ctx.createRadialGradient(wp.x, wp.y, 0, wp.x, wp.y, 16 + pull * 90);
            g.addColorStop(0, `rgba(255,236,190,${.5 + pull * .5})`);
            g.addColorStop(1, 'rgba(255,236,190,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(wp.x, wp.y, 16 + pull * 90, 0, Math.PI * 2); ctx.fill();
          }
        }
      });

      // vignette
      const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .74);
      vig.addColorStop(0, 'rgba(8,11,17,0)'); vig.addColorStop(1, 'rgba(8,11,17,.55)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    };

    /* ---------------- OFFICE SCENE ---------------- */
    const drawOffice = (q, time, W, H) => {
      const { xw, z1, ceil } = ROOM;
      const q1 = ease(seg(q, 0, .38));   // dolly through chaos
      const q2 = ease(seg(q, .38, .64)); // to hero desk
      const q3 = ease(seg(q, .64, 1));   // pull back — transformation

      const cam = {
        x: mix(mix(0, -118, q2), 8, q3) + mx * 14 * (1 - q3 * .5),
        y: mix(mix(172, 152, q2), 306, q3) + my * 8,
        z: mix(mix(-30, 522, q1) + mix(0, 172, q2), 212, q3),
      };
      const target = {
        x: mix(mix(0, HERO_DESK.x, q2), 0, q3),
        y: mix(mix(150, 108, q2), 148, q3),
        z: mix(mix(1400, HERO_DESK.z, q2), 980, q3),
      };
      const project = projector(cam, target, W, H);
      const zn = cam.z + 80;
      const P = (x, y, z) => project({ x, y, z });

      // ---- room shell ----
      ctx.fillStyle = '#ded9cf'; ctx.fillRect(0, 0, W, H); // safety base
      poly([P(-xw, 0, z1), P(xw, 0, z1), P(xw, ceil, z1), P(-xw, ceil, z1)], '#d9d4ca'); // back wall
      poly([P(-xw, 0, zn), P(-xw, 0, z1), P(-xw, ceil, z1), P(-xw, ceil, zn)], '#cfcabf'); // left wall
      poly([P(xw, 0, zn), P(xw, 0, z1), P(xw, ceil, z1), P(xw, ceil, zn)], '#d5d0c6');    // right wall
      poly([P(-xw, 0, zn), P(xw, 0, zn), P(xw, 0, z1), P(-xw, 0, z1)], '#b3b7bc');        // floor
      poly([P(-xw, ceil, zn), P(xw, ceil, zn), P(xw, ceil, z1), P(-xw, ceil, z1)], '#edeae2'); // ceiling

      // carpet tiles
      for (let z = Math.ceil(zn / 120) * 120; z <= z1; z += 120) {
        const a = P(-xw, 0, z), b = P(xw, 0, z);
        if (a && b) { ctx.strokeStyle = 'rgba(120,126,133,.35)'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      for (let x = -600; x <= 600; x += 120) {
        const a = P(x, 0, zn), b = P(x, 0, z1);
        if (a && b) { ctx.strokeStyle = 'rgba(120,126,133,.28)'; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }

      // right-wall windows → the dusk city outside (continuity with scene one)
      for (let z = 260; z < z1 - 200; z += 340) {
        const wz0 = Math.max(z, zn + 30), wz1 = z + 230;
        if (wz1 <= wz0) continue;
        poly([P(xw - 1, 64, wz0), P(xw - 1, 64, wz1), P(xw - 1, 296, wz1), P(xw - 1, 296, wz0)], '#26354e');
        poly([P(xw - 1, 64, wz0), P(xw - 1, 64, wz1), P(xw - 1, 150, wz1), P(xw - 1, 150, wz0)], '#8a5a48', null, .8);
        // distant lit windows outside
        const wr = seeded(z);
        for (let i = 0; i < 7; i++) {
          const pz = mix(wz0 + 14, wz1 - 14, wr()), py = mix(160, 280, wr());
          const wp = P(xw - 1, py, pz);
          if (wp) { ctx.fillStyle = 'rgba(255,214,150,.75)'; ctx.fillRect(wp.x - 1, wp.y - 1, 2.4, 1.6); }
        }
        // mullions
        const m1 = P(xw - 1, 64, (wz0 + wz1) / 2), m2 = P(xw - 1, 296, (wz0 + wz1) / 2);
        if (m1 && m2) { ctx.strokeStyle = '#b5b1a7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(m1.x, m1.y); ctx.lineTo(m2.x, m2.y); ctx.stroke(); }
        poly([P(xw - 1, 64, wz0), P(xw - 1, 64, wz1), P(xw - 1, 296, wz1), P(xw - 1, 296, wz0)], null, '#b5b1a7', 1, 2.4);
      }

      // back wall: whiteboard + wall clock
      poly([P(-330, 120, z1 - 1), P(-40, 120, z1 - 1), P(-40, 288, z1 - 1), P(-330, 288, z1 - 1)], '#f7f5ef', '#b8b3a8', 1, 2);
      const wbr = seeded(9);
      for (let i = 0; i < 5; i++) {
        const y = 250 - i * 26, xa = -312, xb = -312 + 120 + wbr() * 130;
        const a = P(xa, y, z1 - 1.2), b = P(xb, y, z1 - 1.2);
        if (a && b) { ctx.strokeStyle = i === 1 ? 'rgba(180,80,70,.6)' : 'rgba(70,84,96,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      const ck = P(190, 268, z1 - 1);
      if (ck) {
        const r = Math.max(4, ck.scale * 20);
        ctx.fillStyle = '#f2efe8'; ctx.strokeStyle = '#8d8880'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(ck.x, ck.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        const ha = time * .00005, ma = time * .0006;
        ctx.strokeStyle = '#33383f'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(ck.x, ck.y); ctx.lineTo(ck.x + Math.cos(ha) * r * .5, ck.y + Math.sin(ha) * r * .5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ck.x, ck.y); ctx.lineTo(ck.x + Math.cos(ma) * r * .78, ck.y + Math.sin(ma) * r * .78); ctx.stroke();
      }

      // ceiling light panels — flicker slightly during chaos, steady after transformation
      const steady = seg(q, .7, .9);
      for (let z = Math.ceil((zn + 60) / 300) * 300; z < z1 - 80; z += 300) {
        [-236, 0, 236].forEach((x) => {
          const pts = [P(x - 74, ceil - 1, z), P(x + 74, ceil - 1, z), P(x + 74, ceil - 1, z + 46), P(x - 74, ceil - 1, z + 46)];
          const flick = mix(.86 + .14 * Math.sin(time * .011 + z + x), 1, steady);
          poly(pts, `rgba(255,247,226,${.94 * flick})`, 'rgba(160,155,144,.5)', 1, .8);
          const c = P(x, ceil - 6, z + 23);
          if (c) {
            const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 130 * c.scale + 40);
            g.addColorStop(0, `rgba(255,248,228,${.12 * flick})`); g.addColorStop(1, 'rgba(255,248,228,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, 130 * c.scale + 40, 0, Math.PI * 2); ctx.fill();
          }
        });
      }

      // left wall: filing cabinets + stacked boxes (the crowded feeling)
      [420, 620, 820].forEach((z, i) => {
        if (z < zn + 40) return;
        const P2 = (x, y, zz) => P(x, y, zz);
        const x0 = -xw + 2, x1 = -xw + 66;
        poly([P2(x1, 0, z), P2(x1, 0, z + 78), P2(x1, 126, z + 78), P2(x1, 126, z)], '#9aa0a6', 'rgba(70,76,84,.5)', 1, .7);
        poly([P2(x0, 126, z), P2(x1, 126, z), P2(x1, 126, z + 78), P2(x0, 126, z + 78)], '#aab0b6');
        for (let dY = 0; dY < 3; dY++) {
          const yy = 24 + dY * 38;
          const a = P2(x1, yy, z + 8), b = P2(x1, yy, z + 70);
          if (a && b) { ctx.strokeStyle = 'rgba(70,76,84,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
      });
      [1180, 1240].forEach((z, i) => {
        if (z < zn + 40) return;
        const x1 = -xw + 88, h = i === 0 ? 92 : 56;
        poly([P(x1, 0, z), P(x1, 0, z + 60), P(x1, h, z + 60), P(x1, h, z)], '#b09265', 'rgba(96,74,46,.6)', 1, .8);
        poly([P(-xw + 2, h, z), P(x1, h, z), P(x1, h, z + 60), P(-xw + 2, h, z + 60)], '#c2a476');
      });

      // plants (two)
      [[xw - 90, 350], [-xw + 120, 1560]].forEach(([px, pz]) => {
        if (pz < zn + 40) return;
        const pot0 = P(px - 14, 0, pz), pot1 = P(px + 14, 0, pz), pot2 = P(px + 10, 34, pz), pot3 = P(px - 10, 34, pz);
        poly([pot0, pot1, pot2, pot3], '#8a5a3f', 'rgba(70,44,30,.6)', 1, .7);
        const c = P(px, 60, pz);
        if (c) {
          const r = Math.max(3, c.scale * 34);
          for (let l = 0; l < 6; l++) {
            const ang = -Math.PI / 2 + (l - 2.5) * .42;
            ctx.strokeStyle = l % 2 ? '#4c6b45' : '#5a7a50'; ctx.lineWidth = Math.max(1.4, c.scale * 4);
            ctx.beginPath(); ctx.moveTo(c.x, c.y + r * .5);
            ctx.quadraticCurveTo(c.x + Math.cos(ang) * r * .8, c.y - r * .3, c.x + Math.cos(ang) * r * 1.35, c.y - r * .85);
            ctx.stroke();
          }
        }
      });

      // ---- desks (painter far → near) ----
      const paperAlpha = 1 - seg(q, .7, .9);
      const flows = [];
      const sorted = [...DESKS].sort((a, b) => b.z - a.z);
      sorted.forEach((d) => {
        if (d.z < zn + 60) return;
        const s = d.bank; // toward aisle
        const idx = Math.abs(Math.round(d.z / 7 + d.x)) + 3;
        // screen-on progress for the transformation wave (front desks first)
        const tScr = seg(q, .66 + (d.z / ROOM.z1) * .1, .78 + (d.z / ROOM.z1) * .1);

        const box = (cx, y0, y1, cz, w, dd, cols, lw = .6) => {
          const x0 = cx - w / 2, x1 = cx + w / 2, zz0 = cz - dd / 2, zz1 = cz + dd / 2;
          poly([P(x0, y0, zz0), P(x1, y0, zz0), P(x1, y1, zz0), P(x0, y1, zz0)], cols.front, cols.line, 1, lw);
          const sx = cam.x > cx ? x1 : x0;
          poly([P(sx, y0, zz0), P(sx, y0, zz1), P(sx, y1, zz1), P(sx, y1, zz0)], cols.side, cols.line, 1, lw);
          poly([P(x0, y1, zz0), P(x1, y1, zz0), P(x1, y1, zz1), P(x0, y1, zz1)], cols.top, cols.line, 1, lw);
        };

        // chair (aisle side)
        box(d.x + s * 96, 38, 90, d.z, 9, 34, { front: '#33373d', side: '#2b2f34', top: '#3a3e44', line: 'rgba(20,22,26,.4)' });
        box(d.x + s * 72, 34, 44, d.z, 40, 34, { front: '#3b4046', side: '#32363c', top: '#454a51', line: 'rgba(20,22,26,.4)' });

        // person
        if (d.person) {
          const bob = Math.sin(time * .0013 + idx) * 1.6 * (1 - steady * .6);
          box(d.x + s * 70, 46, 100 + bob, d.z, 36, 26, { front: d.shirt, side: shade(d.shirt), top: d.shirt, line: 'rgba(20,22,26,.25)' });
          const hp = P(d.x + s * 70, 114 + bob, d.z);
          if (hp) {
            ctx.fillStyle = '#c69b7b';
            ctx.beginPath(); ctx.arc(hp.x, hp.y, Math.max(2, hp.scale * 9), 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = d.hair;
            ctx.beginPath(); ctx.arc(hp.x, hp.y - Math.max(.8, hp.scale * 3), Math.max(2, hp.scale * 9), Math.PI, 0); ctx.fill();
          }
        }

        // desk
        box(d.x, 0, 72, d.z, 216, 96, { front: '#8a6540', side: '#7c5a39', top: '#a97a4e', line: 'rgba(60,42,24,.45)' });
        // modesty shadow
        poly([P(d.x - 100, 0, d.z - 49), P(d.x + 100, 0, d.z - 49), P(d.x + 100, 4, d.z - 49), P(d.x - 100, 4, d.z - 49)], 'rgba(40,44,50,.4)');

        // papers on desk
        const prr = seeded(idx * 13 + 5);
        for (let pi = 0; pi < d.papers; pi++) {
          const px = d.x - s * 40 + (prr() - .5) * 90, pz2 = d.z + (prr() - .5) * 56, th = (prr() - .5) * .9;
          const cs = Math.cos(th), sn = Math.sin(th), hw = 10, hd = 13;
          const corners = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([ox, oz]) =>
            P(px + ox * cs - oz * sn, 73, pz2 + ox * sn + oz * cs));
          poly(corners, `rgba(250,249,244,${.95 * paperAlpha})`, `rgba(150,146,136,${.7 * paperAlpha})`, 1, .5);
        }
        // coffee mug
        if (d.pr > .5) {
          const mp = P(d.x + s * 20, 78, d.z - 30);
          if (mp) { ctx.fillStyle = d.pr > .75 ? '#a34d42' : '#4a5a6b'; ctx.beginPath(); ctx.arc(mp.x, mp.y, Math.max(1.2, mp.scale * 5), 0, Math.PI * 2); ctx.fill(); }
        }

        // monitor: stand + frame + screen facing the aisle
        box(d.x - s * 26, 72, 82, d.z, 8, 8, { front: '#2a2e33', side: '#24282c', top: '#2f3338', line: 'rgba(15,17,20,.4)' });
        box(d.x - s * 26, 82, 126, d.z, 8, 62, { front: '#22262b', side: '#1d2125', top: '#2a2e33', line: 'rgba(10,12,14,.5)' });
        const sx = d.x - s * 26 + s * 4.6;
        const scr = [P(sx, 85, d.z - 27), P(sx, 85, d.z + 27), P(sx, 123, d.z + 27), P(sx, 123, d.z - 27)];
        const heroBoost = d.hero ? seg(q, .4, .52) : 0;
        if (tScr <= 0) {
          poly(scr, `rgba(231,240,250,${.92 + heroBoost * .08})`, null, 1);
          // document lines on screen
          for (let li = 0; li < 3; li++) {
            const yy = 116 - li * 9;
            const a = P(sx, yy, d.z - 20), b = P(sx, yy, d.z + (li === 2 ? 4 : 20));
            if (a && b) { ctx.strokeStyle = 'rgba(122,140,158,.8)'; ctx.lineWidth = Math.max(.6, a.scale * 1.4); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          }
        } else {
          // the Evriel system switches on — teal dashboard
          poly(scr, `rgba(${TEAL},${.28 + .6 * tScr})`, `rgba(${TEAL},${.7 * tScr})`, 1, .8);
          for (let li = 0; li < 4; li++) {
            const barH = 6 + ((idx + li * 3) % 4) * 6 * tScr;
            const zz = d.z - 18 + li * 12;
            const a = P(sx, 90, zz), b = P(sx, 90 + barH, zz);
            if (a && b) { ctx.strokeStyle = `rgba(251,251,249,${.85 * tScr})`; ctx.lineWidth = Math.max(1, a.scale * 3.4); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          }
          // glow
          const gc = P(sx, 104, d.z);
          if (gc) {
            const g = ctx.createRadialGradient(gc.x, gc.y, 0, gc.x, gc.y, 46 * gc.scale + 16);
            g.addColorStop(0, `rgba(${TEAL},${.3 * tScr})`); g.addColorStop(1, `rgba(${TEAL},0)`);
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gc.x, gc.y, 46 * gc.scale + 16, 0, Math.PI * 2); ctx.fill();
          }
          const st = P(d.x - s * 26, 130, d.z);
          if (st) flows.push(st);
        }
      });

      // ---- CONTACT: message beam rising from the hero desk (first teal in the film) ----
      const beamA = seg(q, .42, .5) * (1 - seg(q, .66, .73));
      if (beamA > 0) {
        const hs = HERO_DESK, s = hs.bank;
        const top = P(hs.x - s * 26, 130, hs.z);
        const sky2 = P(hs.x - s * 26, ceil - 10, hs.z);
        if (top && sky2) {
          ctx.globalCompositeOperation = 'lighter';
          const bg = ctx.createLinearGradient(top.x, top.y, sky2.x, sky2.y);
          bg.addColorStop(0, `rgba(${TEAL},${.75 * beamA})`); bg.addColorStop(1, `rgba(${TEAL},0)`);
          ctx.strokeStyle = bg; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(sky2.x, sky2.y); ctx.stroke();
          // envelope dot travelling up
          const tt = (time * .0006) % 1;
          const ex = mix(top.x, sky2.x, tt), ey = mix(top.y, sky2.y, tt);
          ctx.fillStyle = `rgba(251,251,249,${.95 * beamA})`;
          ctx.fillRect(ex - 4, ey - 3, 8, 6);
          ctx.strokeStyle = `rgba(${TEAL},${beamA})`; ctx.lineWidth = 1;
          ctx.strokeRect(ex - 4, ey - 3, 8, 6);
          ctx.beginPath(); ctx.moveTo(ex - 4, ey - 3); ctx.lineTo(ex, ey + 1); ctx.lineTo(ex + 4, ey - 3); ctx.stroke();
          // expanding rings at the screen
          for (let ri = 0; ri < 3; ri++) {
            const rt = ((time * .0009) + ri / 3) % 1;
            ctx.strokeStyle = `rgba(${TEAL},${(1 - rt) * .55 * beamA})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(top.x, top.y, 6 + rt * 46, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      // ---- TRANSFORMATION: core + flow lines ----
      const coreA = seg(q, .7, .84);
      if (coreA > 0) {
        const cp = P(0, 286, 800);
        if (cp) {
          ctx.globalCompositeOperation = 'lighter';
          flows.forEach((f, fi) => {
            const reveal = clamp(coreA * 1.4 - fi * .04);
            if (reveal <= 0) return;
            const cx2 = (f.x + cp.x) / 2, cy2 = Math.min(f.y, cp.y) - 44;
            ctx.strokeStyle = `rgba(${TEAL},${.4 * reveal})`; ctx.lineWidth = .9;
            ctx.setLineDash([3, 9]); ctx.lineDashOffset = -time * .02 - fi * 5;
            ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(cx2, cy2, cp.x, cp.y); ctx.stroke();
            ctx.setLineDash([]);
            const tt = (time * .0002 + fi * .09) % 1, omt = 1 - tt;
            const qx = omt * omt * f.x + 2 * omt * tt * cx2 + tt * tt * cp.x;
            const qy = omt * omt * f.y + 2 * omt * tt * cy2 + tt * tt * cp.y;
            ctx.fillStyle = `rgba(251,251,249,${.9 * reveal})`;
            ctx.beginPath(); ctx.arc(qx, qy, 1.7, 0, Math.PI * 2); ctx.fill();
          });
          const pulse = .5 + .5 * Math.sin(time * .0022);
          const g = ctx.createRadialGradient(cp.x, cp.y, 0, cp.x, cp.y, 54 + pulse * 18);
          g.addColorStop(0, `rgba(251,251,249,${.85 * coreA})`);
          g.addColorStop(.3, `rgba(${TEAL},${.5 * coreA})`);
          g.addColorStop(1, `rgba(${TEAL},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cp.x, cp.y, 72, 0, Math.PI * 2); ctx.fill();
          for (let ri = 0; ri < 2; ri++) {
            const rt = ((time * .0006) + ri / 2) % 1;
            ctx.strokeStyle = `rgba(${TEAL},${(1 - rt) * .5 * coreA})`; ctx.lineWidth = 1.1;
            ctx.beginPath(); ctx.arc(cp.x, cp.y, 20 + rt * 90, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      // gentle interior vignette
      const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .34, W / 2, H / 2, Math.max(W, H) * .78);
      vig.addColorStop(0, 'rgba(30,32,36,0)'); vig.addColorStop(1, 'rgba(30,32,36,.34)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    };

    const shadeCache = {};
    function shade(hex) {
      if (shadeCache[hex]) return shadeCache[hex];
      const n = parseInt(hex.slice(1), 16);
      const r = Math.floor(((n >> 16) & 255) * .78), g = Math.floor(((n >> 8) & 255) * .78), b = Math.floor((n & 255) * .78);
      return (shadeCache[hex] = `rgb(${r},${g},${b})`);
    }

    const SWAP = .39, HALF = .045;
    const draw = (time) => {
      if (!running) return;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      ctx.clearRect(0, 0, W, H);
      const p = reduced ? .16 : clamp(progressRef.current || 0);

      if (p < SWAP) drawCity(seg(p, 0, SWAP), time, W, H);
      else drawOffice(seg(p, SWAP, 1), time, W, H);

      // the white flash — passing through the office window glass
      const flash = clamp(1 - Math.abs(p - SWAP) / HALF) * .97;
      if (flash > 0) { ctx.fillStyle = `rgba(251,251,249,${flash})`; ctx.fillRect(0, 0, W, H); }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', pointer); };
  }, [progressRef]);

  return <canvas ref={canvasRef} className="city-canvas" aria-hidden="true" />;
}
