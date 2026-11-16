// Dusty Yard — the arena. A 56 x 40 m open-air industrial yard at dusk:
// three lanes (A west, mid, B east) run from the player spawn in the south
// to two bomb sites in the north. Everything solid is a Box3 collider;
// everything a bullet can hit is in shootables.
import * as THREE from 'three';
import { ARENA, PALETTE } from './config.js';
import { createTextures, makeSkyTexture, makeGlowTexture } from './textures.js';

const MAT = {};
function mat(key, params) {
  if (!MAT[key]) MAT[key] = new THREE.MeshStandardMaterial(params);
  return MAT[key];
}

function box(w, h, d, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function createWorld(scene) {
  const tex = createTextures();
  const colliders = [];
  const shootables = [];
  const group = new THREE.Group();
  scene.add(group);

  function solid(mesh, x, y, z, ry = 0) {
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    mesh.updateMatrixWorld(true);
    group.add(mesh);
    const b = new THREE.Box3().setFromObject(mesh);
    colliders.push(b);
    shootables.push(mesh);
    return mesh;
  }
  function visual(mesh, x, y, z, ry = 0) {
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    group.add(mesh);
    shootables.push(mesh);
    return mesh;
  }

  // ---- ground ----
  const groundMat = new THREE.MeshStandardMaterial({ map: tex.ground, roughness: 0.95, metalness: 0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.width + 8, ARENA.depth + 8), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  shootables.push(ground);

  // ---- outer walls ----
  const wallMat = new THREE.MeshStandardMaterial({ map: tex.wall, roughness: 0.9, metalness: 0.05 });
  const W = ARENA.width, D = ARENA.depth, H = ARENA.wallHeight;
  solid(box(W + 2, H, 1, wallMat), 0, H / 2, -D / 2 - 0.5);
  solid(box(W + 2, H, 1, wallMat), 0, H / 2, D / 2 + 0.5);
  solid(box(1, H, D + 2, wallMat), -W / 2 - 0.5, H / 2, 0);
  solid(box(1, H, D + 2, wallMat), W / 2 + 0.5, H / 2, 0);
  // hazard trim on the top of the north wall
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(W + 2, 0.22, 1.1),
    new THREE.MeshStandardMaterial({ map: tex.hazard, roughness: 0.8 }),
  );
  visual(trim, 0, H + 0.11, -D / 2 - 0.5);

  // ---- site floors (painted A / B pads) ----
  const padA = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 11),
    new THREE.MeshStandardMaterial({ map: tex.siteFloorA, roughness: 0.9 }),
  );
  padA.rotation.x = -Math.PI / 2;
  padA.position.set(ARENA.siteA.x, 0.02, ARENA.siteA.z);
  padA.receiveShadow = true;
  group.add(padA);
  const padB = padA.clone();
  padB.material = new THREE.MeshStandardMaterial({ map: tex.siteFloorB, roughness: 0.9 });
  padB.position.set(ARENA.siteB.x, 0.02, ARENA.siteB.z);
  group.add(padB);

  // ---- cover: crates, stacks, walls, barrels, container, tower ----
  const wood = new THREE.MeshStandardMaterial({ map: tex.crateWood, roughness: 0.85 });
  const metal = new THREE.MeshStandardMaterial({ map: tex.crateMetal, roughness: 0.6, metalness: 0.35 });
  const conc = new THREE.MeshStandardMaterial({ map: tex.wall, roughness: 0.9 });
  const rust = new THREE.MeshStandardMaterial({ color: PALETTE.rust, roughness: 0.7, metalness: 0.3 });

  // A lane (west): crates + low wall + stack guarding site A
  solid(box(2.2, 1.1, 2.2, wood), -22, 0.55, -6, 0.2);
  solid(box(2.2, 1.1, 2.2, wood), -20, 0.55, -4.4, -0.15);
  solid(box(2.2, 2.2, 2.2, metal), -23.5, 1.1, -11, 0.1);
  solid(box(4.5, 1.2, 0.6, conc), -14, 0.6, -9.5, 0);
  solid(box(1.1, 1.1, 1.1, wood), -15.5, 0.55, -15.5, 0.4);
  solid(box(1.1, 1.1, 1.1, wood), -24, 0.55, -16.5, -0.3);
  // B lane (east): crates + pipes + stack guarding site B
  solid(box(2.2, 1.1, 2.2, wood), 22, 0.55, -6, -0.2);
  solid(box(2.2, 1.1, 2.2, wood), 20, 0.55, -4.4, 0.15);
  solid(box(2.2, 2.2, 2.2, metal), 23.5, 1.1, -11, -0.1);
  solid(box(4.5, 1.2, 0.6, conc), 14, 0.6, -9.5, 0);
  solid(box(1.1, 1.1, 1.1, wood), 15.5, 0.55, -15.5, -0.4);
  solid(box(1.1, 1.1, 1.1, wood), 24, 0.55, -16.5, 0.3);
  // east pipes (visual + solid base)
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x4a5a60, roughness: 0.45, metalness: 0.6 });
  for (let i = 0; i < 3; i++) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.28 - i * 0.05, 0.28 - i * 0.05, 16, 12), pipeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.rotation.z = 0;
    visual(pipe, 26.6, 0.5 + i * 0.55, -2);
  }
  solid(box(0.8, 1.6, 16, metal), 26.8, 0.8, -2);
  // mid: pillar, crates, jump-on platform
  solid(box(1.6, 3.4, 1.6, conc), -2, 1.7, 2, 0);
  solid(box(2.2, 1.1, 2.2, wood), 3.5, 0.55, -2, 0.3);
  solid(box(2.2, 1.1, 2.2, wood), 4.5, 0.55, -4, -0.2);
  solid(box(2.4, 0.5, 2.4, metal), -6, 0.25, 6, 0);
  solid(box(1.1, 1.1, 1.1, wood), -8, 0.55, -3, 0.5);
  // south: watchtower (west) + sandbags (east) near player spawn
  solid(box(3, 2.6, 0.4, wood), -12, 1.3, 12, 0.35);
  const towerLeg = new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 0.9 });
  for (const [lx, lz] of [[-24, 8], [-21, 8], [-24, 11], [-21, 11]]) {
    solid(box(0.3, 3.4, 0.3, towerLeg), lx, 1.7, lz);
  }
  solid(box(3.6, 0.25, 3.6, wood), -22.5, 3.5, 9.5);
  solid(box(3.6, 0.9, 0.15, wood), -22.5, 4.1, 7.8);
  // sandbags
  for (let i = 0; i < 5; i++) {
    solid(box(1.6, 0.55, 0.7, conc), 10 + i * 1.7, 0.28, 12.5, (i % 2 ? 0.12 : -0.1));
  }
  // container (solid, not walkable) centre-north
  solid(box(6, 2.6, 2.6, rust), 0, 1.3, -12, 0);
  // barrels
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x7a4a22, roughness: 0.6, metalness: 0.4 });
  for (const [bx, bz] of [[-6, -14], [-4.6, -14.4], [8, 4], [9.4, 4.6], [-16, 2]]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.05, 14), barrelMat);
    solid(barrel, bx, 0.53, bz);
  }
  // scattered mid crates for the long sightline to break up
  solid(box(1.1, 1.1, 1.1, wood), 0.5, 0.55, 8, 0.7);
  solid(box(1.1, 1.1, 1.1, wood), -3, 0.55, 12, -0.4);

  // ---- lighting: amber dusk sun + cool fill + hemisphere ----
  const sun = new THREE.DirectionalLight(new THREE.Color(PALETTE.sun), 3.2);
  sun.position.set(-32, 14, -18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35;
  sun.shadow.camera.bottom = -35;
  sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(new THREE.Color('#2e5f6e'), new THREE.Color('#8a6f4d'), 1.3));
  const fill = new THREE.DirectionalLight(new THREE.Color('#7fa8c9'), 0.7);
  fill.position.set(30, 10, 24);
  scene.add(fill);

  scene.fog = new THREE.Fog(new THREE.Color(PALETTE.dusk), 25, 70);
  scene.background = new THREE.Color(PALETTE.skyTop);

  // sky dome + sun glare sprite
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(90, 24, 16),
    new THREE.MeshBasicMaterial({ map: makeSkyTexture(), side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);
  const glare = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(), transparent: true, depthWrite: false, fog: false,
  }));
  glare.scale.set(26, 26, 1);
  glare.position.set(-58, 26, -34);
  scene.add(glare);

  // ---- routes: bot lanes (ground level, clear of colliders) ----
  const v = (x, z) => new THREE.Vector3(x, 0, z);
  const routes = {
    A: [v(-20, -15), v(-22, -10), v(-19, -6), v(-16, -10), v(-19, -13.5)],
    B: [v(20, -15), v(22, -10), v(19, -6), v(16, -10), v(19, -13.5)],
    mid: [v(0, -14), v(1, -6), v(-1, 2), v(0, 10), v(2, 16)],
  };

  return {
    colliders, shootables, group,
    playerSpawn: { pos: new THREE.Vector3(ARENA.playerSpawn.x, 0, ARENA.playerSpawn.z), yaw: ARENA.playerSpawn.yaw },
    enemySpawns: ARENA.enemySpawns.map((s) => ({ pos: new THREE.Vector3(s.x, 0, s.z), yaw: Math.PI })),
    siteA: { pos: new THREE.Vector3(ARENA.siteA.x, 0, ARENA.siteA.z), radius: ARENA.siteA.radius, name: 'A' },
    siteB: { pos: new THREE.Vector3(ARENA.siteB.x, 0, ARENA.siteB.z), radius: ARENA.siteB.radius, name: 'B' },
    routes,
    bounds: ARENA.bounds,
  };
}
