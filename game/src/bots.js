// Vipers — five enemy bots. Humanoid models built from boxes, an AI that
// patrols lanes, holds sites, engages on sight, investigates noise and
// defuses a planted bomb. No aimbot: they react late, strafe, miss often
// and lose the player after a second without line of sight.
import * as THREE from 'three';
import { BOTS } from './config.js';

const SKINS = [0x5a3a28, 0x3a4a2e, 0x2e3a4a, 0x4a2e3a, 0x3a3a3a];
const NAMES = ['Viper-1', 'Viper-2', 'Viper-3', 'Viper-4', 'Viper-5'];

function buildViper(skin) {
  const group = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.85, metalness: 0.1 });
  const vest = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.7, metalness: 0.3 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc9a586, roughness: 0.8 });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x1a1c1f, roughness: 0.4, metalness: 0.7 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.3), suit);
  torso.position.y = 1.05;
  torso.castShadow = true;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.08), vest);
  plate.position.set(0, 1.08, 0.17);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), skinMat);
  head.position.y = 1.55;
  head.castShadow = true;
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.34), vest);
  helmet.position.y = 1.68;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.04), new THREE.MeshStandardMaterial({ color: 0xff5a2a, emissive: 0x881800, roughness: 0.3 }));
  visor.position.set(0, 1.56, 0.16);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.22), suit);
  legL.position.set(-0.14, 0.38, 0);
  const legR = legL.clone();
  legR.position.x = 0.14;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.16), suit);
  armL.position.set(-0.33, 1.05, 0.08);
  armL.rotation.x = -0.9;
  const armR = armL.clone();
  armR.position.x = 0.33;
  const gun = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.62), gunMat);
  barrel.position.set(0, 0, -0.2);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.06), gunMat);
  grip.position.set(0, -0.09, 0.05);
  gun.add(barrel, grip);
  gun.position.set(0.18, 1.18, 0.25);
  group.add(torso, plate, head, helmet, visor, legL, legR, armL, armR, gun);
  // hit parts: clone materials so a flash lights only this bot
  for (const m of [torso, head, legL, legR, armL, armR]) m.material = m.material.clone();
  return { group, head, torso, gun, legL, legR, mats: [torso.material, head.material, legL.material, legR.material, armL.material, armR.material] };
}

function shotBuffer(ctx, freq) {
  const len = Math.floor(ctx.sampleRate * 0.12);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.6;
  return buf;
}

