// Procedural canvas textures. Everything is drawn once at load from a
// seeded PRNG, so the yard looks identical on every machine and no image
// file is ever fetched.
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

function speckle(ctx, size, rand, n, colors, rMin, rMax) {
  for (let i = 0; i < n; i++) {
    const x = rand() * size, y = rand() * size;
    const r = rMin + rand() * (rMax - rMin);
    ctx.fillStyle = colors[(rand() * colors.length) | 0];
    ctx.globalAlpha = 0.12 + rand() * 0.25;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
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
  speckle(ctx, 512, rand, 2600, ['#7d6a4a', '#b59a6d', '#6b5a40', '#c2ab7e'], 1, 4);
  // cracks
  ctx.strokeStyle = 'rgba(60,48,32,0.55)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) {
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
  // faded lane dashes
  ctx.fillStyle = 'rgba(233,230,223,0.28)';
  for (let i = 0; i < 6; i++) ctx.fillRect(40 + i * 80, 250, 34, 5);
  // tyre arcs
  ctx.strokeStyle = 'rgba(40,32,22,0.25)';
  ctx.lineWidth = 9;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(rand() * 512, rand() * 512, 60 + rand() * 90, rand() * 6, rand() * 2 + 0.6);
    ctx.stroke();
  }
  return toTexture(c, 8);
}

function wallTexture() {
  const [c, ctx] = canvas(256);
  const rand = rng(202);
  ctx.fillStyle = '#8d8578';
  ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, rand, 900, ['#7a7266', '#9a9184', '#6e675c'], 1, 3);
  // panel seams
  ctx.strokeStyle = 'rgba(50,46,40,0.6)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(256, i * 64); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, 256); ctx.stroke();
  }
  // grime + rust weeps from the top
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(70,58,40,0.35)');
  g.addColorStop(0.4, 'rgba(70,58,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(180,90,42,0.4)';
  for (let i = 0; i < 8; i++) {
    const x = rand() * 256;
    ctx.fillRect(x, 0, 3 + rand() * 5, 30 + rand() * 80);
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
    ctx.fillStyle = p % 2 ? '#84643e' : '#916f47';
    ctx.fillRect(0, y0, 256, 64);
    ctx.strokeStyle = 'rgba(60,42,20,0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, y0, 256, 64);
    // grain
    ctx.strokeStyle = 'rgba(70,50,26,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const y = y0 + 6 + rand() * 52;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(80, y + (rand() - 0.5) * 8, 170, y + (rand() - 0.5) * 8, 256, y);
      ctx.stroke();
    }
    // nails
    ctx.fillStyle = '#3a3630';
    ctx.beginPath(); ctx.arc(10, y0 + 32, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(246, y0 + 32, 3, 0, Math.PI * 2); ctx.fill();
  }
  // diagonal brace
  ctx.strokeStyle = 'rgba(60,42,20,0.55)';
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(0, 256); ctx.lineTo(256, 0); ctx.stroke();
  return toTexture(c, 1);
}

function metalTexture() {
  const [c, ctx] = canvas(256);
  const rand = rng(404);
  ctx.fillStyle = '#5d6669';
  ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, rand, 700, ['#4c5457', '#6e787b', '#454d50'], 1, 3);
  ctx.strokeStyle = 'rgba(30,34,36,0.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 248, 248);
  ctx.beginPath(); ctx.moveTo(128, 4); ctx.lineTo(128, 252); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, 128); ctx.lineTo(252, 128); ctx.stroke();
  // rivets
  ctx.fillStyle = '#2e3335';
  for (const [x, y] of [[16, 16], [240, 16], [16, 240], [240, 240], [128, 16], [128, 240], [16, 128], [240, 128]]) {
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }
  // rust streaks
  ctx.fillStyle = 'rgba(180,90,42,0.45)';
  for (let i = 0; i < 10; i++) {
    const x = rand() * 256;
    ctx.fillRect(x, rand() * 60, 2 + rand() * 4, 40 + rand() * 120);
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

export function makeSkyTexture() {
  const [c, ctx] = canvas(256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(0.55, '#7a5a52');
  g.addColorStop(0.8, PALETTE.skyBottom);
  g.addColorStop(1, '#f0b070');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeGlowTexture() {
  const [c, ctx] = canvas(128);
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,200,120,0.9)');
  g.addColorStop(0.35, 'rgba(255,170,90,0.35)');
  g.addColorStop(1, 'rgba(255,160,70,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
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
  };
}
