'use strict';

// ── Version ───────────────────────────────────────────────────────────────
const APP_VERSION = '2.2.0';
const splashVersionEl = document.getElementById('splashVersion');
if (splashVersionEl) splashVersionEl.textContent = `v${APP_VERSION}`;

// ── Auto-update: reload when SW activates a new version ───────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'SW_UPDATED') window.location.reload();
  });
}

// ── Screen Wake Lock ──────────────────────────────────────────────────────
let wakeLock = null;
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLock();
});
requestWakeLock();

// ── Splash screen ─────────────────────────────────────────────────────────
const splashEl    = document.getElementById('splash');
const splashStart = Date.now();
const MIN_SPLASH_MS = 4000;
function hideSplash() {
  const remaining = Math.max(0, MIN_SPLASH_MS - (Date.now() - splashStart));
  setTimeout(() => splashEl.classList.add('hidden'), remaining);
}
window.addEventListener('load', hideSplash);

// ── Install prompt ────────────────────────────────────────────────────────
let deferredInstallPrompt = null;
const installPromptEl       = document.getElementById('installPrompt');
const installPromptClose    = document.getElementById('installPromptClose');
const installPromptIos      = document.getElementById('installPromptIos');
const installPromptIosClose = document.getElementById('installPromptIosClose');

const isIos           = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInStandalone  = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

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

if (isIos && !isInStandalone && !localStorage.getItem('installDismissedIos')) {
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

// ── Core state ────────────────────────────────────────────────────────────
const counts     = { 1: 0, 2: 0 };
const haptic     = { tick: () => navigator.vibrate?.(10), button: () => navigator.vibrate?.(25) };
const MIN_LORE   = 0;
const MAX_LORE   = 20;
const donaldOwner = { 1: false, 2: false };

// MD / wins state
let matchMode  = 1;   // 1 = MD1, 3 = MD3
let wins       = { 1: 0, 2: 0 };
let inRound    = false; // true only when a round was started via INICIAR RODADA

function maxLoreFor(player) {
  const opp = player === 1 ? 2 : 1;
  return donaldOwner[opp] ? 25 : MAX_LORE;
}

// ── Win pips ──────────────────────────────────────────────────────────────
const PIP_SVG = `<svg viewBox="0 0 220 300" xmlns="http://www.w3.org/2000/svg">
  <path d="M 110.00 29.00 C 128.00 86.00, 156.00 136.00, 188.00 185.00 C 156.00 214.00, 128.00 242.00, 110.00 263.00 C 92.00 242.00, 64.00 214.00, 32.00 185.00 C 64.00 136.00, 92.00 86.00, 110.00 29.00 Z"/>
</svg>`;

function renderWinPips() {
  [1, 2].forEach(p => {
    const el = document.getElementById(`winPips${p}`);
    if (!el) return;
    if (!inRound) { el.innerHTML = ''; return; }
    const total = matchMode === 3 ? 2 : 1;
    el.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const pip = document.createElement('div');
      pip.className = 'win-pip' + (i < wins[p] ? ' filled' : '');
      pip.innerHTML = PIP_SVG;
      el.appendChild(pip);
    }
  });
}

// ── Update display ────────────────────────────────────────────────────────
function setCount(player, val) {
  const next = Math.max(MIN_LORE, Math.min(maxLoreFor(player), val));
  if (next === counts[player]) return;
  const prev = counts[player];
  counts[player] = next;

  const el   = document.getElementById(`count${player}`);
  const drop = el.closest('.symbol-wrap').querySelector('.lore-drop');
  el.textContent = next;

  addHistoryEntry(player, next - prev, prev);

  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 130);

  drop.classList.remove('pulse');
  void drop.offsetWidth;
  drop.classList.add('pulse');
  setTimeout(() => drop.classList.remove('pulse'), 320);

  document.querySelectorAll(`.btn-circle[data-player="${player}"]`).forEach(btn => {
    const delta = parseInt(btn.dataset.delta);
    btn.disabled = (delta < 0 && next <= MIN_LORE) || (delta > 0 && next >= maxLoreFor(player));
  });

  // Sudden death: first player to pull ahead wins immediately
  if (suddenDeath && counts[1] !== counts[2]) {
    const winner = counts[1] > counts[2] ? 1 : 2;
    suddenDeath = false;
    setTimeout(() => showMatchWinner(winner), 300); // brief delay so lore update is visible
    return;
  }

  updateGameOverState();
}

