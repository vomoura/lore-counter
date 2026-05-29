'use strict';

// ── Splash screen ──────────────────────────────────────────────────────────
const splashEl = document.getElementById('splash');
const splashStart = Date.now();
const MIN_SPLASH_MS = 4000;

function hideSplash() {
  const elapsed = Date.now() - splashStart;
  const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
  setTimeout(() => splashEl.classList.add('hidden'), remaining);
}

window.addEventListener('load', hideSplash);

// ── Install prompt ────────────────────────────────────────────────────────
let deferredInstallPrompt = null;
const installPromptEl    = document.getElementById('installPrompt');
const installPromptClose = document.getElementById('installPromptClose');
const installPromptIos   = document.getElementById('installPromptIos');
const installPromptIosClose = document.getElementById('installPromptIosClose');

// Detect iOS Safari (not already installed as PWA)
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;

// Android: capture beforeinstallprompt
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (!localStorage.getItem('installDismissed')) {
    setTimeout(() => {
      installPromptEl.classList.add('visible');
      setTimeout(() => hideInstallPrompt(), 8000);
    }, MIN_SPLASH_MS + 1000);
  }
});

function hideInstallPrompt() {
  installPromptEl.classList.add('hiding');
  setTimeout(() => installPromptEl.classList.remove('visible', 'hiding'), 500);
}

installPromptEl.addEventListener('click', async e => {
  if (e.target === installPromptClose) return;
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') hideInstallPrompt();
  deferredInstallPrompt = null;
});

installPromptClose.addEventListener('click', e => {
  e.stopPropagation();
  localStorage.setItem('installDismissed', '1');
  hideInstallPrompt();
});

window.addEventListener('appinstalled', () => hideInstallPrompt());

// iOS: show manual install instructions
if (isIos && !isInStandaloneMode && !localStorage.getItem('installDismissedIos')) {
  setTimeout(() => {
    installPromptIos.classList.add('visible');
    setTimeout(() => hideInstallPromptIos(), 10000);
  }, MIN_SPLASH_MS + 1000);
}

function hideInstallPromptIos() {
  installPromptIos.classList.add('hiding');
  setTimeout(() => installPromptIos.classList.remove('visible', 'hiding'), 500);
}

installPromptIosClose.addEventListener('click', () => {
  localStorage.setItem('installDismissedIos', '1');
  hideInstallPromptIos();
});
// ── State ──────────────────────────────────────────────────────────────────
const counts = { 1: 0, 2: 0 };

// ── Haptic ─────────────────────────────────────────────────────────────────
const haptic = {
  tick:   () => navigator.vibrate?.(10),
  button: () => navigator.vibrate?.(25),
};

const MIN_LORE = 0;
const MAX_LORE = 20;

// ── Exception card state ───────────────────────────────────────────────────
// donaldOwner[p] = true means player p has the Donald Duck card
// which means the OPPONENT needs 25 lore to win
const donaldOwner = { 1: false, 2: false };

function maxLoreFor(player) {
  // The opponent of `player` is the one who might have the card
  const opponent = player === 1 ? 2 : 1;
  return donaldOwner[opponent] ? 25 : MAX_LORE;
}

// ── Update display ─────────────────────────────────────────────────────────
function setCount(player, val) {
  const next = Math.max(MIN_LORE, Math.min(maxLoreFor(player), val));
  if (next === counts[player]) return;
  const prev = counts[player];
  counts[player] = next;

  const el   = document.getElementById(`count${player}`);
  const drop = el.closest('.symbol-wrap').querySelector('.lore-drop');

  el.textContent = next;

  // Register history entry (debounced)
  addHistoryEntry(player, next - prev, prev);

  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 130);

  drop.classList.remove('pulse');
  void drop.offsetWidth;
  drop.classList.add('pulse');
  setTimeout(() => drop.classList.remove('pulse'), 320);

  // Update button disabled states
  document.querySelectorAll(`.btn-circle[data-player="${player}"]`).forEach(btn => {
    const delta = parseInt(btn.dataset.delta);
    btn.disabled = (delta < 0 && next <= MIN_LORE) || (delta > 0 && next >= maxLoreFor(player));
  });

  // Check win condition
  updateGameOverState();
}

// ── Buttons ────────────────────────────────────────────────────────────────
document.querySelectorAll('.btn-circle').forEach(btn => {
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    const player = parseInt(btn.dataset.player);
    const delta  = parseInt(btn.dataset.delta);
    setCount(player, counts[player] + delta);
    haptic.button();
  });
});

// ── Dial ───────────────────────────────────────────────────────────────────
const TICK_COUNT   = 48;   // ticks rendered in the strip
const TICK_GAP     = 13;   // px between ticks
const STEP_PX      = TICK_GAP; // px of drag per lore step

function buildTicks(container) {
  container.innerHTML = '';
  // Render extra ticks on each side so scrolling looks seamless
  const total = TICK_COUNT + 20;
  for (let i = 0; i < total; i++) {
    const t = document.createElement('div');
    t.className = 'dial-tick ' + (i % 5 === 0 ? 'major' : 'minor');
    // Spread across 140% of the container width so edges are always filled
    t.style.left = `${(i / (total - 1)) * 140 - 20}%`;
    container.appendChild(t);
  }
}

