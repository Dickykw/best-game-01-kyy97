// Arsenal — three weapons, deterministic recoil, viewmodels and procedural
// WebAudio. Spray is a fixed table per weapon: shot 0 has zero kick and
// zero spread, later shots climb a fixed pattern, and the kick recovers
// toward 70% at 12 rad/s. No randomness in the gun itself.
import * as THREE from 'three';
import { WEAPONS, GRENADE_PRICE } from './config.js';
import { createGrenadeSim } from './grenade.js';

export { GRENADE_PRICE };

const GUNMETAL = 0x33373d;
const STEEL = 0x565e68;
const POLYMER = 0x2b2e33;
const GRIP = 0x6b4a28;
const AMBER = 0xf0a830;

function mat(color, metalness = 0.65, roughness = 0.45) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function part(w, h, d, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

function cylinder(rt, rb, h, material, x, y, z, rx = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 14), material);
  m.position.set(x, y, z);
  m.rotation.x = rx;
  m.rotation.z = rz;
  return m;
}

// Spray tables: per-shot pitch/yaw offsets in radians, deterministic.
function sprayTable(kind) {
  const t = [];
  for (let i = 0; i < 30; i++) {
    if (kind === 'rifle') t.push([0.011 * Math.sin(i * 0.9), 0.006 * Math.sin(i * 1.7 + 0.5)]);
    else if (kind === 'smg') t.push([0.009 * Math.cos(i * 1.1), 0.007 * Math.cos(i * 0.8)]);
    else t.push([0.008 * i * 0.12, 0]);
  }
  return t;
}

function buildRifle() {
  const g = new THREE.Group();
  const gm = mat(GUNMETAL), st = mat(STEEL, 0.7, 0.35), pl = mat(POLYMER, 0.2, 0.7);
  const grip = mat(GRIP, 0.15, 0.75);
  g.add(part(0.07, 0.09, 0.5, gm, 0, 0, -0.1));
  g.add(part(0.06, 0.07, 0.34, st, 0, 0.01, -0.48));
  g.add(cylinder(0.02, 0.02, 0.16, st, 0, 0.01, -0.72, Math.PI / 2));
  g.add(part(0.05, 0.05, 0.06, pl, 0, 0.01, -0.8));
  // warm wood handguard so the rifle is not one black slab
  g.add(part(0.075, 0.085, 0.3, grip, 0, 0, -0.42));
  g.add(part(0.05, 0.16, 0.09, pl, 0, -0.11, -0.28, 0.35));
  g.add(part(0.06, 0.05, 0.16, pl, 0, -0.02, 0.18));
  g.add(part(0.05, 0.09, 0.05, grip, 0, -0.1, 0.1, 0.5));
  g.add(part(0.05, 0.03, 0.1, mat(AMBER, 0.3, 0.5), 0, -0.16, -0.28));
  g.add(part(0.02, 0.05, 0.02, st, 0, 0.06, -0.32));
  g.add(part(0.02, 0.04, 0.02, st, 0, 0.055, -0.62));
  g.add(part(0.04, 0.03, 0.08, st, 0.05, 0.02, -0.05));
  // rear sight ring
  g.add(part(0.05, 0.05, 0.02, st, 0, 0.055, -0.12));
  return g;
}

function buildSmg() {
  const g = new THREE.Group();
  const gm = mat(GUNMETAL), st = mat(STEEL, 0.7, 0.35), pl = mat(POLYMER, 0.2, 0.7);
  const grip = mat(GRIP, 0.15, 0.75);
  g.add(part(0.08, 0.1, 0.34, gm, 0, 0, -0.08));
  g.add(part(0.07, 0.08, 0.22, grip, 0, 0, -0.32));
  g.add(cylinder(0.03, 0.03, 0.2, st, 0, 0, -0.52, Math.PI / 2));
  g.add(part(0.05, 0.18, 0.08, pl, 0, -0.12, -0.2, 0.3));
  g.add(part(0.04, 0.1, 0.04, pl, 0, -0.1, -0.38));
  g.add(part(0.05, 0.05, 0.12, pl, 0, -0.02, 0.16));
  g.add(part(0.05, 0.08, 0.05, grip, 0, -0.09, 0.08, 0.5));
  // red dot
  g.add(part(0.05, 0.05, 0.06, pl, 0, 0.075, -0.18));
  g.add(part(0.03, 0.03, 0.01, mat(0xff3020, 0.1, 0.3), 0, 0.075, -0.215));
  return g;
}

