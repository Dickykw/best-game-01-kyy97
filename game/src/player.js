// Player — first-person movement, camera and health. Axis-separated AABB
// collision against the world's Box3 colliders, so the player slides along
// walls instead of sticking to them.
import * as THREE from 'three';
import { PLAYER } from './config.js';

export function createPlayer(camera, world) {
  const pos = new THREE.Vector3(world.playerSpawn.pos.x, 0, world.playerSpawn.pos.z);
  const vel = new THREE.Vector3();
  let yaw = world.playerSpawn.yaw;
  let pitch = 0;
  let crouching = false;
  let onGround = true;
  let health = PLAYER.health;
  let alive = true;

  const eye = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();
  const box = new THREE.Box3();
  const tmp = new THREE.Vector3();

  function eyeHeight() {
    return crouching ? PLAYER.eyeCrouch : PLAYER.eyeStand;
  }

  function collideAxis(axis) {
    const r = PLAYER.radius;
    const h = eyeHeight();
    box.min.set(pos.x - r, pos.y, pos.z - r);
    box.max.set(pos.x + r, pos.y + h, pos.z + r);
    for (const c of world.colliders) {
      if (!box.intersectsBox(c)) continue;
      if (axis === 'x') {
        pos.x = vel.x > 0 ? c.min.x - r - 0.001 : c.max.x + r + 0.001;
        vel.x = 0;
      } else if (axis === 'z') {
        pos.z = vel.z > 0 ? c.min.z - r - 0.001 : c.max.z + r + 0.001;
        vel.z = 0;
      } else {
        if (vel.y <= 0) { pos.y = c.max.y; vel.y = 0; onGround = true; }
        else { pos.y = c.min.y - h - 0.001; vel.y = 0; }
      }
      box.min.set(pos.x - r, pos.y, pos.z - r);
      box.max.set(pos.x + r, pos.y + h, pos.z + r);
    }
  }

  function step(dt, input) {
    if (!alive) {
      vel.set(0, 0, 0);
      return;
    }
    crouching = input.crouch;
    const speed = crouching ? PLAYER.crouchSpeed : PLAYER.walkSpeed;
    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    right.set(-fwd.z, 0, fwd.x);
    move.set(0, 0, 0);
    if (input.forward) move.add(fwd);
    if (input.back) move.sub(fwd);
    if (input.right) move.add(right);
    if (input.left) move.sub(right);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);
    const a = PLAYER.accel * dt;
    vel.x += (move.x - vel.x) * Math.min(1, a / speed + 0.25);
    vel.z += (move.z - vel.z) * Math.min(1, a / speed + 0.25);
    // friction when no input
    if (move.lengthSq() === 0) {
      const f = Math.max(0, 1 - PLAYER.friction * dt);
      vel.x *= f;
      vel.z *= f;
    }
    if (input.jump && onGround) {
      vel.y = PLAYER.jumpSpeed;
      onGround = false;
    }
    vel.y -= PLAYER.gravity * dt;
    pos.x += vel.x * dt;
    collideAxis('x');
    pos.z += vel.z * dt;
    collideAxis('z');
    pos.y += vel.y * dt;
    if (pos.y <= 0) { pos.y = 0; vel.y = 0; onGround = true; }
    else collideAxis('y');
    // arena bounds
    pos.x = Math.max(world.bounds.minX, Math.min(world.bounds.maxX, pos.x));
    pos.z = Math.max(world.bounds.minZ, Math.min(world.bounds.maxZ, pos.z));
    // camera
    eye.set(pos.x, pos.y + eyeHeight(), pos.z);
    camera.position.copy(eye);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(pitch, yaw, 0);
  }

  function look(dx, dy) {
    yaw -= dx * 0.0021;
    pitch -= dy * 0.0021;
    pitch = Math.max(-1.45, Math.min(1.45, pitch));
  }

  function groundSpeed() {
    return Math.hypot(vel.x, vel.z);
  }

  function damage(amount) {
    if (!alive) return false;
    health -= amount;
    if (health <= 0) {
      health = 0;
      alive = false;
      return true;
    }
    return false;
  }

  function reset() {
    pos.set(world.playerSpawn.pos.x, 0, world.playerSpawn.pos.z);
    vel.set(0, 0, 0);
    yaw = world.playerSpawn.yaw;
    pitch = 0;
    health = PLAYER.health;
    alive = true;
    crouching = false;
  }

  return {
    pos, vel,
    get yaw() { return yaw; },
    get pitch() { return pitch; },
    get crouching() { return crouching; },
    get health() { return health; },
    get alive() { return alive; },
    get onGround() { return onGround; },
    step, look, groundSpeed, damage, reset,
    eyePos(out) { return (out || tmp).set(pos.x, pos.y + eyeHeight(), pos.z); },
  };
}