// ── Buttons ───────────────────────────────────────────────────────────────
document.querySelectorAll('.btn-circle').forEach(btn => {
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    setCount(parseInt(btn.dataset.player), counts[parseInt(btn.dataset.player)] + parseInt(btn.dataset.delta));
    haptic.button();
  });
});

// ── Dial ──────────────────────────────────────────────────────────────────
const TICK_COUNT = 48, TICK_GAP = 13, STEP_PX = TICK_GAP;

function buildTicks(container) {
  container.innerHTML = '';
  const total = TICK_COUNT + 20;
  for (let i = 0; i < total; i++) {
    const t = document.createElement('div');
    t.className = 'dial-tick ' + (i % 5 === 0 ? 'major' : 'minor');
    t.style.left = `${(i / (total - 1)) * 140 - 20}%`;
    container.appendChild(t);
  }
}
buildTicks(document.getElementById('dialTicks1'));
buildTicks(document.getElementById('dialTicks2'));

const drag = { 1: { active: false, startX: 0, steps: 0 }, 2: { active: false, startX: 0, steps: 0 } };

function scrollTicks(player, offsetPx) {
  const ticks = document.getElementById(`dialTicks${player}`);
  const loop  = ((offsetPx % TICK_GAP) + TICK_GAP) % TICK_GAP;
  ticks.style.transform = `translateX(${loop - TICK_GAP / 2}px)`;
}

function setupDial(player) {
  const track = document.getElementById(`dialTrack${player}`);
  const d = drag[player];
  const dir = player === 2 ? -1 : 1;

  track.addEventListener('pointerdown', e => {
    e.preventDefault();
    track.setPointerCapture(e.pointerId);
    d.active = true; d.startX = e.clientX; d.steps = 0;
  });
  track.addEventListener('pointermove', e => {
    if (!d.active) return;
    e.preventDefault();
    const moved = (e.clientX - d.startX) * dir;
    const steps = Math.trunc(moved / STEP_PX);
    const delta = steps - d.steps;
    scrollTicks(player, moved);
    if (delta !== 0) { d.steps = steps; setCount(player, counts[player] + delta); haptic.tick(); }
  });
  const onEnd = () => { if (!d.active) return; d.active = false; scrollTicks(player, 0); };
  track.addEventListener('pointerup',     onEnd);
  track.addEventListener('pointercancel', onEnd);
}
setupDial(1);
setupDial(2);

// ── Init button states ────────────────────────────────────────────────────
[1, 2].forEach(player => {
  document.querySelectorAll(`.btn-circle[data-player="${player}"]`).forEach(btn => {
    const delta = parseInt(btn.dataset.delta);
    btn.disabled = (delta < 0 && counts[player] <= MIN_LORE) || (delta > 0 && counts[player] >= maxLoreFor(player));
  });
});
renderWinPips();

// ── History log ───────────────────────────────────────────────────────────
const history = [];
const HISTORY_DEBOUNCE_MS = 2000;
const pendingEntry = { 1: { timer: null, delta: 0, scoreBefore: 0 }, 2: { timer: null, delta: 0, scoreBefore: 0 } };

function flushHistory(player) {
  const p = pendingEntry[player];
  if (p.delta === 0) return;
  history.push({ player, delta: p.delta, scoreBefore: p.scoreBefore, scoreAfter: p.scoreBefore + p.delta });
  p.delta = 0; p.timer = null;
}
function addHistoryEntry(player, delta, scoreBefore) {
  const p = pendingEntry[player];
  if (p.timer === null) { p.scoreBefore = scoreBefore; p.delta = delta; }
  else { clearTimeout(p.timer); p.delta += delta; }
  p.timer = setTimeout(() => flushHistory(player), HISTORY_DEBOUNCE_MS);
}
function renderHistory() {
  const entryHTML = e => `
    <div class="history-entry">
      <span class="history-entry__delta ${e.delta > 0 ? 'positive' : 'negative'}">${e.delta > 0 ? '+' : ''}${e.delta}</span>
      <span class="history-entry__score">${e.scoreBefore} → ${e.scoreAfter}</span>
    </div>`;

  const empty = '<p class="history-empty">—</p>';

  [1, 2].forEach(p => {
    const list    = document.getElementById(`historyList${p}`);
    const entries = history.filter(e => e.player === p);
    list.innerHTML = entries.length ? entries.map(entryHTML).join('') : empty;
  });
}

