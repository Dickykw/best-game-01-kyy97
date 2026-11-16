// Dusty Yard — entry point. Boots the renderer, wires every module, runs
// the fixed-step loop and owns the round state machine:
//   menu -> buy (15 s) -> live (100 s) -> round end -> next buy ...
// First to 3 rounds takes the match. The bomb can end a round early:
// planted + 35 s fuse = attackers win; defused = defenders win.
// URL modes: ?judge skips the menu with a full loadout; ?shot=start|play|
// plant|end stages a deterministic frame for screenshots.
import * as THREE from 'three';
import { ARENA, ROUND, WEAPONS, GRENADE_PRICE } from './config.js';
import { createWorld } from './world.js';
import { createPlayer } from './player.js';
import { createArsenal } from './weapons.js';
import { createBots } from './bots.js';
import { createBomb } from './bomb.js';
import { createEffects } from './effects.js';
import { createEconomy } from './economy.js';
import { createHud } from './hud.js';
import { createInput } from './input.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const JUDGE = params.has('judge');

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.08, 220);
const listener = new THREE.AudioListener();
camera.add(listener);
// a soft light on the camera so the viewmodel and near cover read clearly
const camLight = new THREE.PointLight(0xffe0b0, 0.55, 5);
camLight.position.set(0.2, 0.1, -0.3);
camera.add(camLight);
scene.add(camera);

const world = createWorld(scene);
const player = createPlayer(camera, world);
const arsenal = createArsenal(camera, scene);
arsenal.setColliders(world.colliders);
const bots = createBots(scene, world, listener);
const bomb = createBomb(scene, world);
const fx = createEffects(scene);
const eco = createEconomy();
const hud = createHud(document);
const input = createInput(document, canvas);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---- match state ----
const match = {
  phase: 'menu', // menu | buy | live | planted | roundEnd | matchEnd
  round: 1,
  scoreUs: 0, scoreThem: 0,
  phaseT: 0, roundT: ROUND.roundTime,
  kills: 0, deaths: 0,
  buyOpen: false,
  over: false,
  winner: null,
};
let time = 0;
let noisePos = null;
let noiseAt = -99;

const raycaster = new THREE.Raycaster();
const shootDir = new THREE.Vector3();
const shootFrom = new THREE.Vector3();
const hitPoint = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const EYE = new THREE.Vector3();

function currentSite() {
  const p = player.pos;
  const dA = Math.hypot(p.x - world.siteA.pos.x, p.z - world.siteA.pos.z);
  const dB = Math.hypot(p.x - world.siteB.pos.x, p.z - world.siteB.pos.z);
  if (dA <= world.siteA.radius) return 'A';
  if (dB <= world.siteB.radius) return 'B';
  return null;
}

function startRound() {
  match.phase = 'buy';
  match.phaseT = ROUND.buyTime;
  match.roundT = ROUND.roundTime;
  match.buyOpen = false;
  player.reset();
  bots.reset();
  bomb.reset();
  arsenal.refillAll();
  arsenal.switchTo('pistol');
  noisePos = null;
  hud.setHealth(player.health);
  hud.setAmmo(arsenal.state.mag, arsenal.state.reserve, arsenal.defs.pistol.label);
  hud.setMoney(eco.money);
  hud.setPhase('buy', match.round, match.scoreUs, match.scoreThem);
  hud.setSite('');
  hud.setBombStatus('');
  hud.setPlant(0);
  hud.setDefuse(0);
  hud.banner('ROUND ' + match.round, match.round === 1 ? 'First to ' + ROUND.winScore + ' takes the match' : 'Buy your loadout — B opens the shop');
  hud.showBuy(false);
}

function endRound(usWon, reason) {
  match.phase = 'roundEnd';
  match.phaseT = 3.5;
  if (usWon) {
    match.scoreUs += 1;
    eco.add(eco.roundWin);
    hud.banner('ROUND WON', reason, 3200);
    hud.feed('Round ' + match.round + ' — won: ' + reason);
  } else {
    match.scoreThem += 1;
    eco.add(eco.roundLoss);
    hud.banner('ROUND LOST', reason, 3200);
    hud.feed('Round ' + match.round + ' — lost: ' + reason);
  }
  hud.setPhase('roundEnd', match.round, match.scoreUs, match.scoreThem);
  hud.setMoney(eco.money);
  hud.showBuy(false);
  match.buyOpen = false;
}