buildTicks(document.getElementById('dialTicks1'));
buildTicks(document.getElementById('dialTicks2'));

// Per-dial drag state
const drag = {
  1: { active: false, startX: 0, steps: 0 },
  2: { active: false, startX: 0, steps: 0 },
};

function scrollTicks(player, offsetPx) {
  const ticks = document.getElementById(`dialTicks${player}`);
  // Loop the offset within one tick gap for seamless feel
  const loop = ((offsetPx % TICK_GAP) + TICK_GAP) % TICK_GAP;
  ticks.style.transform = `translateX(${loop - TICK_GAP / 2}px)`;
}

function setupDial(player) {
  const track = document.getElementById(`dialTrack${player}`);
  const d = drag[player];

  // Player 2's half is rotated 180°, so drag direction is mirrored
  const dir = player === 2 ? -1 : 1;

  track.addEventListener('pointerdown', e => {
    e.preventDefault();
    track.setPointerCapture(e.pointerId);
    d.active = true;
    d.startX = e.clientX;
    d.steps  = 0;
  });

  track.addEventListener('pointermove', e => {
    if (!d.active) return;
    e.preventDefault();

    const moved  = (e.clientX - d.startX) * dir;
    const steps  = Math.trunc(moved / STEP_PX);
    const delta  = steps - d.steps;

    // Scroll ticks for visual feedback
    scrollTicks(player, moved);

    if (delta !== 0) {
      d.steps = steps;
      setCount(player, counts[player] + delta);
      haptic.tick();
    }
  });

  const onEnd = () => {
    if (!d.active) return;
    d.active = false;
    // Snap ticks back to neutral
    scrollTicks(player, 0);
  };

  track.addEventListener('pointerup',     onEnd);
  track.addEventListener('pointercancel', onEnd);
}

setupDial(1);
setupDial(2);

// ── Init button states ─────────────────────────────────────────────────────
[1, 2].forEach(player => {
  document.querySelectorAll(`.btn-circle[data-player="${player}"]`).forEach(btn => {
    const delta = parseInt(btn.dataset.delta);
    btn.disabled = (delta < 0 && counts[player] <= MIN_LORE) || (delta > 0 && counts[player] >= maxLoreFor(player));
  });
});

// ── History log ───────────────────────────────────────────────────────────
const history = [];

// Debounce state per player: accumulate deltas within 3s window
const HISTORY_DEBOUNCE_MS = 2000;
const pendingEntry = {
  1: { timer: null, delta: 0, scoreBefore: 0 },
  2: { timer: null, delta: 0, scoreBefore: 0 },
};

function flushHistory(player) {
  const p = pendingEntry[player];
  if (p.delta === 0) return;
  history.unshift({
    player,
    delta: p.delta,
    scoreBefore: p.scoreBefore,
    scoreAfter: p.scoreBefore + p.delta,
  });
  p.delta = 0;
  p.timer = null;
}

function addHistoryEntry(player, delta, scoreBefore) {
  const p = pendingEntry[player];

  if (p.timer === null) {
    // Start new window
    p.scoreBefore = scoreBefore;
    p.delta = delta;
  } else {
    // Accumulate within window
    clearTimeout(p.timer);
    p.delta += delta;
  }

  p.timer = setTimeout(() => flushHistory(player), HISTORY_DEBOUNCE_MS);
}

function renderHistory() {
  const list = document.getElementById('historyList');
  // Update totals
  document.querySelector('#historyTotal1 strong').textContent = counts[1];
  document.querySelector('#historyTotal2 strong').textContent = counts[2];

  if (history.length === 0) {
    list.innerHTML = '<p class="history-empty">Nenhum registro ainda.</p>';
    return;
  }

  list.innerHTML = history.map(e => `
    <div class="history-entry">
      <span class="history-entry__player">Jogador ${e.player}</span>
      <span class="history-entry__delta ${e.delta > 0 ? 'positive' : 'negative'}">
        ${e.delta > 0 ? '+' : ''}${e.delta}
      </span>
      <span class="history-entry__score">${e.scoreBefore} → ${e.scoreAfter}</span>
    </div>
  `).join('');
}

const historyBackdrop = document.getElementById('historyBackdrop');

document.getElementById('btnHistory').addEventListener('click', () => {
  // Flush any pending entries before rendering
  [1, 2].forEach(p => {
    clearTimeout(pendingEntry[p].timer);
    flushHistory(p);
  });
  renderHistory();
  historyBackdrop.classList.add('visible');
});

document.getElementById('historyClose').addEventListener('click', () => {
  historyBackdrop.classList.remove('visible');
});

historyBackdrop.addEventListener('click', e => {
  if (!document.getElementById('historySheet').contains(e.target)) {
    historyBackdrop.classList.remove('visible');
  }
});

// ── Exception bottom sheet ────────────────────────────────────────────────
const sheetBackdrop = document.getElementById('sheetBackdrop');
const sheetCardImg  = document.getElementById('sheetCardImg');

