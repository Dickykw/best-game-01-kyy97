// Input — keyboard + mouse (pointer lock) on desktop, virtual joystick +
// drag-look + action buttons on touch. One state object; the game reads it
// every fixed step. No input is ever read twice.
export function createInput(doc, canvas) {
  const keys = new Set();
  let lookDX = 0, lookDY = 0;
  let locked = false;
  let firing = false;
  const touch = {
    active: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    moveX: 0, moveY: 0, lookDX: 0, lookDY: 0,
    jump: false, crouch: false, fire: false, reload: false,
    plant: false, nade: false, buy: false, weapon: 0,
  };
  const pressed = new Set();

  function isTouch() { return touch.active; }

  doc.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    pressed.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  });
  doc.addEventListener('keyup', (e) => keys.delete(e.code));
  doc.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) firing = true;
  });
  doc.addEventListener('mouseup', (e) => {
    if (e.button === 0) firing = false;
  });
  canvas.addEventListener('click', () => {
    if (!locked && !isTouch()) canvas.requestPointerLock?.();
  });
  doc.addEventListener('pointerlockchange', () => {
    locked = doc.pointerLockElement === canvas;
  });
  doc.addEventListener('mousemove', (e) => {
    if (!locked) return;
    lookDX += e.movementX;
    lookDY += e.movementY;
  });

  // ---- touch: joystick (left) + look drag (right) ----
  const joy = doc.getElementById('joy');
  const joyKnob = doc.getElementById('joy-knob');
  const lookArea = doc.getElementById('look-area');
  let joyId = null, lookId = null;
  let joyOrigin = { x: 0, y: 0 };
  let lookLast = { x: 0, y: 0 };
  const JOY_R = 52;

  function bindButton(id, onDown, onUp) {
    const el = doc.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(); }, { passive: false });
    el.addEventListener('touchend', (e) => { e.preventDefault(); if (onUp) onUp(); }, { passive: false });
    el.addEventListener('touchcancel', () => { if (onUp) onUp(); });
  }

  if (joy) {
    joy.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joyId = t.identifier;
      const r = joy.getBoundingClientRect();
      joyOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      moveJoy(t);
    }, { passive: false });
    joy.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === joyId) moveJoy(t);
    }, { passive: false });
    const endJoy = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          joyId = null;
          touch.moveX = 0;
          touch.moveY = 0;
          if (joyKnob) joyKnob.style.transform = 'translate(-50%, -50%)';
        }
      }
    };
    joy.addEventListener('touchend', endJoy);
    joy.addEventListener('touchcancel', endJoy);
  }
  function moveJoy(t) {
    let dx = t.clientX - joyOrigin.x;
    let dy = t.clientY - joyOrigin.y;
    const len = Math.hypot(dx, dy);
    if (len > JOY_R) { dx = dx / len * JOY_R; dy = dy / len * JOY_R; }
    touch.moveX = dx / JOY_R;
    touch.moveY = dy / JOY_R;
    if (joyKnob) joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
  if (lookArea) {
    lookArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      lookId = t.identifier;
      lookLast = { x: t.clientX, y: t.clientY };
    }, { passive: false });
    lookArea.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === lookId) {
          touch.lookDX += (t.clientX - lookLast.x) * 2.2;
          touch.lookDY += (t.clientY - lookLast.y) * 2.2;
          lookLast = { x: t.clientX, y: t.clientY };
        }
      }
    }, { passive: false });
    const endLook = (e) => {
      for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null;
    };
    lookArea.addEventListener('touchend', endLook);
    lookArea.addEventListener('touchcancel', endLook);
  }
  bindButton('btn-fire', () => { touch.fire = true; }, () => { touch.fire = false; });
  bindButton('btn-reload', () => { touch.reload = true; });
  bindButton('btn-jump', () => { touch.jump = true; }, () => { touch.jump = false; });
  bindButton('btn-crouch', () => { touch.crouch = !touch.crouch; });
  bindButton('btn-plant', () => { touch.plant = true; }, () => { touch.plant = false; });
  bindButton('btn-nade', () => { touch.nade = true; });
  bindButton('btn-buy', () => { touch.buy = true; });
  bindButton('btn-w1', () => { touch.weapon = 1; });
  bindButton('btn-w2', () => { touch.weapon = 2; });
  bindButton('btn-w3', () => { touch.weapon = 3; });

  function read() {
    const fwd = keys.has('KeyW') || keys.has('ArrowUp') || touch.moveY < -0.25;
    const back = keys.has('KeyS') || keys.has('ArrowDown') || touch.moveY > 0.25;
    const left = keys.has('KeyA') || keys.has('ArrowLeft') || touch.moveX < -0.25;
    const right = keys.has('KeyD') || keys.has('ArrowRight') || touch.moveX > 0.25;
    const s = {
      forward: fwd, back, left, right,
      jump: keys.has('Space') || touch.jump,
      crouch: keys.has('KeyC') || keys.has('ControlLeft') || touch.crouch,
      fire: firing || touch.fire,
      reload: pressed.has('KeyR') || touch.reload,
      plant: keys.has('KeyE') || touch.plant,
      nade: pressed.has('KeyG') || touch.nade,
      buy: pressed.has('KeyB') || touch.buy,
      score: keys.has('Tab'),
      weapon: 0,
    };
    if (pressed.has('Digit1')) s.weapon = 1;
    if (pressed.has('Digit2')) s.weapon = 2;
    if (pressed.has('Digit3')) s.weapon = 3;
    if (touch.weapon) { s.weapon = touch.weapon; touch.weapon = 0; }
    return s;
  }

  function consumeLook() {
    const dx = lookDX + touch.lookDX;
    const dy = lookDY + touch.lookDY;
    lookDX = 0; lookDY = 0;
    touch.lookDX = 0; touch.lookDY = 0;
    return { dx, dy };
  }

  function endStep() {
    pressed.clear();
    touch.reload = false;
    touch.nade = false;
    touch.buy = false;
  }

  function unlock() {
    if (doc.pointerLockElement) doc.exitPointerLock?.();
    locked = false;
  }

  return {
    read, consumeLook, endStep, unlock, isTouch,
    get locked() { return locked; },
    get firing() { return firing || touch.fire; },
  };
}