function endMatch(usWon) {
  match.phase = 'matchEnd';
  match.over = true;
  match.winner = usWon ? 'us' : 'them';
  hud.setPhase('matchEnd', match.round, match.scoreUs, match.scoreThem);
  hud.showMenu(
    usWon ? 'VICTORY — DUSTY YARD IS YOURS' : 'DEFEAT — THE VIPERS HOLD THE YARD',
    'Final score ' + match.scoreUs + ' — ' + match.scoreThem + '  ·  ' + match.kills + ' eliminations',
    true,
  );
  hud.showControls(false);
  input.unlock();
}

function nextRound() {
  if (match.scoreUs >= ROUND.winScore || match.scoreThem >= ROUND.winScore) {
    endMatch(match.scoreUs > match.scoreThem);
    return;
  }
  match.round += 1;
  startRound();
}

function buyItems() {
  const items = [];
  const keys = { rifle: '2', smg: '3', pistol: '1' };
  for (const name of ['rifle', 'smg', 'pistol']) {
    const def = WEAPONS[name];
    items.push({
      key: keys[name], name: def.label, price: def.price,
      owned: arsenal.owned.has(name), canAfford: eco.money >= def.price,
    });
  }
  items.push({
    key: 'G', name: 'Frag Grenade', price: GRENADE_PRICE,
    owned: false, canAfford: eco.money >= GRENADE_PRICE,
  });
  return items;
}

function tryBuy(name) {
  const def = WEAPONS[name];
  if (!def) return;
  if (arsenal.owned.has(name)) { arsenal.switchTo(name); return; }
  if (eco.spend(def.price)) {
    arsenal.buy(name);
    arsenal.switchTo(name);
    hud.setMoney(eco.money);
    hud.feed('Bought ' + def.label + ' — $' + def.price);
  }
}

function fireShot() {
  // camera ray with the weapon's deterministic spread
  camera.getWorldDirection(shootDir);
  const spread = arsenal.shot.spread || 0;
  if (spread > 0) {
    shootDir.x += (Math.random() - 0.5) * 2 * spread;
    shootDir.y += (Math.random() - 0.5) * 2 * spread;
    shootDir.z += (Math.random() - 0.5) * 2 * spread;
    shootDir.normalize();
  }
  player.eyePos(shootFrom);
  raycaster.set(shootFrom, shootDir);
  raycaster.far = 120;
  const targets = world.shootables.concat(bots.hitMeshes);
  const hits = raycaster.intersectObjects(targets, false);
  const muzzle = arsenal.muzzleWorld(tmpV);
  if (hits.length === 0) {
    hitPoint.copy(shootFrom).addScaledVector(shootDir, 60);
    fx.tracer(muzzle.clone(), hitPoint);
    return;
  }
  const h = hits[0];
  hitPoint.copy(h.point);
  fx.tracer(muzzle.clone(), hitPoint);
  if (h.object.userData && h.object.userData.bot) {
    const part = h.object.userData.part;
    const def = arsenal.state.def;
    const mult = part === 'head' ? def.headMult : part === 'limb' ? 0.75 : 1;
    const dmg = def.damage * mult;
    const res = bots.damage(h.object, dmg);
    fx.impact(hitPoint);
    hud.hitmark(res.killed ? 'kill' : part === 'head' ? 'head' : '');
    if (res.killed) {
      match.kills += 1;
      eco.add(eco.killReward);
      hud.setMoney(eco.money);
      hud.feed('You eliminated ' + res.bot.name + '  +$' + eco.killReward);
      noisePos = null;
    }
  } else {
    fx.impact(hitPoint);
  }
}

function damagePlayer(amount) {
  if (!player.alive) return;
  hud.damageFlash();
  const died = player.damage(amount);
  hud.setHealth(player.health);
  if (died) {
    match.deaths += 1;
    hud.feed('You were eliminated');
    endRound(false, 'You were eliminated');
  }
}

