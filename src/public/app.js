/* eslint-env browser */

const MEMBERS = [
  { name: 'Maia',    emoji: '💁‍♀️', color: '#ff6b9d', dur: '0.44s', delay: '0s'    },
  { name: 'Nazim',   emoji: '🧑‍💻', color: '#6bcbff', dur: '0.50s', delay: '0.12s' },
  { name: 'Basil',   emoji: '🧔',   color: '#6bff9d', dur: '0.40s', delay: '0.06s' },
  { name: 'Tieoulé', emoji: '🕺',   color: '#ffb36b', dur: '0.38s', delay: '0.18s' },
  { name: 'Gabriel', emoji: '😎',   color: '#c96bff', dur: '0.46s', delay: '0.22s' },
  { name: 'Thomas',  emoji: '🤓',   color: '#6bffd4', dur: '0.52s', delay: '0.08s' },
];

let slapCounts = {};
let mepaMode = false;
let audioCtx = null;
let scheduleTimer = null;
let nextNoteTime = 0;
let currentStep = 0;

// ─── Web Audio beat ────────────────────────────────────────────────────────

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function kick(t) {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(0.001, t + 0.45);
  g.gain.setValueAtTime(1.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(t); osc.stop(t + 0.45);
}

function snare(t) {
  const len = audioCtx.sampleRate * 0.18;
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.55, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  src.connect(g); g.connect(audioCtx.destination);
  src.start(t);
}

function hihat(t, vol) {
  const len = audioCtx.sampleRate * 0.06;
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const flt = audioCtx.createBiquadFilter();
  flt.type = 'highpass'; flt.frequency.value = 7000;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  src.connect(flt); flt.connect(g); g.connect(audioCtx.destination);
  src.start(t);
}

// Simple funky bass line (A1-based, loop of 8 steps)
const BASS_FREQS = [55, 55, 65.4, 55, 49, 55, 58.3, 55];

function bass(t, step) {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = BASS_FREQS[step % BASS_FREQS.length];
  g.gain.setValueAtTime(0.28, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(t); osc.stop(t + 0.22);
}

function scheduleBeat() {
  const bpm = 130;
  const step = 60 / bpm / 2; // 8th notes

  while (nextNoteTime < audioCtx.currentTime + 0.25) {
    const s = currentStep;
    if (s % 4 === 0) kick(nextNoteTime);
    if (s % 4 === 2) snare(nextNoteTime);
    hihat(nextNoteTime, s % 2 === 0 ? 0.28 : 0.14);
    if (s % 2 === 0) bass(nextNoteTime, s / 2);
    nextNoteTime += step;
    currentStep = (currentStep + 1) % 8;
  }
}

function startMusic() {
  ensureAudio();
  nextNoteTime = audioCtx.currentTime;
  currentStep = 0;
  scheduleTimer = setInterval(scheduleBeat, 25);
}

function stopMusic() {
  clearInterval(scheduleTimer);
  scheduleTimer = null;
  if (audioCtx) { audioCtx.close(); audioCtx = null; }
}

function playSlapSound() {
  ensureAudio();
  const len = audioCtx.sampleRate * 0.09;
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const g = audioCtx.createGain();
  g.gain.value = 0.45;
  src.connect(g); g.connect(audioCtx.destination);
  src.start();
}

// ─── UI ────────────────────────────────────────────────────────────────────

function mepaName(name) { return name.slice(1); }

function renderCharacters() {
  const grid = document.getElementById('characters');
  grid.innerHTML = MEMBERS.map(m => `
    <div class="character" id="char-${m.name}" data-name="${m.name}"
         style="--color:${m.color};--dur:${m.dur};--delay:${m.delay}">
      <div class="slap-fx" id="fx-${m.name}">👋</div>
      <span class="char-emoji">${m.emoji}</span>
      <div class="char-name" id="name-${m.name}">${m.name}</div>
      <div class="char-count">
        <span class="count-num" id="count-${m.name}">${slapCounts[m.name] || 0}</span>
        slaps
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.character').forEach(el => {
    el.addEventListener('click', () => slap(el.dataset.name));
  });
}

function applyMepaState() {
  MEMBERS.forEach(m => {
    const card = document.getElementById(`char-${m.name}`);
    const nameEl = document.getElementById(`name-${m.name}`);
    if (!card || !nameEl) return;
    if (mepaMode) card.classList.add('dancing');
    else card.classList.remove('dancing');
    nameEl.textContent = mepaMode ? mepaName(m.name) : m.name;
  });
}

async function slap(name) {
  const res = await fetch(`/api/slap/${encodeURIComponent(name)}`, { method: 'POST' });
  if (!res.ok) return;
  const data = await res.json();
  slapCounts[name] = data.count;

  const countEl = document.getElementById(`count-${name}`);
  if (countEl) countEl.textContent = data.count;

  const card = document.getElementById(`char-${name}`);
  const fx = document.getElementById(`fx-${name}`);
  if (card) {
    card.classList.remove('slapped');
    void card.offsetWidth;
    card.classList.add('slapped');
  }
  if (fx) {
    fx.classList.add('show');
    setTimeout(() => fx.classList.remove('show'), 500);
  }
  playSlapSound();
}

function toggleMepa() {
  mepaMode = !mepaMode;
  const btn = document.getElementById('mepaBtn');
  btn.textContent = mepaMode ? '😴 Go back to normal' : '🎉 MEPA mode';
  if (mepaMode) {
    document.body.classList.add('mepa');
    startMusic();
  } else {
    document.body.classList.remove('mepa');
    stopMusic();
  }
  applyMepaState();
}

async function init() {
  const res = await fetch('/api/slaps');
  const rows = await res.json();
  rows.forEach(r => { slapCounts[r.name] = r.count; });
  renderCharacters();
  document.getElementById('mepaBtn').addEventListener('click', toggleMepa);
}

init();