export function createBots(scene, world, listener = null) {
  const bots = [];
  const hitMeshes = [];
  const ray = new THREE.Raycaster();
  const losDir = new THREE.Vector3();
  const toPlayer = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();
  const eyePos = new THREE.Vector3();
  let audioCtx = null;
  let shotBuf = null;

  function ensureAudio() {
    if (listener && !audioCtx) {
      audioCtx = listener.context;
      try { shotBuf = shotBuffer(audioCtx, 0); } catch { shotBuf = null; }
    }
    return audioCtx;
  }

  for (let i = 0; i < BOTS.count; i++) {
    const spawn = world.enemySpawns[i % world.enemySpawns.length];
    const { group, head, torso, gun, legL, legR, mats } = buildViper(SKINS[i % SKINS.length]);
    group.position.copy(spawn.pos);
    group.rotation.y = spawn.yaw;
    scene.add(group);
    const routes = [world.routes.A, world.routes.B, world.routes.mid];
    const route = routes[i % routes.length];
    const bot = {
      group, head, torso, gun, legL, legR, mats,
      name: NAMES[i],
      health: BOTS.health, alive: true, state: 'patrol',
      pos: group.position, yaw: spawn.yaw, speed: BOTS.walkSpeed,
      route, routeIndex: 0, holdPos: new THREE.Vector3().copy(spawn.pos),
      lastSeen: new THREE.Vector3(), seenAt: -99,
      shootCooldown: 0, reactionAt: 0, hasSeen: false,
      strafeDir: i % 2 ? 1 : -1, strafeAt: 0,
      walkPhase: Math.random() * 6,
      flashLeft: 0,
      audio: null,
    };
    if (listener) {
      try {
        const pa = new THREE.PositionalAudio(listener);
        pa.setRefDistance(6);
        pa.setMaxDistance(55);
        group.add(pa);
        bot.audio = pa;
      } catch { bot.audio = null; }
    }
    bot.pos = group.position;
    bots.push(bot);
    for (const [mesh, part] of [[head, 'head'], [torso, 'torso'], [legL, 'limb'], [legR, 'limb']]) {
      mesh.userData.bot = bot;
      mesh.userData.part = part;
      hitMeshes.push(mesh);
    }
  }

  function hasLOS(from, to) {
    losDir.copy(to).sub(from);
    const dist = losDir.length();
    if (dist > BOTS.sightRange) return false;
    ray.set(from, losDir.normalize());
    ray.far = dist;
    const hits = ray.intersectObjects(world.shootables, false);
    return hits.length === 0;
  }

  function seesPlayer(bot, playerPos, playerCrouching, playerSpeed) {
    eyePos.copy(bot.pos);
    eyePos.y = 1.55;
    toPlayer.copy(playerPos);
    toPlayer.y = 1.3;
    const dist = eyePos.distanceTo(toPlayer);
    if (dist > BOTS.sightRange) return false;
    // cone: ~150 degrees
    tmpV.copy(toPlayer).sub(eyePos).normalize();
    const facing = new THREE.Vector3(-Math.sin(bot.yaw), 0, -Math.cos(bot.yaw));
    if (tmpV.dot(facing) < -0.25 && dist > 3) return false;
    return hasLOS(eyePos, toPlayer);
  }

  function moveBot(bot, dt, tx, tz) {
    tmpV.set(tx - bot.pos.x, 0, tz - bot.pos.z);
    const dist = tmpV.length();
    if (dist < 0.05) return true;
    tmpV.normalize();
    const stepLen = Math.min(dist, bot.speed * dt);
    // axis separated against colliders
    const r = 0.4;
    let nx = bot.pos.x + tmpV.x * stepLen;
    let nz = bot.pos.z + tmpV.z * stepLen;
    const box = new THREE.Box3();
    box.min.set(nx - r, 0, bot.pos.z - r);
    box.max.set(nx + r, 1.8, bot.pos.z + r);
    let blockedX = false;
    for (const c of world.colliders) if (box.intersectsBox(c)) { blockedX = true; break; }
    if (!blockedX) bot.pos.x = nx;
    box.min.set(bot.pos.x - r, 0, nz - r);
    box.max.set(bot.pos.x + r, 1.8, nz + r);
    let blockedZ = false;
    for (const c of world.colliders) if (box.intersectsBox(c)) { blockedZ = true; break; }
    if (!blockedZ) bot.pos.z = nz;
    // separation between bots
    for (const other of bots) {
      if (other === bot || !other.alive) continue;
      const dx = bot.pos.x - other.pos.x;
      const dz = bot.pos.z - other.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.001 && d < BOTS.separation) {
        bot.pos.x += (dx / d) * (BOTS.separation - d) * 0.5;
        bot.pos.z += (dz / d) * (BOTS.separation - d) * 0.5;
      }
    }
    bot.pos.x = Math.max(world.bounds.minX, Math.min(world.bounds.maxX, bot.pos.x));
    bot.pos.z = Math.max(world.bounds.minZ, Math.min(world.bounds.maxZ, bot.pos.z));
    // face movement
    const targetYaw = Math.atan2(-tmpV.x, -tmpV.z);
    let dy = targetYaw - bot.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    bot.yaw += dy * Math.min(1, dt * 6);
    bot.group.rotation.y = bot.yaw;
    // walk cycle
    bot.walkPhase += dt * 9;
    bot.legL.rotation.x = Math.sin(bot.walkPhase) * 0.5;
    bot.legR.rotation.x = -Math.sin(bot.walkPhase) * 0.5;
    return dist - stepLen < 0.6;
  }

  function damage(mesh, amount) {
    const bot = mesh.userData.bot;
    if (!bot || !bot.alive) return { killed: false, bot: null };
    bot.health -= amount;
    for (const m of bot.mats) {
      m.emissive = new THREE.Color(0xff8c2a);
      m.emissiveIntensity = 0.9;
    }
    bot.flashLeft = 0.09;
    if (bot.health <= 0) {
      bot.health = 0;
      bot.alive = false;
      bot.state = 'dead';
      bot.group.rotation.x = -Math.PI / 2;
      bot.group.position.y = 0.35;
      return { killed: true, bot };
    }
    return { killed: false, bot };
  }

  function reset() {
    for (let i = 0; i < bots.length; i++) {
      const bot = bots[i];
      const spawn = world.enemySpawns[i % world.enemySpawns.length];
      bot.group.position.copy(spawn.pos);
      bot.group.position.y = 0;
      bot.group.rotation.set(0, spawn.yaw, 0);
      bot.yaw = spawn.yaw;
      bot.health = BOTS.health;
      bot.alive = true;
      bot.state = 'patrol';
      bot.routeIndex = 0;
      bot.hasSeen = false;
      bot.seenAt = -99;
      bot.shootCooldown = 0;
      bot.flashLeft = 0;
      for (const m of bot.mats) { m.emissive = new THREE.Color(0x000000); m.emissiveIntensity = 0; }
    }
  }

  function aliveCount() {
    let n = 0;
    for (const b of bots) if (b.alive) n++;
    return n;
  }

  let objective = null;
  function setObjective(site) {
    objective = site;
    if (!site) return;
    const target = site === 'A' ? world.siteA.pos : world.siteB.pos;
    for (const bot of bots) {
      if (!bot.alive) continue;
      bot.route = site === 'A' ? world.routes.A : world.routes.B;
      bot.routeIndex = 0;
      if (bot.state === 'patrol' || bot.state === 'hold') bot.state = 'patrol';
    }
  }

  const events = [];
  let defuseBot = null;
  let defuseProgress = 0;

  function update(dt, ctx) {
    events.length = 0;
    defuseBot = null;
    const time = ctx.time;
    // nearest living bot to the planted site defuses
    if (ctx.bombPlanted && ctx.bombSite) {
      const sitePos = ctx.bombSite === 'A' ? world.siteA.pos : world.siteB.pos;
      let best = null, bestD = Infinity;
      for (const bot of bots) {
        if (!bot.alive) continue;
        const d = Math.hypot(bot.pos.x - sitePos.x, bot.pos.z - sitePos.z);
        if (d < bestD) { bestD = d; best = bot; }
      }
      if (best) {
        best.state = 'defuse';
        defuseBot = best;
      }
    }
    for (const bot of bots) {
      if (!bot.alive) continue;
      // hit flash decay
      if (bot.flashLeft > 0) {
        bot.flashLeft -= dt;
        if (bot.flashLeft <= 0) {
          for (const m of bot.mats) { m.emissive = new THREE.Color(0x000000); m.emissiveIntensity = 0; }
        }
      }
      const playerPos = ctx.playerPos;
      const seen = ctx.playerAlive && seesPlayer(bot, playerPos, ctx.playerCrouching, ctx.playerSpeed);
      if (seen) {
        bot.lastSeen.copy(playerPos);
        bot.seenAt = time;
        if (!bot.hasSeen) {
          bot.hasSeen = true;
          bot.reactionAt = time + BOTS.reactMin + Math.random() * (BOTS.reactMax - BOTS.reactMin);
        }
        if (bot.state !== 'defuse') bot.state = 'engage';
      } else if (bot.state === 'engage' && time - bot.seenAt > BOTS.loseSight) {
        bot.state = 'investigate';
        bot.hasSeen = false;
      }
      if (ctx.noisePos && bot.state !== 'engage' && bot.state !== 'defuse') {
        bot.state = 'investigate';
        bot.lastSeen.copy(ctx.noisePos);
      }

      if (bot.state === 'defuse' && defuseBot === bot) {
        const sitePos = ctx.bombSite === 'A' ? world.siteA.pos : world.siteB.pos;
        const arrived = moveBot(bot, dt, sitePos.x, sitePos.z);
        if (arrived) {
          defuseProgress += dt / 5;
          events.push({ defusing: true, progress: Math.min(1, defuseProgress), bot });
          // face the bomb
          bot.yaw = Math.atan2(-(sitePos.x - bot.pos.x), -(sitePos.z - bot.pos.z));
          bot.group.rotation.y = bot.yaw;
        }
        continue;
      }
      if (bot.state === 'defuse') { bot.state = 'hold'; }

      if (bot.state === 'engage') {
        // face the player
        tmpV.copy(playerPos).sub(bot.pos);
        bot.yaw = Math.atan2(-tmpV.x, -tmpV.z);
        bot.group.rotation.y = bot.yaw;
        // strafe
        if (time - bot.strafeAt > 1.1) {
          bot.strafeAt = time;
          bot.strafeDir *= -1;
        }
        const side = new THREE.Vector3(-Math.cos(bot.yaw), 0, Math.sin(bot.yaw));
        const sx = bot.pos.x + side.x * bot.strafeDir * bot.speed * 0.5 * dt;
        const sz = bot.pos.z + side.z * bot.strafeDir * bot.speed * 0.5 * dt;
        moveBot(bot, dt, sx, sz);
        // shoot after the reaction delay
        bot.shootCooldown -= dt;
        if (seen && time >= bot.reactionAt && bot.shootCooldown <= 0) {
          bot.shootCooldown = BOTS.shotMin + Math.random() * (BOTS.shotMax - BOTS.shotMin);
          const dist = bot.pos.distanceTo(playerPos);
          let chance = dist < 10 ? BOTS.hitNear : BOTS.hitFar + (BOTS.hitNear - BOTS.hitFar) * Math.max(0, 1 - (dist - 10) / 30);
          if (ctx.playerSpeed > 3) chance -= 0.12;
          if (ctx.playerCrouching) chance -= 0.08;
          chance += Math.min(0.09, 0.03 * Math.max(0, time - bot.seenAt));
          chance = Math.max(0.03, Math.min(0.55, chance));
          const hit = Math.random() < chance;
          const damage = hit ? BOTS.damageMin + Math.random() * (BOTS.damageMax - BOTS.damageMin) : 0;
          tmpV2.copy(bot.pos);
          tmpV2.y = 1.35;
          const from = tmpV2.clone();
          const to = new THREE.Vector3(playerPos.x, 1.3, playerPos.z);
          if (!hit) {
            to.x += (Math.random() - 0.5) * 2.2;
            to.y += (Math.random() - 0.5) * 1.2;
            to.z += (Math.random() - 0.5) * 2.2;
          }
          events.push({ from, to, hit, damage });
          // directional shot sound
          if (bot.audio && ensureAudio() && audioCtx && audioCtx.state === 'running' && shotBuf) {
            try {
              const src = audioCtx.createBufferSource();
              src.buffer = shotBuf;
              bot.audio.setBuffer(src.buffer);
              bot.audio.setVolume(0.7);
              bot.audio.play();
            } catch { /* sound never breaks AI */ }
          }
        }
      } else if (bot.state === 'investigate') {
        const arrived = moveBot(bot, dt, bot.lastSeen.x, bot.lastSeen.z);
        if (arrived) {
          // scan, then resume patrol
          bot.yaw += dt * 1.2;
          bot.group.rotation.y = bot.yaw;
          if (time - bot.seenAt > 2.5) {
            bot.state = 'patrol';
            bot.routeIndex = 0;
          }
        }
      } else {
        // patrol / hold
        if (bot.state === 'hold') {
          bot.yaw += dt * 0.5;
          bot.group.rotation.y = bot.yaw;
          bot.legL.rotation.x = 0;
          bot.legR.rotation.x = 0;
          continue;
        }
        const wp = bot.route[bot.routeIndex % bot.route.length];
        const arrived = moveBot(bot, dt, wp.x, wp.z);
        if (arrived) {
          bot.routeIndex += 1;
          if (bot.routeIndex >= bot.route.length) {
            bot.state = 'hold';
            bot.holdPos.copy(bot.pos);
          }
        }
      }
    }
    if (!defuseBot) defuseProgress = 0;
    return events;
  }

  return {
    bots, hitMeshes, update, damage, reset, aliveCount, setObjective,
    get defuseProgress() { return defuseBot ? Math.min(1, defuseProgress) : 0; },
    get defusingBot() { return defuseBot; },
    get objective() { return objective; },
  };
}
