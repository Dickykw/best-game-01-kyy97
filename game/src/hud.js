// HUD — every DOM readout: health, ammo, timer, score, money, phase chip,
// kill feed, hitmarker, damage vignette, round banners, buy menu and the
// scoreboard. The game writes state here; this module owns the DOM.
export function createHud(doc) {
  const $ = (id) => doc.getElementById(id);
  const els = {
    health: $('health-num'), healthBar: $('health-bar'),
    ammo: $('ammo'), weaponName: $('weapon-name'),
    timer: $('timer'), phase: $('phase-chip'),
    score: $('score'), money: $('money'),
    site: $('site-label'), bomb: $('bomb-status'),
    hitmarker: $('hitmarker'), damage: $('damage'),
    banner: $('banner'), bannerTitle: $('banner-title'), bannerSub: $('banner-sub'),
    feed: $('feed'), crosshair: $('crosshair'),
    menu: $('menu'), title: $('menu-title'), subtitle: $('menu-sub'),
    startBtn: $('start-btn'), restartBtn: $('restart-btn'),
    buy: $('buy-menu'), buyMoney: $('buy-money'),
    scoreboard: $('scoreboard'),
    controls: $('controls-card'),
    plantBar: $('plant-bar'), plantFill: $('plant-fill'),
    defuseBar: $('defuse-bar'), defuseFill: $('defuse-fill'),
  };
  let bannerTimer = null;

  function setText(el, text) { if (el && el.textContent !== text) el.textContent = text; }

  function setHealth(hp) {
    setText(els.health, String(Math.ceil(hp)));
    if (els.healthBar) els.healthBar.style.width = Math.max(0, Math.min(100, hp)) + '%';
    if (els.health) els.health.classList.toggle('low', hp <= 30);
  }

  function setAmmo(mag, reserve, name) {
    setText(els.ammo, mag + ' / ' + reserve);
    setText(els.weaponName, name);
  }

  function setTimer(seconds, urgent) {
    const s = Math.max(0, Math.ceil(seconds));
    setText(els.timer, String(Math.floor(s / 60)) + ':' + String(s % 60).padStart(2, '0'));
    if (els.timer) els.timer.classList.toggle('urgent', !!urgent);
  }

  function setPhase(phase, round, scoreUs, scoreThem) {
    const label = {
      buy: 'BUY PHASE', live: 'ROUND ' + round, planted: 'BOMB PLANTED',
      roundEnd: 'ROUND OVER', matchEnd: 'MATCH OVER', menu: 'DUSTY YARD',
    }[phase] || phase.toUpperCase();
    setText(els.phase, label);
    setText(els.score, scoreUs + ' — ' + scoreThem);
  }

  function setMoney(n) { setText(els.money, '$' + n); }

  function setSite(text) { setText(els.site, text); }

  function setBombStatus(text, urgent) {
    setText(els.bomb, text);
    if (els.bomb) els.bomb.classList.toggle('urgent', !!urgent);
  }

  function hitmark(kind) {
    if (!els.hitmarker) return;
    els.hitmarker.classList.remove('head', 'kill');
    if (kind) els.hitmarker.classList.add(kind);
    els.hitmarker.classList.add('on');
    setTimeout(() => els.hitmarker.classList.remove('on'), 120);
  }

  function damageFlash() {
    if (!els.damage) return;
    els.damage.classList.add('on');
    setTimeout(() => els.damage.classList.remove('on'), 150);
  }

  function banner(title, sub, ms = 2200) {
    if (!els.banner) return;
    setText(els.bannerTitle, title);
    setText(els.bannerSub, sub || '');
    els.banner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => els.banner.classList.remove('show'), ms);
  }

  function feed(text) {
    if (!els.feed) return;
    const div = doc.createElement('div');
    div.className = 'feed-line';
    div.textContent = text;
    els.feed.prepend(div);
    while (els.feed.children.length > 5) els.feed.removeChild(els.feed.lastChild);
    setTimeout(() => { if (div.parentNode) div.parentNode.removeChild(div); }, 5000);
  }

  function showMenu(title, sub, showRestart) {
    if (!els.menu) return;
    setText(els.title, title);
    setText(els.subtitle, sub);
    els.menu.classList.add('show');
    if (els.startBtn) els.startBtn.style.display = showRestart ? 'none' : '';
    if (els.restartBtn) els.restartBtn.style.display = showRestart ? '' : 'none';
  }
  function hideMenu() { if (els.menu) els.menu.classList.remove('show'); }

  function showBuy(open, money, items) {
    if (!els.buy) return;
    els.buy.classList.toggle('show', !!open);
    if (open) {
      setText(els.buyMoney, '$' + money);
      const list = $('buy-list');
      if (list) {
        list.innerHTML = '';
        for (const it of items) {
          const row = doc.createElement('div');
          row.className = 'buy-row' + (it.owned ? ' owned' : '') + (it.canAfford ? '' : ' poor');
          row.innerHTML = '<span class="buy-key">' + it.key + '</span><span class="buy-name">' +
            it.name + '</span><span class="buy-price">' + (it.owned ? 'OWNED' : '$' + it.price) + '</span>';
          list.appendChild(row);
        }
      }
    }
  }

  function showScoreboard(open, rows) {
    if (!els.scoreboard) return;
    els.scoreboard.classList.toggle('show', !!open);
    if (!open) return;
    const body = $('score-rows');
    if (!body) return;
    body.innerHTML = '';
    for (const r of rows) {
      const tr = doc.createElement('tr');
      tr.innerHTML = '<td>' + r.name + '</td><td>' + r.kills + '</td><td>' + r.deaths + '</td><td>$' + r.money + '</td><td>' + r.weapon + '</td>';
      body.appendChild(tr);
    }
  }

  function setPlant(p) {
    if (!els.plantBar) return;
    els.plantBar.classList.toggle('show', p > 0 && p < 1);
    if (els.plantFill) els.plantFill.style.width = Math.round(p * 100) + '%';
  }
  function setDefuse(p) {
    if (!els.defuseBar) return;
    els.defuseBar.classList.toggle('show', p > 0 && p < 1);
    if (els.defuseFill) els.defuseFill.style.width = Math.round(p * 100) + '%';
  }

  function showControls(show) {
    if (els.controls) els.controls.classList.toggle('show', !!show);
  }

  return {
    setHealth, setAmmo, setTimer, setPhase, setMoney, setSite, setBombStatus,
    hitmark, damageFlash, banner, feed, showMenu, hideMenu,
    showBuy, showScoreboard, setPlant, setDefuse, showControls,
    els,
  };
}