function step(dt) {
  time += dt;
  const s = input.read();
  const look = input.consumeLook();
  if (player.alive && (match.phase === 'live' || match.phase === 'planted' || match.phase === 'buy')) {
    player.look(look.dx, look.dy);
  }

  // ---- phase timers ----
  if (match.phase === 'buy') {
    match.phaseT -= dt;
    hud.setTimer(match.phaseT, match.phaseT <= 5);
    if (match.phaseT <= 0) {
      match.phase = 'live';
      match.phaseT = 0;
      hud.setPhase('live', match.round, match.scoreUs, match.scoreThem);
      hud.showBuy(false);
      match.buyOpen = false;
      hud.banner('GO — PLANT THE CHARGE', 'Site A west, site B east');
    }
  } else if (match.phase === 'live' || match.phase === 'planted') {
    match.roundT -= dt;
    hud.setTimer(match.phase === 'planted' ? bomb.timer : match.roundT, match.roundT <= 10 || bomb.timer <= 10);
    if (match.phase === 'live' && match.roundT <= 0) {
      endRound(false, 'Time expired — the charge was never planted');
    }
  } else if (match.phase === 'roundEnd') {
    match.phaseT -= dt;
    if (match.phaseT <= 0) nextRound();
  }

  const playing = match.phase === 'live' || match.phase === 'planted' || match.phase === 'buy';
  if (playing && player.alive) {
    player.step(dt, s);
    // weapon trigger
    if (s.fire) arsenal.pullTrigger(); else arsenal.releaseTrigger();
    arsenal.step(dt, player.groundSpeed(), player.crouching);
    if (arsenal.shot.fired) {
      fireShot();
      // noise draws bots to the gunshot
      noisePos = player.pos.clone();
      noiseAt = time;
    }
    if (s.reload) arsenal.reload();
    if (s.weapon === 1) arsenal.switchTo('pistol');
    if (s.weapon === 2) { if (arsenal.owned.has('rifle')) arsenal.switchTo('rifle'); else tryBuy('rifle'); }
    if (s.weapon === 3) { if (arsenal.owned.has('smg')) arsenal.switchTo('smg'); else tryBuy('smg'); }
    if (s.nade) {
      camera.getWorldDirection(shootDir);
      player.eyePos(shootFrom);
      const id = arsenal.throwGrenade(shootFrom, shootDir);
      if (id >= 0) hud.feed('Grenade out');
    }
    // buy menu
    if (match.phase === 'buy' && s.buy) {
      match.buyOpen = !match.buyOpen;
      hud.showBuy(match.buyOpen, eco.money, buyItems());
    }
    if (match.buyOpen && match.phase === 'buy') {
      if (s.weapon === 2) tryBuy('rifle');
      if (s.weapon === 3) tryBuy('smg');
      if (s.nade) {
        if (eco.spend(GRENADE_PRICE)) { arsenal.addGrenade(1); hud.setMoney(eco.money); }
      }
      hud.showBuy(true, eco.money, buyItems());
    }
    // bomb plant
    const site = currentSite();
    hud.setSite(site ? 'SITE ' + site + ' — hold E to plant' : '');
    if ((match.phase === 'live') && site && s.plant) {
      if (!bomb.planting) bomb.startPlant(site);
      if (bomb.addPlant(dt)) {
        match.phase = 'planted';
        hud.setPhase('planted', match.round, match.scoreUs, match.scoreThem);
        hud.setBombStatus('CHARGE PLANTED — ' + Math.ceil(bomb.timer) + 's', true);
        hud.banner('CHARGE PLANTED', 'Defend it for 35 seconds', 2600);
        hud.feed('Charge planted at site ' + site);
        bots.setObjective(site);
      }
      hud.setPlant(bomb.plantProgress);
    } else {
      if (bomb.planting) bomb.cancelPlant();
      hud.setPlant(0);
    }
    // grenade explosions
    for (const boom of arsenal.explosions) {
      fx.explosion(boom.pos);
      for (const bot of bots.bots) {
        if (!bot.alive) continue;
        const d = bot.pos.distanceTo(boom.pos);
        const dmg = boom.damageAt(d);
        if (dmg > 0) {
          const res = bots.damage(bot.torso, dmg);
          if (res.killed) {
            match.kills += 1;
            eco.add(eco.killReward);
            hud.setMoney(eco.money);
            hud.feed('Grenade eliminated ' + res.bot.name + '  +$' + eco.killReward);
          }
        }
      }
      if (player.alive) {
        const d = player.pos.distanceTo(boom.pos);
        const dmg = boom.damageAt(d) * 0.6;
        if (dmg > 0) damagePlayer(dmg);
      }
    }
  }

  // ---- bots (only live rounds: the buy phase is safe) ----
  if (match.phase === 'live' || match.phase === 'planted') {
    if (noisePos && time - noiseAt > 6) noisePos = null;
    const events = bots.update(dt, {
      playerPos: player.pos,
      playerAlive: player.alive,
      playerCrouching: player.crouching,
      playerSpeed: player.groundSpeed(),
      bombPlanted: bomb.state === 'planted',
      bombSite: bomb.site,
      time,
      noisePos,
    });
    for (const e of events) {
      if (e.defusing) {
        hud.setDefuse(e.progress);
        if (bomb.addDefuse(dt)) {
          endRound(false, 'The charge was defused');
        }
      } else {
        fx.tracer(e.from, e.to, 0x9fd4ff);
        fx.muzzle(e.from);
        if (e.hit) damagePlayer(e.damage);
      }
    }
    if (!bots.defusingBot) hud.setDefuse(0);
  }
  bomb.update(dt);
  if (bomb.state === 'planted') {
    hud.setBombStatus('CHARGE PLANTED — ' + Math.ceil(bomb.timer) + 's', bomb.timer <= 10);
  }
  if (bomb.state === 'exploded' && (match.phase === 'live' || match.phase === 'planted')) {
    fx.explosion(bomb.pos);
    endRound(true, 'The charge detonated');
  }
  if (bomb.state === 'defused' && match.phase === 'planted') {
    endRound(false, 'The charge was defused');
  }
  if (bomb.beep) {
    // short blip handled by the arsenal's audio path; visual pulse only
  }

  // ---- HUD ----
  if (playing) {
    hud.setHealth(player.health);
    hud.setAmmo(arsenal.state.mag, arsenal.state.reserve, arsenal.state.def.label);
    hud.setMoney(eco.money);
    hud.showScoreboard(s.score, [
      { name: 'YOU', kills: match.kills, deaths: match.deaths, money: eco.money, weapon: arsenal.state.def.label },
      ...bots.bots.map((b) => ({ name: b.name, kills: 0, deaths: b.alive ? 0 : 1, money: 0, weapon: 'Viper rifle' })),
    ]);
  }
  fx.step(dt);
  input.endStep();
}

