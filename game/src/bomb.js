// Bomb — the objective. Plant takes 3 s channelled inside a site, the
// fuse runs 35 s, an enemy defuse takes 5 s channelled. Beeps accelerate
// as the fuse runs down. plantNow() plants instantly (screenshot mode).
import * as THREE from 'three';
import { BOMB } from './config.js';

export function createBomb(scene, world) {
  const group = new THREE.Group();
  scene.add(group);

  // bomb model: dark case + amber light + antenna
  const bombMesh = new THREE.Group();
  const caseMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.22, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.5, metalness: 0.6 }),
  );
  caseMesh.castShadow = true;
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xff3020 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), lampMat);
  lamp.position.set(0.12, 0.13, 0);
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6),
    new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.4 }),
  );
  antenna.position.set(-0.15, 0.24, 0);
  bombMesh.add(caseMesh, lamp, antenna);
  bombMesh.visible = false;
  group.add(bombMesh);

  // site rings: pulsing circles on both sites
  const rings = {};
  for (const [key, site] of [['A', world.siteA], ['B', world.siteB]]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(site.radius - 0.35, site.radius, 40),
      new THREE.MeshBasicMaterial({
        color: key === 'A' ? 0xf5a623 : 0x4aa8ff,
        transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(site.pos.x, 0.05, site.pos.z);
    group.add(ring);
    rings[key] = ring;
  }

  let state = 'idle';
  let site = null;
  let timer = BOMB.fuseTime;
  let plantProgress = 0;
  let defuseProgress = 0;
  let planting = false;
  let beepAt = 0;
  let beeps = 0;
  let beepNow = false;
  const pos = new THREE.Vector3();

  function sitePos(name) {
    return name === 'A' ? world.siteA.pos : world.siteB.pos;
  }

  function startPlant(name) {
    if (state !== 'idle') return;
    site = name;
    planting = true;
    plantProgress = 0;
    bombMesh.visible = true;
    const p = sitePos(name);
    pos.set(p.x, 0.12, p.z);
    bombMesh.position.copy(pos);
  }

  function addPlant(dt) {
    if (!planting) return false;
    plantProgress += dt / BOMB.plantTime;
    if (plantProgress >= 1) {
      plantProgress = 1;
      planting = false;
      state = 'planted';
      timer = BOMB.fuseTime;
      beepAt = 0;
      beeps = 0;
      return true;
    }
    return false;
  }

  function cancelPlant() {
    planting = false;
    plantProgress = 0;
    if (state === 'idle') bombMesh.visible = false;
  }

  function plantNow(name) {
    site = name;
    state = 'planted';
    timer = BOMB.fuseTime;
    planting = false;
    plantProgress = 1;
    beepAt = 0;
    beeps = 0;
    const p = sitePos(name);
    pos.set(p.x, 0.12, p.z);
    bombMesh.position.copy(pos);
    bombMesh.visible = true;
  }

  function addDefuse(dt) {
    if (state !== 'planted') return false;
    defuseProgress += dt / BOMB.defuseTime;
    if (defuseProgress >= 1) {
      defuseProgress = 1;
      state = 'defused';
      return true;
    }
    return false;
  }

  function update(dt) {
    beepNow = false;
    // ring pulse
    const t = performance.now() * 0.001;
    for (const ring of Object.values(rings)) {
      ring.material.opacity = 0.4 + 0.2 * Math.sin(t * 2.4);
    }
    if (state === 'planted') {
      timer -= dt;
      const gap = timer > 20 ? 1 : timer > 10 ? 0.5 : 0.25;
      beepAt += dt;
      if (beepAt >= gap) {
        beepAt = 0;
        beeps += 1;
        beepNow = true;
      }
      lampMat.color.setHex(Math.floor(t * 4) % 2 ? 0xff3020 : 0x801008);
      if (timer <= 0) {
        timer = 0;
        state = 'exploded';
        bombMesh.visible = false;
      }
    } else if (state !== 'planted') {
      // defuse progress decays when nobody channels
      if (defuseProgress > 0 && state !== 'defused') defuseProgress = Math.max(0, defuseProgress - dt * 0.25);
    }
  }

  function reset() {
    state = 'idle';
    site = null;
    timer = BOMB.fuseTime;
    plantProgress = 0;
    defuseProgress = 0;
    planting = false;
    beepAt = 0;
    beeps = 0;
    pos.set(0, 0, 0);
    bombMesh.visible = false;
  }

  return {
    group, pos,
    get state() { return state; },
    get site() { return site; },
    get timer() { return timer; },
    get plantProgress() { return plantProgress; },
    get defuseProgress() { return defuseProgress; },
    get planting() { return planting; },
    get beep() { return beepNow; },
    get beeps() { return beeps; },
    startPlant, addPlant, cancelPlant, plantNow, addDefuse, update, reset,
  };
}
