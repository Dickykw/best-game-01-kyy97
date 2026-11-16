// Procedural canvas textures. Everything is drawn once at load from a
// seeded PRNG, so the yard looks identical on every machine and no image
// file is ever fetched. Richer than the first pass: stronger contrast,
// stains, rust and panel variation so surfaces read as 3D at a glance
// instead of flat colour.
import * as THREE from 'three';
import { PALETTE } from './config.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return [c, c.getContext('2d')];
}

function speckle(ctx, size, rand, n, colors, rMin, rMax, aMin = 0.12, aMax = 0.37) {
  for (let i = 0; i < n; i++) {
    const x = rand() * size, y = rand() * size;
    const r = rMin + rand() * (rMax - rMin);
    ctx.fillStyle = colors[(rand() * colors.length) | 0];
    ctx.globalAlpha = aMin + rand() * (aMax - aMin);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function stain(ctx, size, rand, n, colour, rMin, rMax, alpha) {
  for (let i = 0; i < n; i++) {
    const x = rand() * size, y = rand() * size;
    const r = rMin + rand() * (rMax - rMin);
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, colour.replace('A', alpha));
    g.addColorStop(1, colour.replace('A', '0'));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function toTexture(c, repeat = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function groundTexture() {
  const [c, ctx] = canvas(512);
  const rand = rng(101);
  ctx.fillStyle = '#9a825e';
  ctx.fillRect(0, 0, 512, 512);
  // broad tonal patches so the ground is never one flat colour
  stain(ctx, 512, rand, 10, 'rgba(125,106,74,A)', 60, 130, '0.30');
  stain(ctx, 512, rand, 8, 'rgba(181,154,109,A)', 50, 110, '0.28');
  speckle(ctx, 512, rand, 3400, ['#7d6a4a', '#b59a6d', '#6b5a40', '#c2ab7e', '#8a7a56'], 1, 5, 0.15, 0.45);
  // dark oil stains
  stain(ctx, 512, rand, 7, 'rgba(28,22,16,A)', 18, 55, '0.55');
  // cracks
  ctx.strokeStyle = 'rgba(60,48,32,0.65)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 20; i++) {
    let x = rand() * 512, y = rand() * 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 5; j++) {
      x += (rand() - 0.5) * 70;
      y += (rand() - 0.5) * 70;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // faded lane dashes + a painted arrow
  ctx.fillStyle = 'rgba(233,230,223,0.32)';
  for (let i = 0; i < 6; i++) ctx.fillRect(40 + i * 80, 250, 34, 5);
  ctx.fillStyle = 'rgba(240,168,48,0.35)';
  ctx.beginPath();
  ctx.moveTo(300, 60); ctx.lineTo(330, 60); ctx.lineTo(330, 100); ctx.lineTo(345, 100);
  ctx.lineTo(315, 130); ctx.lineTo(285, 100); ctx.lineTo(300, 100); ctx.closePath(); ctx.fill();
  // tyre arcs
  ctx.strokeStyle = 'rgba(40,32,22,0.32)';
  ctx.lineWidth = 9;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(rand() * 512, rand() * 512, 60 + rand() * 90, rand() * 6, rand() * 2 + 0.6);
    ctx.stroke();
  }
  // scattered pebbles / rubble
  speckle(ctx, 512, rand, 260, ['#5a4a34', '#c8b088', '#3f3428'], 2, 5, 0.4, 0.8);
  return toTexture(c, 8);
}

function wallTexture() {
  const [c, ctx] = canvas(256);
  const rand = rng(202);
  ctx.fillStyle = '#8d8578';
  ctx.fillRect(0, 0, 256, 256);
  // alternate panel tints: warm, cool, dark — the wall stops being one slab
  const tints = ['rgba(180,140,90,0.20)', 'rgba(90,110,130,0.18)', 'rgba(60,54,46,0.22)', 'rgba(200,170,120,0.14)'];
  for (let px = 0; px < 4; px++) {
    for (let py = 0; py < 4; py++) {
      ctx.fillStyle = tints[(rand() * tints.length) | 0];
      ctx.fillRect(px * 64, py * 64, 64, 64);
    }
  }
  speckle(ctx, 256, rand, 1100, ['#7a7266', '#9a9184', '#6e675c', '#a89a80'], 1, 3, 0.15, 0.45);
  // panel seams
  ctx.strokeStyle = 'rgba(50,46,40,0.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(256, i * 64); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, 256); ctx.stroke();
  }
  // bolt heads at panel corners
  ctx.fillStyle = 'rgba(40,36,30,0.8)';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      ctx.beginPath(); ctx.arc(i * 64 + 8, j * 64 + 8, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(i * 64 + 56, j * 64 + 56, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  // grime + rust weeps from the top
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(70,58,40,0.45)');
  g.addColorStop(0.4, 'rgba(70,58,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(180,90,42,0.5)';
  for (let i = 0; i < 12; i++) {
    const x = rand() * 256;
    ctx.fillRect(x, 0, 3 + rand() * 5, 30 + rand() * 90);
  }
  return toTexture(c, 2);
}

function woodTexture() {
  const [c, ctx] = canvas(256);
  const rand = rng(303);
  ctx.fillStyle = '#8a6a42';
  ctx.fillRect(0, 0, 256, 256);
  for (let p = 0; p < 4; p++) {
    const y0 = p * 64;
    ctx.fillStyle = p % 2 ? '#7d5f38' : '#966f45';
    ctx.fillRect(0, y0, 256, 64);
    ctx.strokeStyle = 'rgba(60,42,20,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, y0, 256, 64);
    // grain
    ctx.strokeStyle = 'rgba(70,50,26,0.45)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const y = y0 + 6 + rand() * 52;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(80, y + (rand() - 0.5) * 8, 170, y + (rand() - 0.5) * 8, 256, y);
      ctx.stroke();
    }
    // knots
    ctx.fillStyle = 'rgba(52,36,18,0.6)';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.ellipse(40 + rand() * 176, y0 + 12 + rand() * 40, 6 + rand() * 5, 3 + rand() * 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // nails
    ctx.fillStyle = '#3a3630';
    ctx.beginPath(); ctx.arc(10, y0 + 32, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(246, y0 + 32, 3, 0, Math.PI * 2); ctx.fill();
  }
  // diagonal brace
  ctx.strokeStyle = 'rgba(60,42,20,0.6)';
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(0, 256); ctx.lineTo(256, 0); ctx.stroke();
  return toTexture(c, 1);
}

function metalTexture() {
  const [c, ctx] = canvas(256);
  const rand = rng(404);
  ctx.fillStyle = '#5d6669';
  ctx.fillRect(0, 0, 256, 256);
  // brushed vertical streaks
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(rand() * 256, 0, 1 + rand() * 3, 256);
  }
  speckle(ctx, 256, rand, 800, ['#4c5457', '#6e787b', '#454d50'], 1, 3, 0.15, 0.45);
  ctx.strokeStyle = 'rgba(30,34,36,0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 248, 248);
  ctx.beginPath(); ctx.moveTo(128, 4); ctx.lineTo(128, 252); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, 128); ctx.lineTo(252, 128); ctx.stroke();
  // rivets
  ctx.fillStyle = '#2e3335';
  for (const [x, y] of [[16, 16], [240, 16], [16, 240], [240, 240], [128, 16], [128, 240], [16, 128], [240, 128]]) {
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(210,220,225,0.5)';
  for (const [x, y] of [[14, 14], [238, 14], [14, 238], [238, 238]]) {
    ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  // rust streaks
  ctx.fillStyle = 'rgba(180,90,42,0.55)';
  for (let i = 0; i < 14; i++) {
    const x = rand() * 256;
    ctx.fillRect(x, rand() * 60, 2 + rand() * 4, 40 + rand() * 130);
  }
  return toTexture(c, 1);
}

function hazardTexture() {
  const [c, ctx] = canvas(256);
  const rand = rng(505);
  ctx.fillStyle = '#d8a419';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#1c1c1c';
  for (let i = -4; i < 8; i++) {
    ctx.save();
    ctx.translate(i * 64, 0);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(0, -80, 32, 400);
    ctx.restore();
  }
  speckle(ctx, 256, rand, 400, ['#000000', '#ffffff'], 1, 2);
  return toTexture(c, 1);
}

function siteFloorTexture(letter, colour) {
  const [c, ctx] = canvas(256);
  const rand = rng(letter === 'A' ? 606 : 707);
  ctx.fillStyle = '#7e7668';
  ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, rand, 500, ['#6d6558', '#8f8778'], 1, 3);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, 228, 228);
  ctx.fillStyle = colour;
  ctx.font = 'bold 150px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.9;
  ctx.fillText(letter, 128, 136);
  ctx.globalAlpha = 1;
  return toTexture(c, 1);
}

// Ribbed drum: horizontal ribs + a painted band, so a barrel reads as a
// 3D drum instead of a flat cylinder.
function barrelTexture(bandColour) {
  const [c, ctx] = canvas(128);
  const rand = rng(808);
  ctx.fillStyle = '#7a4a22';
  ctx.fillRect(0, 0, 128, 128);
  speckle(ctx, 128, rand, 300, ['#6b3f1c', '#8a5527', '#5d3416'], 1, 3, 0.15, 0.4);
  // ribs
  ctx.fillStyle = 'rgba(30,18,8,0.55)';
  ctx.fillRect(0, 26, 128, 7);
  ctx.fillRect(0, 96, 128, 7);
  ctx.fillStyle = 'rgba(255,220,170,0.25)';
  ctx.fillRect(0, 24, 128, 2);
  ctx.fillRect(0, 94, 128, 2);
  // painted band
  ctx.fillStyle = bandColour;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(0, 56, 128, 18);
  ctx.globalAlpha = 1;
  // rust streaks under the band
  ctx.fillStyle = 'rgba(120,50,20,0.5)';
  for (let i = 0; i < 6; i++) {
    const x = rand() * 128;
    ctx.fillRect(x, 74, 2 + rand() * 3, 20 + rand() * 30);
  }
  return toTexture(c, 1);
}

// Corrugated shipping container: vertical ribs + stencilled mark.
function containerTexture(baseColour, markColour, mark) {
  const [c, ctx] = canvas(256);
  const rand = rng(909);
  ctx.fillStyle = baseColour;
  ctx.fillRect(0, 0, 256, 256);
  // corrugation: alternating light/dark vertical ribs
  for (let x = 0; x < 256; x += 16) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x, 0, 5, 256);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(x + 8, 0, 4, 256);
  }
  speckle(ctx, 256, rand, 500, ['#000000', '#ffffff'], 1, 2, 0.08, 0.2);
  // rust at the bottom
  const g = ctx.createLinearGradient(0, 180, 0, 256);
  g.addColorStop(0, 'rgba(120,50,20,0)');
  g.addColorStop(1, 'rgba(120,50,20,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 180, 256, 76);
  // stencilled mark
  ctx.fillStyle = markColour;
  ctx.font = 'bold 92px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.85;
  ctx.fillText(mark, 128, 118);
  ctx.globalAlpha = 1;
  return toTexture(c, 1);
}

export function makeSkyTexture() {
  const [c, ctx] = canvas(512);
  const rand = rng(1111);
  // dusk gradient: deep indigo up top, violet, then a hot orange band
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#0e2438');
  g.addColorStop(0.35, '#2c3f5e');
  g.addColorStop(0.58, '#7a4a52');
  g.addColorStop(0.74, '#c97a44');
  g.addColorStop(0.88, '#f0a35e');
  g.addColorStop(1, '#f7c07a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  // soft cloud blobs, lit amber underneath, violet on top
  for (let i = 0; i < 16; i++) {
    const x = rand() * 512, y = 60 + rand() * 260;
    const w = 60 + rand() * 130, h = 12 + rand() * 22;
    const cg = ctx.createRadialGradient(x, y, 1, x, y, w / 2);
    const warm = y > 200;
    cg.addColorStop(0, warm ? 'rgba(255,180,110,0.34)' : 'rgba(190,170,210,0.30)');
    cg.addColorStop(1, 'rgba(255,180,110,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // faint high stars near the top
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.25 + rand() * 0.5;
    ctx.beginPath();
    ctx.arc(rand() * 512, rand() * 110, 0.8 + rand() * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeGlowTexture() {
  const [c, ctx] = canvas(256);
  const g = ctx.createRadialGradient(128, 128, 2, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,225,170,1)');
  g.addColorStop(0.18, 'rgba(255,205,130,0.85)');
  g.addColorStop(0.45, 'rgba(255,170,90,0.32)');
  g.addColorStop(1, 'rgba(255,160,70,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createTextures() {
  return {
    ground: groundTexture(),
    wall: wallTexture(),
    crateWood: woodTexture(),
    crateMetal: metalTexture(),
    hazard: hazardTexture(),
    siteFloorA: siteFloorTexture('A', PALETTE.siteA),
    siteFloorB: siteFloorTexture('B', PALETTE.siteB),
    barrelAmber: barrelTexture('#d8a419'),
    barrelBlue: barrelTexture('#4aa8ff'),
    containerRust: containerTexture('#8a4a26', '#f0c070', '07'),
    containerBlue: containerTexture('#2e4a5e', '#9fd4ff', '12'),
  };
}