// ---- fixed-step loop (frozen in ?shot= mode: the staged frame is the shot) ----
let last = performance.now();
let acc = 0;
const STEP = 1 / 60;
function frame(now) {
  requestAnimationFrame(frame);
  if (SHOT) {
    renderer.render(scene, camera);
    return;
  }
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  acc += dt;
  let n = 0;
  while (acc >= STEP && n < 5) {
    step(STEP);
    acc -= STEP;
    n++;
  }
  renderer.render(scene, camera);
}

// ---- menus / buttons ----
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
function beginMatch() {
  match.scoreUs = 0;
  match.scoreThem = 0;
  match.round = 1;
  match.kills = 0;
  match.deaths = 0;
  match.over = false;
  eco.reset();
  hud.hideMenu();
  hud.showControls(!SHOT);
  startRound();
}
if (startBtn) startBtn.addEventListener('click', () => {
  listener.context.resume?.().catch(() => {});
  beginMatch();
});
if (restartBtn) restartBtn.addEventListener('click', () => {
  listener.context.resume?.().catch(() => {});
  beginMatch();
});
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && match.phase === 'matchEnd') beginMatch();
});

// ---- boot ----
hud.setPhase('menu', 1, 0, 0);
hud.setHealth(100);
hud.setAmmo(12, 36, 'Kestrel P9');
hud.setMoney(eco.money);
hud.setTimer(ROUND.roundTime, false);
if (input.isTouch()) document.body.classList.add('touch');
hud.showControls(!SHOT);
if (!SHOT && !JUDGE) {
  hud.showMenu('DUSTY YARD', 'A golden-hour tactical FPS — plant the charge, hold the yard, take the match.', false);
} else if (JUDGE) {
  // straight into round 1, full loadout, no menu
  beginMatch();
  eco.add(5000);
  arsenal.buy('rifle');
  arsenal.switchTo('rifle');
  arsenal.addGrenade(2);
  match.phase = 'live';
  match.phaseT = 0;
  hud.setPhase('live', 1, 0, 0);
  hud.setMoney(eco.money);
}