function buildPistol() {
  const g = new THREE.Group();
  const gm = mat(GUNMETAL), st = mat(STEEL, 0.7, 0.35), pl = mat(POLYMER, 0.2, 0.7);
  const grip = mat(GRIP, 0.15, 0.75);
  g.add(part(0.05, 0.05, 0.24, gm, 0, 0.01, -0.1));
  g.add(part(0.045, 0.04, 0.22, pl, 0, -0.025, -0.08));
  g.add(cylinder(0.012, 0.012, 0.05, st, 0, 0.01, -0.24, Math.PI / 2));
  g.add(part(0.04, 0.11, 0.05, grip, 0, -0.09, 0.04, 0.35));
  g.add(part(0.04, 0.02, 0.06, pl, 0, -0.06, -0.02));
  g.add(part(0.015, 0.03, 0.015, st, 0, 0.045, -0.2));
  g.add(part(0.015, 0.03, 0.015, st, 0, 0.045, -0.02));
  return g;
}

export function createArsenal(camera, scene) {
  const defs = WEAPONS;
  const tables = { rifle: sprayTable('rifle'), smg: sprayTable('smg'), pistol: sprayTable('pistol') };
  const grenades = createGrenadeSim(scene);

  const models = { rifle: buildRifle(), smg: buildSmg(), pistol: buildPistol() };
  const basePos = {
    rifle: new THREE.Vector3(0.24, -0.2, -0.42),
    smg: new THREE.Vector3(0.24, -0.2, -0.42),
    pistol: new THREE.Vector3(0.1, -0.26, -0.38),
  };
  for (const [name, m] of Object.entries(models)) {
    m.position.copy(basePos[name]);
    m.visible = false;
    camera.add(m);
  }

  // muzzle flash: one additive plane + point light per viewmodel
  const flashMeshes = {};
  const flashLamps = {};
  for (const [name, m] of Object.entries(models)) {
    const fm = new THREE.MeshBasicMaterial({
      color: 0xffd27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const fq = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), fm);
    fq.position.set(0, 0.01, -0.85);
    const fl = new THREE.PointLight(0xffc861, 0, 6);
    fl.position.set(0, 0, -0.8);
    m.add(fq);
    m.add(fl);
    flashMeshes[name] = fm;
    flashLamps[name] = fl;
  }

  // procedural audio
  let audioCtx = null;
  let master = null;
  function audio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        master = audioCtx.createGain();
        master.gain.value = 0.5;
        master.connect(audioCtx.destination);
      } catch { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  function blip(freq0, freq1, dur, type, gain) {
    const ctx = audio();
    if (!ctx) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq0, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, freq1), ctx.currentTime + dur);
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g).connect(master);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch { /* audio never breaks shooting */ }
  }
  function noiseBurst(dur, gain, filterFreq) {
    const ctx = audio();
    if (!ctx) return;
    try {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filterFreq;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(f).connect(g).connect(master);
      src.start();
    } catch { /* audio never breaks shooting */ }
  }
  function shotSound(name) {
    if (name === 'rifle') { noiseBurst(0.09, 0.5, 2400); blip(220, 55, 0.09, 'square', 0.22); }
    else if (name === 'smg') { noiseBurst(0.06, 0.4, 3200); blip(300, 70, 0.06, 'square', 0.18); }
    else { noiseBurst(0.08, 0.45, 1800); blip(180, 50, 0.1, 'square', 0.25); }
  }

  const state = {
    name: 'pistol',
    def: defs.pistol,
    mag: defs.pistol.mag,
    reserve: defs.pistol.reserve,
    cooldown: 0,
    reloadLeft: 0,
    flashLeft: 0,
    kick: 0,
    shotIndex: 0,
    firing: false,
    bobPhase: 0,
  };
  const owned = new Set(['pistol']);
  let grenadeCount = 1;
  const shot = { fired: false, spread: 0, index: 0, kickPitch: 0, kickYaw: 0 };
  const muzzle = new THREE.Vector3();
  const lastExplosions = [];

  function applyModel() {
    for (const [name, m] of Object.entries(models)) m.visible = name === state.name;
  }
  applyModel();

  function spreadNow(moveSpeed) {
    const def = state.def;
    if (state.shotIndex === 0) return 0;
    const moving = Math.min(1, moveSpeed / 5.2);
    return 0.0015 + moving * 0.012 + state.shotIndex * 0.0006;
  }

  function tryFire() {
    if (state.reloadLeft > 0 || state.cooldown > 0) return { fired: false, spread: 0 };
    if (state.mag <= 0) {
      blip(900, 700, 0.05, 'square', 0.12);
      state.cooldown = 0.25;
      return { fired: false, spread: 0 };
    }
    state.mag -= 1;
    state.cooldown = state.def.gap;
    state.flashLeft = 0.06;
    const table = tables[state.name];
    const row = table[Math.min(state.shotIndex, table.length - 1)];
    const pitch = row[0];
    const yaw = row[1];
    state.kick = Math.min(0.09, state.kick + state.def.kick);
    shot.fired = true;
    shot.spread = 0; // set by caller via spreadNow
    shot.index = state.shotIndex;
    shot.kickPitch = pitch;
    shot.kickYaw = yaw;
    state.shotIndex += 1;
    shotSound(state.name);
    flashMeshes[state.name].opacity = 0.95;
    flashLamps[state.name].intensity = 2.2;
    return { fired: true, spread: 0 };
  }

  function reload() {
    if (state.reloadLeft > 0 || state.mag >= state.def.mag || state.reserve <= 0) return;
    state.reloadLeft = state.def.reload;
    blip(1200, 900, 0.05, 'square', 0.1);
  }

  function switchTo(name) {
    if (!owned.has(name) || !defs[name]) return false;
    if (name === state.name) return true;
    state.name = name;
    state.def = defs[name];
    state.mag = state.def.mag;
    state.reserve = state.def.reserve;
    state.cooldown = 0;
    state.reloadLeft = 0;
    state.kick = 0;
    state.shotIndex = 0;
    applyModel();
    return true;
  }

  function buy(name) {
    if (!defs[name] || owned.has(name)) return false;
    owned.add(name);
    return true;
  }

  function refillAll() {
    state.mag = state.def.mag;
    state.reserve = state.def.reserve;
    state.reloadLeft = 0;
    state.cooldown = 0;
    state.shotIndex = 0;
  }

  function muzzleWorld(out) {
    const m = models[state.name];
    const tip = out || muzzle;
    tip.set(0, 0.01, -0.85);
    m.localToWorld(tip);
    return tip;
  }

  function step(dt, moveSpeed, crouching) {
    shot.fired = false;
    if (state.cooldown > 0) state.cooldown -= dt;
    if (state.flashLeft > 0) {
      state.flashLeft -= dt;
      if (state.flashLeft <= 0) {
        flashMeshes[state.name].opacity = 0;
        flashLamps[state.name].intensity = 0;
      }
    }
    if (state.reloadLeft > 0) {
      state.reloadLeft -= dt;
      if (state.reloadLeft <= 0) {
        state.reloadLeft = 0;
        const need = state.def.mag - state.mag;
        const take = Math.min(need, state.reserve);
        state.mag += take;
        state.reserve -= take;
        blip(1000, 1400, 0.05, 'square', 0.1);
      }
    }
    // auto fire
    if (state.firing && state.def.auto) {
      const r = tryFire();
      if (r.fired) shot.spread = spreadNow(moveSpeed);
    }
    // kick recovery: 12 rad/s toward 70% of peak
    if (state.kick > 0) {
      state.kick = Math.max(0, state.kick - 12 * 0.7 * state.kick * dt - 0.02 * dt);
      if (state.kick < 0.001) state.kick = 0;
    }
    if (!state.firing) state.shotIndex = Math.max(0, state.shotIndex - Math.floor(dt * 20));
    // viewmodel motion: bob, sway, kick, reload dip
    const m = models[state.name];
    const bob = Math.min(1, moveSpeed / 5.2) * (crouching ? 0.5 : 1);
    state.bobPhase += dt * (6 + moveSpeed * 1.4);
    const base = basePos[state.name];
    let y = base.y + Math.sin(state.bobPhase * 2) * 0.006 * bob;
    let x = base.x + Math.cos(state.bobPhase) * 0.004 * bob;
    let z = base.z + state.kick * 0.9;
    let rx = state.kick * 2.2;
    if (state.firing) { y += 0.018; z -= 0.03; }
    if (state.reloadLeft > 0) {
      const p = 1 - state.reloadLeft / state.def.reload;
      const dip = Math.sin(p * Math.PI);
      rx -= dip * 0.55;
      y -= dip * 0.09;
    }
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.rotation.z = 0;
    // grenades advance with the same step
    lastExplosions.length = 0;
    const booms = grenades.update(dt);
    for (const b of booms) lastExplosions.push(b);
  }

  function pullTrigger() {
    state.firing = true;
    if (!state.def.auto) {
      const r = tryFire();
      if (r.fired) shot.spread = spreadNow(0);
    }
  }
  function releaseTrigger() { state.firing = false; }

  function throwGrenade(origin, dir) {
    if (grenadeCount <= 0) return -1;
    grenadeCount -= 1;
    return grenades.throwGrenade(origin, dir);
  }

  return {
    defs, state, owned,
    get current() { return state; },
    get shot() { return shot; },
    get grenades() { return grenadeCount; },
    get explosions() { return lastExplosions; },
    get currentName() { return state.name; },
    get firing() { return state.firing; },
    switchTo, buy, pullTrigger, releaseTrigger, tryFire, reload, refillAll,
    step, spread: spreadNow,
    ready() { return state.mag > 0 && state.cooldown <= 0 && state.reloadLeft <= 0; },
    addGrenade(n) { grenadeCount = Math.max(0, grenadeCount + n); },
    throwGrenade,
    setColliders(list) { grenades.setColliders(list); },
    updateGrenades(dt) { return grenades.update(dt); },
    muzzleWorld,
  };
}
