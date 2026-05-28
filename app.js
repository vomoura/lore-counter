'use strict';

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
  counts[player] = next;

  const el   = document.getElementById(`count${player}`);
  const drop = el.closest('.symbol-wrap').querySelector('.lore-drop');

  el.textContent = next;

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
    btn.disabled = (delta < 0 && counts[player] <= MIN_LORE) || (delta > 0 && counts[player] >= MAX_LORE);
  });
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
  // Reset only the visual selection state, NOT donaldOwner
  document.querySelectorAll('.sheet-player-btn').forEach(btn => {
    btn.classList.remove('active');
    const icon = btn.querySelector('.sheet-check-icon');
    icon.classList.replace('fa-solid', 'fa-regular');
    icon.classList.replace('fa-square-check', 'fa-square');
  });
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
  // Show modal with winner name
  const winner = counts[1] >= MAX_LORE ? 1 : 2;
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
  updateGameOverState();
});