const historyBackdrop = document.getElementById('historyBackdrop');
document.getElementById('fabHistory').addEventListener('click', () => {
  closeFabMenu();
  [1, 2].forEach(p => { clearTimeout(pendingEntry[p].timer); flushHistory(p); });
  renderHistory();
  historyBackdrop.classList.add('visible');
  // Scroll both columns to bottom so most recent is visible
  setTimeout(() => {
    [1, 2].forEach(p => {
      const list = document.getElementById(`historyList${p}`);
      if (list) list.scrollTop = list.scrollHeight;
    });
  }, 50);
});
document.getElementById('historyClose').addEventListener('click', () => historyBackdrop.classList.remove('visible'));
historyBackdrop.addEventListener('click', e => {
  if (!document.getElementById('historySheet').contains(e.target)) historyBackdrop.classList.remove('visible');
});

// ── Exception sheet ───────────────────────────────────────────────────────
const sheetBackdrop = document.getElementById('sheetBackdrop');
const sheetCardImg  = document.getElementById('sheetCardImg');

document.getElementById('fabException').addEventListener('click', () => {
  closeFabMenu();
  document.querySelectorAll('.sheet-player-btn').forEach(btn => {
    const player = parseInt(btn.dataset.player);
    const icon   = btn.querySelector('.sheet-check-icon');
    if (donaldOwner[player]) { btn.classList.add('active'); icon.classList.replace('fa-regular','fa-solid'); icon.classList.replace('fa-square','fa-square-check'); }
    else { btn.classList.remove('active'); icon.classList.replace('fa-solid','fa-regular'); icon.classList.replace('fa-square-check','fa-square'); }
  });
  sheetBackdrop.classList.add('visible');
  sheetBackdrop.classList.remove('collapsed');
  sheetCardImg.classList.add('visible');
});
sheetCardImg.addEventListener('click', e => {
  e.stopPropagation();
  sheetBackdrop.classList.toggle('collapsed');
});
function closeSheet() { sheetBackdrop.classList.remove('visible', 'collapsed'); sheetCardImg.classList.remove('visible'); }
sheetBackdrop.addEventListener('click', e => { if (e.target === sheetCardImg) return; if (!document.getElementById('sheet').contains(e.target)) closeSheet(); });
document.getElementById('sheetContinue').addEventListener('click', closeSheet);
document.getElementById('sheetCancel').addEventListener('click', closeSheet);

document.querySelectorAll('.sheet-player-btn').forEach(btn => {
  if (!btn.closest('#sheet')) return;
  btn.addEventListener('click', () => {
    const player = parseInt(btn.dataset.player);
    const icon   = btn.querySelector('.sheet-check-icon');
    btn.classList.toggle('active');
    const isActive = btn.classList.contains('active');
    if (isActive) { icon.classList.replace('fa-regular','fa-solid'); icon.classList.replace('fa-square','fa-square-check'); }
    else           { icon.classList.replace('fa-solid','fa-regular'); icon.classList.replace('fa-square-check','fa-square'); }
    donaldOwner[player] = isActive;
    [1, 2].forEach(p => {
      document.querySelectorAll(`.btn-circle[data-player="${p}"]`).forEach(b => {
        const delta = parseInt(b.dataset.delta);
        b.disabled = (delta < 0 && counts[p] <= MIN_LORE) || (delta > 0 && counts[p] >= maxLoreFor(p));
      });
    });
    updateGameOverState();
  });
});

// ── Hamburger FAB menu ────────────────────────────────────────────────────
const btnHamburger = document.getElementById('btnHamburger');
const fabMenu      = document.getElementById('fabMenu');
const fabRing      = document.getElementById('fabRing');
let fabOpen = false;

function closeFabMenu() {
  fabOpen = false;
  fabMenu.classList.remove('open');
  btnHamburger.classList.remove('open');
  fabRing.classList.remove('open');
}