document.getElementById('btnLore').addEventListener('click', () => {
  // Sync visual state of player buttons with current donaldOwner state
  document.querySelectorAll('.sheet-player-btn').forEach(btn => {
    const player = parseInt(btn.dataset.player);
    const icon   = btn.querySelector('.sheet-check-icon');
    if (donaldOwner[player]) {
      btn.classList.add('active');
      icon.classList.replace('fa-regular', 'fa-solid');
      icon.classList.replace('fa-square', 'fa-square-check');
    } else {
      btn.classList.remove('active');
      icon.classList.replace('fa-solid', 'fa-regular');
      icon.classList.replace('fa-square-check', 'fa-square');
    }
  });
  sheetBackdrop.classList.add('visible');
  sheetBackdrop.classList.remove('collapsed');
  sheetCardImg.classList.add('visible');
});

sheetCardImg.addEventListener('click', (e) => {
  e.stopPropagation();
  if (sheetBackdrop.classList.contains('collapsed')) {
    sheetBackdrop.classList.remove('collapsed');
  } else {
    sheetBackdrop.classList.add('collapsed');
  }
});

function closeSheet() {
  sheetBackdrop.classList.remove('visible', 'collapsed');
  sheetCardImg.classList.remove('visible');
}

sheetBackdrop.addEventListener('click', e => {
  // Ignore clicks that originated on the card image
  if (e.target === sheetCardImg) return;
  if (!document.getElementById('sheet').contains(e.target)) closeSheet();
});

document.getElementById('sheetContinue').addEventListener('click', closeSheet);
document.getElementById('sheetCancel').addEventListener('click', closeSheet);

// Player selection in sheet — toggle independently (both can be active)
document.querySelectorAll('.sheet-player-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const player = parseInt(btn.dataset.player);
    const icon   = btn.querySelector('.sheet-check-icon');
    btn.classList.toggle('active');
    const isActive = btn.classList.contains('active');

    if (isActive) {
      icon.classList.replace('fa-regular', 'fa-solid');
      icon.classList.replace('fa-square', 'fa-square-check');
    } else {
      icon.classList.replace('fa-solid', 'fa-regular');
      icon.classList.replace('fa-square-check', 'fa-square');
    }

    // Update donald ownership and refresh button states
    donaldOwner[player] = isActive;
    // Refresh +/- disabled state for both players (limits may have changed)
    [1, 2].forEach(p => {
      document.querySelectorAll(`.btn-circle[data-player="${p}"]`).forEach(b => {
        const delta = parseInt(b.dataset.delta);
        b.disabled = (delta < 0 && counts[p] <= MIN_LORE) || (delta > 0 && counts[p] >= maxLoreFor(p));
      });
    });
    updateGameOverState();
  });
});
const gameoverWrap = document.getElementById('gameoverWrap');

function updateGameOverState() {
  const winner = counts[1] >= maxLoreFor(1) ? 1 : counts[2] >= maxLoreFor(2) ? 2 : null;
  const loser  = winner === 1 ? 2 : winner === 2 ? 1 : null;

  if (winner) {
    document.getElementById(`player${winner}`).classList.add('dimmed', 'winner');
    document.getElementById(`player${loser}`).classList.add('dimmed');

    document.querySelectorAll(`.btn-circle[data-player="${winner}"]`).forEach(btn => {
      if (parseInt(btn.dataset.delta) < 0) btn.classList.add('keep');
    });

    document.querySelectorAll(`.btn-circle[data-player="${loser}"]`).forEach(btn => {
      btn.disabled = true;
    });

    gameoverWrap.classList.add('visible');
  } else {
    [1, 2].forEach(p => {
      document.getElementById(`player${p}`).classList.remove('dimmed', 'winner');
      document.querySelectorAll(`.btn-circle[data-player="${p}"]`).forEach(btn => {
        btn.classList.remove('keep');
        const delta = parseInt(btn.dataset.delta);
        btn.disabled = (delta < 0 && counts[p] <= MIN_LORE) || (delta > 0 && counts[p] >= maxLoreFor(p));
      });
    });
    gameoverWrap.classList.remove('visible');
  }
}

document.getElementById('gameoverBtn').addEventListener('click', () => {
  const winner = counts[1] >= maxLoreFor(1) ? 1 : 2;
  document.getElementById('modalWinner').textContent = `JOGADOR ${winner} VENCEU!`;
  document.getElementById('modalBackdrop').classList.add('visible');
});

document.getElementById('modalNewGame').addEventListener('click', () => {
  document.getElementById('modalBackdrop').classList.remove('visible');
  // Reset scores
  [1, 2].forEach(p => {
    counts[p] = 0;
    document.getElementById(`count${p}`).textContent = 0;
  });
  // Reset donald card effect
  donaldOwner[1] = false;
  donaldOwner[2] = false;
  // Clear history and pending entries
  history.length = 0;
  [1, 2].forEach(p => {
    clearTimeout(pendingEntry[p].timer);
    pendingEntry[p] = { timer: null, delta: 0, scoreBefore: 0 };
  });
  updateGameOverState();
});
