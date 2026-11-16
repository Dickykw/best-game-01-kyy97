// Effects — pooled, zero per-frame allocation: tracers, impact sparks,
// explosions and enemy muzzle flashes. Everything is pre-allocated and
// reused round-robin.
import * as THREE from 'three';

const TRACERS = 24;
const IMPACTS = 12;
const EXPLOSIONS = 4;
const MUZZLES = 8;

export function createEffects(scene) {
  // ---- tracers: stretched additive boxes ----
  const tracers = [];
  const tracerGeo = new THREE.BoxGeometry(0.02, 0.02, 1);
  for (let i = 0; i < TRACERS; i++) {
    const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({
      color: 0xffd27a, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    m.visible = false;
    scene.add(m);
    tracers.push({ mesh: m, life: 0 });
  }
  let tracerNext = 0;
  const up = new THREE.Vector3(0, 0, 1);
  const dir = new THREE.Vector3();

  function tracer(from, to, color = 0xffd27a) {
    const t = tracers[tracerNext];
    tracerNext = (tracerNext + 1) % TRACERS;
    dir.copy(to).sub(from);
    const len = dir.length();
    if (len < 0.05) return;
    t.mesh.position.copy(from).addScaledVector(dir, 0.5);
    t.mesh.quaternion.setFromUnitVectors(up, dir.normalize());
    t.mesh.scale.set(1, 1, len);
    t.mesh.material.color.setHex(color);
    t.mesh.material.opacity = 0.9;
    t.mesh.visible = true;
    t.life = 0.08;
  }

  // ---- impacts: 14-particle spark bursts ----
  const impacts = [];
  for (let i = 0; i < IMPACTS; i++) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(14 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffc861, size: 0.09, transparent: true, opacity: 0, depthWrite: false,
    }));
    pts.visible = false;
    pts.frustumCulled = false;
    scene.add(pts);
    impacts.push({ pts, vel: new Float32Array(14 * 3), life: 0 });
  }
  let impactNext = 0;
  function impact(point, color = 0xffc861) {
    const im = impacts[impactNext];
    impactNext = (impactNext + 1) % IMPACTS;
    const attr = im.pts.geometry.getAttribute('position');
    for (let i = 0; i < 14; i++) {
      attr.array[i * 3] = point.x;
      attr.array[i * 3 + 1] = point.y;
      attr.array[i * 3 + 2] = point.z;
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * Math.PI - Math.PI / 2;
      const sp = 2 + Math.random() * 4;
      im.vel[i * 3] = Math.cos(a) * Math.cos(b) * sp;
      im.vel[i * 3 + 1] = Math.sin(b) * sp + 1.5;
      im.vel[i * 3 + 2] = Math.sin(a) * Math.cos(b) * sp;
    }
    attr.needsUpdate = true;
    im.pts.material.color.setHex(color);
    im.pts.material.opacity = 1;
    im.pts.visible = true;
    im.life = 0.35;
  }

  // ---- explosions: expanding sphere + light + smoke ----
  const explosions = [];
  for (let i = 0; i < EXPLOSIONS; i++) {
    const grp = new THREE.Group();
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xff8c2a, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    const light = new THREE.PointLight(0xff8c2a, 0, 14);
    grp.add(sphere);
    grp.add(light);
    grp.visible = false;
    scene.add(grp);
    explosions.push({ grp, sphere, light, life: 0 });
  }
  let explosionNext = 0;
  function explosion(point) {
    const e = explosions[explosionNext];
    explosionNext = (explosionNext + 1) % EXPLOSIONS;
    e.grp.position.copy(point);
    e.grp.visible = true;
    e.life = 0.6;
    e.sphere.scale.setScalar(0.3);
    e.sphere.material.opacity = 0.9;
    e.light.intensity = 6;
  }

  // ---- enemy muzzle flashes ----
  const muzzles = [];
  for (let i = 0; i < MUZZLES; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.3),
      new THREE.MeshBasicMaterial({
        color: 0xffd27a, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }),
    );
    const light = new THREE.PointLight(0xffc861, 0, 5);
    m.add(light);
    m.visible = false;
    scene.add(m);
    muzzles.push({ mesh: m, light, life: 0 });
  }
  let muzzleNext = 0;
  function muzzle(position) {
    const mz = muzzles[muzzleNext];
    muzzleNext = (muzzleNext + 1) % MUZZLES;
    mz.mesh.position.copy(position);
    mz.mesh.material.opacity = 0.95;
    mz.light.intensity = 2;
    mz.mesh.visible = true;
    mz.life = 0.05;
  }

  function step(dt) {
    for (const t of tracers) {
      if (t.life <= 0) continue;
      t.life -= dt;
      if (t.life <= 0) { t.mesh.visible = false; continue; }
      t.mesh.material.opacity = Math.max(0, (t.life / 0.08) * 0.9);
    }
    for (const im of impacts) {
      if (im.life <= 0) continue;
      im.life -= dt;
      if (im.life <= 0) { im.pts.visible = false; continue; }
      const attr = im.pts.geometry.getAttribute('position');
      for (let i = 0; i < 14; i++) {
        attr.array[i * 3] += im.vel[i * 3] * dt;
        attr.array[i * 3 + 1] += im.vel[i * 3 + 1] * dt;
        attr.array[i * 3 + 2] += im.vel[i * 3 + 2] * dt;
        im.vel[i * 3 + 1] -= 9 * dt;
      }
      attr.needsUpdate = true;
      im.pts.material.opacity = Math.max(0, im.life / 0.35);
    }
    for (const e of explosions) {
      if (e.life <= 0) continue;
      e.life -= dt;
      if (e.life <= 0) { e.grp.visible = false; e.light.intensity = 0; continue; }
      const p = 1 - e.life / 0.6;
      e.sphere.scale.setScalar(0.3 + p * 5.5);
      e.sphere.material.opacity = Math.max(0, 0.9 * (1 - p));
      e.light.intensity = Math.max(0, 6 * (1 - p));
    }
    for (const mz of muzzles) {
      if (mz.life <= 0) continue;
      mz.life -= dt;
      if (mz.life <= 0) { mz.mesh.visible = false; mz.light.intensity = 0; continue; }
      mz.mesh.material.opacity = Math.max(0, (mz.life / 0.05) * 0.95);
      mz.light.intensity = Math.max(0, (mz.life / 0.05) * 2);
    }
  }

  return { tracer, impact, explosion, muzzle, step };
}