btnHamburger.addEventListener('click', () => {
  fabOpen = !fabOpen;
  fabMenu.classList.toggle('open', fabOpen);
  btnHamburger.classList.toggle('open', fabOpen);
  fabRing.classList.toggle('open', fabOpen);
});

// Close FAB if clicking outside or on the ring
document.addEventListener('pointerdown', e => {
  if (!fabOpen) return;
  // If clicking the hamburger button itself, let its click handler handle it
  if (btnHamburger.contains(e.target)) return;
  if (!fabMenu.contains(e.target)) closeFabMenu();
});

fabRing.addEventListener('click', () => {
  if (fabOpen) closeFabMenu();
});

// ── Restart sheet ─────────────────────────────────────────────────────────
const restartBackdrop = document.getElementById('restartBackdrop');
let selectedConcede   = null; // 1, 2, or null = just restart

document.getElementById('fabRestart').addEventListener('click', () => {
  closeFabMenu();
  selectedConcede = null;
  document.getElementById('restartConfirmBtn').disabled = true;
  // Reset selection visuals
  document.querySelectorAll('.restart-concede-btn').forEach(b => {
    b.classList.remove('active', 'disabled-btn');
    const icon = b.querySelector('.sheet-check-icon');
    icon.classList.replace('fa-solid','fa-regular');
    icon.classList.replace('fa-square-check','fa-square');
  });

  // Determine mode: round active = timer running OR matchMode was set via INICIAR RODADA
  const isInRound = inRound || timerInterval !== null || timerRemaining > 0;
  document.getElementById('restartModeRound').style.display  = isInRound ? '' : 'none';
  document.getElementById('restartModeCasual').style.display = isInRound ? 'none' : '';

  restartBackdrop.classList.add('visible');
});

document.getElementById('restartZeroBtn').addEventListener('click', () => {
  restartBackdrop.classList.remove('visible');
  gameReset(true); // keepTimer = true — timer keeps running
});

document.querySelectorAll('.restart-concede-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const concede = btn.dataset.concede;
    const alreadyActive = btn.classList.contains('active');

    // Reset all first
    document.querySelectorAll('.restart-concede-btn').forEach(b => {
      b.classList.remove('active', 'disabled-btn');
      const icon = b.querySelector('.sheet-check-icon');
      icon.classList.replace('fa-solid', 'fa-regular');
      icon.classList.replace('fa-square-check', 'fa-square');
    });

    if (alreadyActive) {
      selectedConcede = null;
      document.getElementById('restartConfirmBtn').disabled = true;
    } else {
      selectedConcede = concede;
      btn.classList.add('active');
      const icon = btn.querySelector('.sheet-check-icon');
      icon.classList.replace('fa-regular', 'fa-solid');
      icon.classList.replace('fa-square', 'fa-square-check');
      document.querySelectorAll('.restart-concede-btn').forEach(b => {
        if (b !== btn) b.classList.add('disabled-btn');
      });
      document.getElementById('restartConfirmBtn').disabled = false;
    }
  });
});

document.getElementById('drawNewRoundBtn').addEventListener('click', () => {
  document.getElementById('drawBackdrop').classList.remove('visible');
  wins = { 1: 0, 2: 0 };
  renderWinPips();
  fullReset();
  document.getElementById('timerBackdrop').classList.add('visible');
});
document.getElementById('restartCancel').addEventListener('click', () => restartBackdrop.classList.remove('visible'));
restartBackdrop.addEventListener('click', e => {
  if (!document.getElementById('restartSheet').contains(e.target)) restartBackdrop.classList.remove('visible');
});

document.getElementById('restartConfirmBtn').addEventListener('click', () => {
  if (selectedConcede === 'draw') {
    // Draw: both players get 1 pip, end round
    restartBackdrop.classList.remove('visible');
    wins[1] = Math.min(wins[1] + 1, matchMode === 3 ? 2 : 1);
    wins[2] = Math.min(wins[2] + 1, matchMode === 3 ? 2 : 1);
    renderWinPips();
    document.getElementById('drawBackdrop').classList.add('visible');
  } else if (selectedConcede !== null) {
    // Concede: show confirmation
    const winner = selectedConcede === '1' ? 2 : 1;
    document.getElementById('concedeText').textContent =
      `Caso confirme o Jogador ${winner} será o vencedor deste jogo!`;
    document.getElementById('concedeBackdrop').classList.add('visible');
  } else {
    // Just reset scores
    restartBackdrop.classList.remove('visible');
    gameReset();
  }
});