// ---- screenshot staging (?shot=) ----
if (SHOT === 'start') {
  // title screen over the yard, camera at spawn looking north
  player.reset();
  camera.position.set(0, 2.2, 19);
  camera.rotation.set(-0.06, 0, 0);
  hud.showMenu('DUSTY YARD', 'A golden-hour tactical FPS — plant the charge, hold the yard, take the match.', false);
} else if (SHOT === 'play') {
  beginMatch();
  match.phase = 'live';
  match.phaseT = 0;
  eco.add(5000);
  arsenal.buy('rifle');
  arsenal.switchTo('rifle');
  // stage: two bots visible mid-lane, player aimed at them
  bots.bots[0].pos.set(2, 0, -2);
  bots.bots[0].group.position.set(2, 0, -2);
  bots.bots[0].yaw = Math.PI;
  bots.bots[0].group.rotation.y = Math.PI;
  bots.bots[1].pos.set(-3, 0, -6);
  bots.bots[1].group.position.set(-3, 0, -6);
  bots.bots[1].yaw = Math.PI;
  bots.bots[1].group.rotation.y = Math.PI;
  player.pos.set(0, 0, 12);
  player.look(0, 0);
  camera.position.set(0, 1.62, 12);
  camera.rotation.set(0, 0, 0);
  hud.setPhase('live', 1, 0, 0);
  hud.setAmmo(28, 90, 'Longbow AR-7');
  hud.setHealth(100);
  hud.setMoney(eco.money);
  hud.setTimer(87, false);
} else if (SHOT === 'plant') {
  beginMatch();
  match.phase = 'planted';
  eco.add(5000);
  arsenal.buy('rifle');
  arsenal.switchTo('rifle');
  bomb.plantNow('A');
  bots.setObjective('A');
  bots.bots[0].pos.set(-16, 0, -10);
  bots.bots[0].group.position.set(-16, 0, -10);
  bots.bots[0].yaw = Math.PI * 0.75;
  bots.bots[0].group.rotation.y = Math.PI * 0.75;
  player.pos.set(-14, 0, -4);
  camera.position.set(-14, 1.62, -4);
  camera.rotation.set(-0.08, 0.5, 0);
  hud.setPhase('planted', 1, 0, 0);
  hud.setBombStatus('CHARGE PLANTED — 35s', true);
  hud.setAmmo(24, 90, 'Longbow AR-7');
  hud.setHealth(82);
  hud.setMoney(eco.money);
  hud.setTimer(35, true);
} else if (SHOT === 'end') {
  match.scoreUs = 2;
  match.scoreThem = 1;
  match.round = 3;
  match.kills = 7;
  match.deaths = 2;
  eco.add(2400);
  hud.showMenu('ROUND WON', 'The charge detonated — site A is yours. Score 2 — 1.', true);
  hud.setPhase('roundEnd', 3, 2, 1);
  hud.setHealth(64);
  hud.setAmmo(18, 60, 'Longbow AR-7');
  hud.setMoney(eco.money);
  player.pos.set(0, 0, 8);
  camera.position.set(0, 1.62, 8);
  camera.rotation.set(0, 0, 0);
}

requestAnimationFrame(frame);
