// Grenade sim — a small pool of live grenades with bounce physics and a
// fuse. Gravity, sphere-vs-Box3 bounce, floor at y=0 always solid.
// Fuse: 1.6 s after the first bounce, or 2.2 s total, whichever first.
import * as THREE from 'three';

const POOL = 4;
const GRAVITY = -16;
const THROW_SPEED = 13;
const FUSE_BOUNCE = 1.6;
const FUSE_TOTAL = 2.2;
const REST_SPEED = 1.2;

export function createGrenadeSim(scene) {
  const slots = [];
  const geo = new THREE.SphereGeometry(0.09, 12, 10);
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a4a2e, roughness: 0.5, metalness: 0.5 });
  for (let i = 0; i < POOL; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    slots.push({
      mesh, live: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      age: 0, bouncedAt: -1, id: i,
    });
  }
  let next = 0;
  let colliders = [];
  const tmp = new THREE.Vector3();
  const closest = new THREE.Vector3();

  function setColliders(list) { colliders = list; }

  function throwGrenade(origin, dir) {
    const s = slots[next];
    next = (next + 1) % POOL;
    s.live = true;
    s.pos.copy(origin);
    s.vel.copy(dir).normalize().multiplyScalar(THROW_SPEED);
    s.vel.y += 2;
    s.age = 0;
    s.bouncedAt = -1;
    s.mesh.visible = true;
    s.mesh.position.copy(s.pos);
    return s.id;
  }

  function damageAt(dist) {
    if (dist >= 6) return 0;
    return 120 - (110 * dist) / 6;
  }

  function update(dt) {
    const booms = [];
    for (const s of slots) {
      if (!s.live) continue;
      s.age += dt;
      s.vel.y += GRAVITY * dt;
      s.pos.addScaledVector(s.vel, dt);
      // floor
      if (s.pos.y < 0.09) {
        s.pos.y = 0.09;
        if (Math.abs(s.vel.y) > 0.5) {
          s.vel.y = -s.vel.y * 0.45;
          if (s.bouncedAt < 0) s.bouncedAt = s.age;
        } else s.vel.y = 0;
        s.vel.x *= 0.8;
        s.vel.z *= 0.8;
      }
      // boxes: closest-point bounce
      for (const c of colliders) {
        closest.set(
          Math.max(c.min.x, Math.min(s.pos.x, c.max.x)),
          Math.max(c.min.y, Math.min(s.pos.y, c.max.y)),
          Math.max(c.min.z, Math.min(s.pos.z, c.max.z)),
        );
        tmp.copy(s.pos).sub(closest);
        const d = tmp.length();
        if (d < 0.09 && d > 0.0001) {
          tmp.divideScalar(d);
          const vn = s.vel.dot(tmp);
          if (vn < 0) {
            s.vel.addScaledVector(tmp, -vn * 1.45);
            if (s.bouncedAt < 0) s.bouncedAt = s.age;
          }
          s.pos.copy(closest).addScaledVector(tmp, 0.1);
        }
      }
      // rest
      if (s.vel.length() < REST_SPEED && s.pos.y <= 0.1) s.vel.set(0, 0, 0);
      s.mesh.position.copy(s.pos);
      // fuse
      const fuse = s.bouncedAt >= 0 ? s.bouncedAt + FUSE_BOUNCE : FUSE_TOTAL;
      if (s.age >= fuse) {
        s.live = false;
        s.mesh.visible = false;
        booms.push({
          pos: s.pos.clone(), radius: 6, maxDamage: 120, minDamage: 10, damageAt,
        });
      }
    }
    return booms;
  }

  return {
    throwGrenade, update, setColliders, damageAt,
    get count() { return slots.filter((s) => s.live).length; },
    get live() { return slots.filter((s) => s.live).length; },
  };
}