document.getElementById('concedeCancelBtn').addEventListener('click', () => {
  document.getElementById('concedeBackdrop').classList.remove('visible');
});

document.getElementById('concedeConfirmBtn').addEventListener('click', () => {
  document.getElementById('concedeBackdrop').classList.remove('visible');
  restartBackdrop.classList.remove('visible');
  const winner = selectedConcede === '1' ? 2 : 1;
  showWinnerModal(winner, false);
});

// ── Game over state ───────────────────────────────────────────────────────
const gameoverWrap = document.getElementById('gameoverWrap');

function updateGameOverState() {
  const winner = counts[1] >= maxLoreFor(1) ? 1 : counts[2] >= maxLoreFor(2) ? 2 : null;
  const loser  = winner === 1 ? 2 : winner === 2 ? 1 : null;
  if (winner) {
    document.getElementById(`player${winner}`).classList.add('dimmed', 'winner');
    document.getElementById(`player${loser}`).classList.add('dimmed');
    document.querySelectorAll(`.btn-circle[data-player="${winner}"]`).forEach(btn => { if (parseInt(btn.dataset.delta) < 0) btn.classList.add('keep'); });
    document.querySelectorAll(`.btn-circle[data-player="${loser}"]`).forEach(btn => { btn.disabled = true; });
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
  showWinnerModal(winner, false);
});

// ── Winner modal ──────────────────────────────────────────────────────────
function showWinnerModal(winner, isMatchWin) {
  const modalWinner  = document.getElementById('modalWinner');
  const modalNewGame = document.getElementById('modalNewGame');

  if (isMatchWin) {
    modalWinner.textContent  = `JOGADOR ${winner} VENCEU A RODADA!`;
    modalNewGame.textContent = 'NOVA RODADA';
  } else {
    // Increment win pip immediately so player sees it filled before clicking
    wins[winner]++;
    renderWinPips();

    const winsNeeded = matchMode === 3 ? 2 : 1;
    if (wins[winner] >= winsNeeded) {
      // This game win also wins the match — show match win modal
      modalWinner.textContent  = `JOGADOR ${winner} VENCEU A RODADA!`;
      modalNewGame.textContent = 'NOVA RODADA';
      modalNewGame.dataset.matchWin = '1';
    } else {
      modalWinner.textContent  = `JOGADOR ${winner} VENCEU O JOGO!`;
      modalNewGame.textContent = 'PRÓXIMO JOGO';
      modalNewGame.dataset.matchWin = '0';
    }
  }

  modalNewGame.dataset.winner = winner;
  document.getElementById('modalBackdrop').classList.add('visible');
}

document.getElementById('modalNewGame').addEventListener('click', () => {
  document.getElementById('modalBackdrop').classList.remove('visible');
  const isMatchWin = document.getElementById('modalNewGame').dataset.matchWin === '1';

  if (isMatchWin) {
    // Match won — full reset and open timer for new round
    wins = { 1: 0, 2: 0 };
    renderWinPips();
    fullReset();
    document.getElementById('timerBackdrop').classList.add('visible');
  } else {
    // Next game within match — keep timer running
    gameReset(true);
  }
});

// ── Reset helpers ─────────────────────────────────────────────────────────
function gameReset(keepTimer = false) {
  [1, 2].forEach(p => {
    counts[p] = 0;
    document.getElementById(`count${p}`).textContent = 0;
  });
  donaldOwner[1] = false;
  donaldOwner[2] = false;
  suddenDeath = false;
  history.length = 0;
  [1, 2].forEach(p => { clearTimeout(pendingEntry[p].timer); pendingEntry[p] = { timer: null, delta: 0, scoreBefore: 0 }; });
  updateGameOverState();
  if (!keepTimer) stopTimer();
}

function fullReset() {
  gameReset();
  wins      = { 1: 0, 2: 0 };
  matchMode = 1;
  inRound   = false;
  renderWinPips();
}

