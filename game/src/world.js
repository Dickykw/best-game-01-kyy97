// Dusty Yard — the arena. A 56 x 40 m open-air industrial yard at dusk:
// three lanes (A west, mid, B east) run from the player spawn in the south
// to two bomb sites in the north. Everything solid is a Box3 collider;
// everything a bullet can hit is in shootables.
// Visual polish pass: distant silhouettes break the flat horizon, wall
// coping + lamps + zone stripes give the walls a profile, stacked
// containers and ribbed drums add height and texture variety. Every new
// prop is visual-only (no collider, not shootable) unless noted, so the
// cover layout and bot routes are unchanged.
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
  // Pure decoration: in shootables so a tracer can spark off it, but no
  // collider — the player and bots never touch it.
  function decor(mesh, x, y, z, ry = 0) {
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
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
  // coping: a lighter cap strip on every wall so the top edge has a profile
  const copeMat = new THREE.MeshStandardMaterial({ color: 0xa89a80, roughness: 0.85 });
  decor(box(W + 2.4, 0.28, 1.4, copeMat), 0, H + 0.14, -D / 2 - 0.5);
  decor(box(W + 2.4, 0.28, 1.4, copeMat), 0, H + 0.14, D / 2 + 0.5);
  decor(box(1.4, 0.28, D + 2.4, copeMat), -W / 2 - 0.5, H + 0.14, 0);
  decor(box(1.4, 0.28, D + 2.4, copeMat), W / 2 + 0.5, H + 0.14, 0);
  // hazard trim on the top of the north wall
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(W + 2, 0.22, 1.1),
    new THREE.MeshStandardMaterial({ map: tex.hazard, roughness: 0.8 }),
  );
  visual(trim, 0, H + 0.11, -D / 2 - 0.5);

  // ---- zone stripes on the north wall: A amber, B blue ----
  const stripeA = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.9, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xf5a623, roughness: 0.6, emissive: 0x442200 }),
  );
  decor(stripeA, -19, 3.6, -D / 2 + 0.06);
  const stripeB = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.9, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x4aa8ff, roughness: 0.6, emissive: 0x001a33 }),
  );
  decor(stripeB, 19, 3.6, -D / 2 + 0.06);
  // wall props on the north wall: vent box + pipes (above head height)
  const ventMat = new THREE.MeshStandardMaterial({ color: 0x4a5054, roughness: 0.5, metalness: 0.5 });
  decor(box(1.6, 1.2, 0.5, ventMat), -8, 3.4, -D / 2 + 0.3);
  decor(box(1.2, 1.0, 0.5, ventMat), 8, 3.5, -D / 2 + 0.3);
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x6a5a42, roughness: 0.45, metalness: 0.6 });
  for (const px of [-12, -11.4, 12, 12.6]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.2, 10), pipeMat);
    decor(pipe, px, 2.1, -D / 2 + 0.62);
  }
  // wall lamps: warm emissive heads on the walls, arms reaching into the yard
  const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: 0xffb060, emissiveIntensity: 1.6, roughness: 0.4 });
  const lampArmMat = new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.5, metalness: 0.6 });
  // [wall x, wall z, arm dx, arm dz] — arm reaches from the wall into the yard
  for (const [lx, lz, ax, az] of [
    [-26, -19.4, 0, 0.55], [26, -19.4, 0, 0.55],
    [-27.4, 0, 0.55, 0], [27.4, 0, -0.55, 0], [0, 19.4, 0, -0.55],
  ]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(ax) > 0 ? 0.6 : 0.08, 0.08, Math.abs(az) > 0 ? 0.6 : 0.08), lampArmMat);
    decor(arm, lx + ax / 2, 4.0, lz + az / 2);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.26), lampHeadMat);
    decor(head, lx + ax, 3.94, lz + az);
  }

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
  const rust = new THREE.MeshStandardMaterial({ map: tex.containerRust, roughness: 0.7, metalness: 0.3 });
  const rustBlue = new THREE.MeshStandardMaterial({ map: tex.containerBlue, roughness: 0.7, metalness: 0.3 });

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
  const pipeSideMat = new THREE.MeshStandardMaterial({ color: 0x4a5a60, roughness: 0.45, metalness: 0.6 });
  for (let i = 0; i < 3; i++) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.28 - i * 0.05, 0.28 - i * 0.05, 16, 12), pipeSideMat);
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
  // a second crate stacked on the mid pillar's neighbour (visual only)
  decor(box(1.1, 1.1, 1.1, wood), 3.5, 1.65, -2, 0.55);
  decor(box(1.1, 1.1, 1.1, metal), 4.5, 1.65, -4, 0.1);
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
  // container (solid, not walkable) centre-north, corrugated + stencilled
  solid(box(6, 2.6, 2.6, rust), 0, 1.3, -12, 0);
  // a second container stacked on top (visual only) + a blue one by site B
  decor(box(6, 2.6, 2.6, rustBlue), 0, 3.9, -12, 0.06);
  decor(box(6, 2.6, 2.6, rustBlue), 24.5, 1.3, -15.5, 0.12);
  // barrels: ribbed drums with painted bands (same spots, same colliders)
  const barrelAmber = new THREE.MeshStandardMaterial({ map: tex.barrelAmber, roughness: 0.55, metalness: 0.35 });
  const barrelBlue = new THREE.MeshStandardMaterial({ map: tex.barrelBlue, roughness: 0.55, metalness: 0.35 });
  for (const [bx, bz, bm] of [[-6, -14, barrelAmber], [-4.6, -14.4, barrelBlue], [8, 4, barrelAmber], [9.4, 4.6, barrelBlue], [-16, 2, barrelAmber]]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.05, 14), bm);
    solid(barrel, bx, 0.53, bz);
  }
  // a tipped barrel + a tyre stack for ground-level variety
  const tipped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.05, 14), barrelBlue);
  tipped.rotation.z = Math.PI / 2;
  solid(tipped, -10, 0.55, 14, 0.4);
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.95 });
  for (let i = 0; i < 3; i++) {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.16, 8, 18), tyreMat);
    tyre.rotation.x = Math.PI / 2;
    decor(tyre, 12, 0.17 + i * 0.32, -14, i * 0.5);
  }
  // scattered mid crates for the long sightline to break up
  solid(box(1.1, 1.1, 1.1, wood), 0.5, 0.55, 8, 0.7);
  solid(box(1.1, 1.1, 1.1, wood), -3, 0.55, 12, -0.4);

  // ---- light poles just outside the north wall + sagging wires ----
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.5, metalness: 0.6 });
  const poleLampMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc070, emissiveIntensity: 2.0, roughness: 0.4 });
  for (const px of [-24, 24]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7.5, 8), poleMat);
    decor(pole, px, 3.75, -22.5);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), poleLampMat);
    decor(lamp, px, 7.5, -22.5);
  }
  // wires: thin sagging runs between the poles and the watchtower
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x14100c });
  const UP = new THREE.Vector3(0, 1, 0);
  function wire(a, b) {
    const mid = a.clone().lerp(b, 0.5); mid.y -= 0.7;
    for (const [p, q] of [[a, mid], [mid, b]]) {
      const dir = q.clone().sub(p);
      const len = dir.length();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 5), wireMat);
      m.position.copy(p).add(q).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(UP, dir.normalize());
      group.add(m);
    }
  }
  wire(new THREE.Vector3(-24, 7.4, -22.5), new THREE.Vector3(24, 7.4, -22.5));
  wire(new THREE.Vector3(-24, 7.4, -22.5), new THREE.Vector3(-22.5, 4.6, 9.5));

  // ---- distant silhouettes (outside the walls, visual only) ----
  const sil = new THREE.MeshBasicMaterial({ color: 0x2a3440, fog: true });
  const silWarm = new THREE.MeshBasicMaterial({ color: 0x4a3630, fog: true });
  // tower crane, north-east
  const crane = new THREE.Group();
  const cTower = new THREE.Mesh(new THREE.BoxGeometry(1.6, 26, 1.6), sil);
  cTower.position.y = 13;
  const cJib = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 1.2), sil);
  cJib.position.set(8, 25, 0);
  const cCounter = new THREE.Mesh(new THREE.BoxGeometry(6, 1.6, 1.6), sil);
  cCounter.position.set(-5, 24.4, 0);
  const cCable = new THREE.Mesh(new THREE.BoxGeometry(0.08, 9, 0.08), sil);
  cCable.position.set(16, 20.5, 0);
  const cHook = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), silWarm);
  cHook.position.set(16, 15.8, 0);
  crane.add(cTower, cJib, cCounter, cCable, cHook);
  crane.position.set(52, 0, -38);
  crane.rotation.y = -0.5;
  group.add(crane);
  // water tower, north-west
  const wt = new THREE.Group();
  const wtTank = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 4.2, 14), silWarm);
  wtTank.position.y = 13.5;
  const wtRoof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.2, 14), sil);
  wtRoof.position.y = 16.7;
  wt.add(wtTank, wtRoof);
  for (const [lx, lz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 11.5, 0.4), sil);
    leg.position.set(lx, 5.75, lz);
    wt.add(leg);
  }
  wt.position.set(-48, 0, -34);
  group.add(wt);
  // chimneys / silos, east
  for (const [cx, cz, ch, cr] of [[46, -6, 18, 1.6], [50, 4, 14, 1.3], [44, 14, 11, 1.8]]) {
    const chim = new THREE.Mesh(new THREE.CylinderGeometry(cr, cr * 1.15, ch, 12), sil);
    chim.position.set(cx, ch / 2, cz);
    group.add(chim);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(cr * 1.25, cr * 1.25, 0.5, 12), silWarm);
    cap.position.set(cx, ch + 0.25, cz);
    group.add(cap);
  }
  // low warehouse roofline, south: a shed roof slab over a long block
  const wh = new THREE.Mesh(new THREE.BoxGeometry(34, 7, 10), sil);
  wh.position.set(-6, 3.5, 46);
  group.add(wh);
  const whRoof = new THREE.Mesh(new THREE.BoxGeometry(34.6, 0.5, 11), silWarm);
  whRoof.position.set(-6, 7.2, 46);
  whRoof.rotation.z = 0.05;
  group.add(whRoof);

  // ---- lighting: amber dusk sun + cool fill + hemisphere ----
  const sun = new THREE.DirectionalLight(new THREE.Color(PALETTE.sun), 3.6);
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
  scene.add(new THREE.HemisphereLight(new THREE.Color('#2e5f6e'), new THREE.Color('#8a6f4d'), 1.1));
  const fill = new THREE.DirectionalLight(new THREE.Color('#8fb4d8'), 0.85);
  fill.position.set(30, 10, 24);
  scene.add(fill);

  scene.fog = new THREE.Fog(new THREE.Color(PALETTE.dusk), 20, 62);
  scene.background = new THREE.Color(PALETTE.skyTop);

  // sky dome + sun disc + glare sprite
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(90, 24, 16),
    new THREE.MeshBasicMaterial({ map: makeSkyTexture(), side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe6b0, fog: false }),
  );
  sunDisc.position.set(-58, 26, -34);
  sunDisc.lookAt(0, 2, 0);
  scene.add(sunDisc);
  const glare = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(), transparent: true, depthWrite: false, fog: false,
  }));
  glare.scale.set(34, 34, 1);
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