// ── Timer ─────────────────────────────────────────────────────────────────
let timerInterval   = null;
let timerRemaining  = 0;
let timerTotal      = 0;
let timerMd         = 1;
let extraTurns      = 0;
let timerStartedAt  = null; // Date.now() when timer last became active
const timerDisplay  = document.getElementById('timerDisplay');
const timerText     = document.getElementById('timerText');
const CIRCUMFERENCE = 2 * Math.PI * 32; // r=32 → ~201.06

// Re-sync timer when app returns to foreground
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && timerInterval && timerStartedAt !== null) {
    const elapsed = Math.floor((Date.now() - timerStartedAt) / 1000);
    timerStartedAt = Date.now();
    if (elapsed > 0) {
      timerRemaining = Math.max(0, timerRemaining - elapsed);
      updateTimerDisplay();
      // Check if timer expired while in background
      if (timerRemaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        timerDisplay.classList.remove('pulsing');
        navigator.vibrate?.(3000);
        document.getElementById('timerEndBackdrop').classList.add('visible');
      }
    }
  }
});

// Timer setup sheet
document.getElementById('fabTimer').addEventListener('click', () => {
  closeFabMenu();
  document.getElementById('timerBackdrop').classList.add('visible');
  // Scroll to last selected value (default 0 on first open)
  setTimeout(() => scrollPickerTo(pickerSelected), 50);
});

// MD buttons
document.getElementById('timerMd1').addEventListener('click', () => {
  timerMd = 1;
  document.getElementById('timerMd1').classList.add('active');
  document.getElementById('timerMd3').classList.remove('active');
});
document.getElementById('timerMd3').addEventListener('click', () => {
  timerMd = 3;
  document.getElementById('timerMd3').classList.add('active');
  document.getElementById('timerMd1').classList.remove('active');
});

// Timer picker scroll
const picker = document.getElementById('timerPicker');
const PICKER_VALS = [0, 30, 35, 40, 45, 50, 55, 60];
let pickerSelected = 0;

function scrollPickerTo(val) {
  const idx = PICKER_VALS.indexOf(val);
  if (idx < 0) return;
  const itemH = 44;
  picker.scrollTop = idx * itemH;
  updatePickerHighlight();
}

function updatePickerHighlight() {
  const itemH  = 44;
  const center = picker.scrollTop + picker.clientHeight / 2;
  document.querySelectorAll('.timer-picker-item').forEach((item, i) => {
    const itemCenter = i * itemH + itemH / 2;
    const dist = Math.abs(center - itemCenter - 44); // 44 = padding
    item.classList.toggle('active', dist < itemH / 2);
    if (dist < itemH / 2) { pickerSelected = PICKER_VALS[i]; }
  });
}

picker.addEventListener('scroll', () => {
  const prev = pickerSelected;
  updatePickerHighlight();
  if (pickerSelected !== prev) haptic.tick();
});
document.querySelectorAll('.timer-picker-item').forEach((item, i) => {
  item.addEventListener('click', () => scrollPickerTo(PICKER_VALS[i]));
});

document.getElementById('timerBackdrop').addEventListener('click', e => {
  if (!document.getElementById('timerSheet').contains(e.target)) document.getElementById('timerBackdrop').classList.remove('visible');
});

document.getElementById('timerCancel')?.addEventListener('click', () => {
  document.getElementById('timerBackdrop').classList.remove('visible');
});

document.getElementById('timerStartBtn').addEventListener('click', () => {
  document.getElementById('timerBackdrop').classList.remove('visible');
  matchMode = timerMd;
  inRound   = true;
  renderWinPips();
  if (pickerSelected === 0) {
    stopTimer();
  } else {
    startTimer(pickerSelected);
  }
});

function startTimer(minutes) {
  stopTimer();
  timerTotal     = minutes * 60;
  timerRemaining = timerTotal;
  extraTurns     = 0;
  timerStartedAt = Date.now();
  timerDisplay.style.display = 'flex';
  timerDisplay.classList.remove('pulsing', 'last-third');
  // Init ring
  const progress = document.getElementById('timerRingProgress');
  if (progress) {
    progress.style.strokeDasharray  = CIRCUMFERENCE;
    progress.style.strokeDashoffset = 0;
  }
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timerStartedAt = Date.now();
    timerRemaining--;
    updateTimerDisplay();

    const third = timerTotal / 3;

    // Vibrate when crossing exact 1/3 thresholds of remaining time
    // 2/3 remaining = 1/3 elapsed, 1/3 remaining = 2/3 elapsed
    const twoThirds = Math.round(timerTotal * 2 / 3);
    const oneThird  = Math.round(timerTotal / 3);

    if (timerRemaining === twoThirds || timerRemaining === oneThird) {
      navigator.vibrate?.([150, 80, 150, 80, 150]);
      triggerTimerPulse();
    }

    // Last third: keep pulsing
    if (timerRemaining <= oneThird && !timerDisplay.classList.contains('pulsing')) {
      timerDisplay.classList.add('pulsing');
    }

    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerDisplay.classList.remove('pulsing');
      navigator.vibrate?.(3000);
      document.getElementById('timerEndBackdrop').classList.add('visible');
    }
  }, 1000);
}

function updateTimerRing() {
  const progress = document.getElementById('timerRingProgress');
  if (!progress) return;
  if (extraTurns > 0) {
    progress.style.strokeDashoffset = 0;
    return;
  }
  const ratio = timerRemaining / timerTotal;
  progress.style.strokeDashoffset = -CIRCUMFERENCE * (1 - ratio);
  timerDisplay.classList.toggle('last-third', timerRemaining <= Math.round(timerTotal / 3));
}

function triggerTimerPulse() {
  timerDisplay.classList.remove('pulsing');
  void timerDisplay.offsetWidth;
  timerDisplay.classList.add('pulsing');
  setTimeout(() => {
    if (timerRemaining > Math.round(timerTotal / 3)) timerDisplay.classList.remove('pulsing');
  }, 2000);
}

function updateTimerDisplay() {
  if (extraTurns > 0) {
    timerText.textContent = extraTurns;
    updateTimerRing();
    return;
  }
  const m = Math.floor(timerRemaining / 60);
  timerText.textContent = m;
  updateTimerRing();
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  timerStartedAt = null;
  timerDisplay.style.display = 'none';
  timerDisplay.classList.remove('pulsing', 'last-third');
  extraTurns = 0;
}

// ── Extra turns / sudden death state ──────────────────────────────────────
let suddenDeath = false; // true when extra turns ended tied

// Timer display: click decrements extra turns
timerDisplay.addEventListener('click', () => {
  if (extraTurns <= 0) return;
  extraTurns--;
  updateTimerDisplay();
  haptic.button();

  if (extraTurns === 0) {
    // End of 5 extra turns — evaluate result
    evaluateExtraTurns();
  }
});

function evaluateExtraTurns() {
  timerDisplay.style.display = 'none';

  // Compare wins first
  if (wins[1] !== wins[2]) {
    const winner = wins[1] > wins[2] ? 1 : 2;
    showMatchWinner(winner);
    return;
  }

  // Same wins — compare lore
  if (counts[1] !== counts[2]) {
    const winner = counts[1] > counts[2] ? 1 : 2;
    showMatchWinner(winner);
    return;
  }

  // Totally tied — enter sudden death
  suddenDeath = true;
  // Game continues until one player has more lore
}

function showMatchWinner(winner) {
  suddenDeath = false;
  // Show PARABÉNS modal for NOVA RODADA
  const modalWinner  = document.getElementById('modalWinner');
  const modalNewGame = document.getElementById('modalNewGame');
  modalWinner.textContent  = `JOGADOR ${winner} VENCEU A RODADA!`;
  modalNewGame.textContent = 'NOVA RODADA';
  modalNewGame.dataset.matchWin = '1';
  modalNewGame.dataset.winner   = winner;
  document.getElementById('modalBackdrop').classList.add('visible');
}

// Desempate button
document.getElementById('timerDesempateBtn').addEventListener('click', () => {
  document.getElementById('timerEndBackdrop').classList.remove('visible');
  extraTurns = 5;
  timerDisplay.style.display = 'flex';
  timerDisplay.classList.remove('pulsing');
  timerDisplay.style.cursor = 'pointer';
  updateTimerDisplay();
});
