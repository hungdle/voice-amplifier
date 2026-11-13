'use strict';
const $ = (id) => document.getElementById(id);
const toggle = $('toggle');
const meter = $('meter');
const errorBox = $('error');
const controls = {
  gain: { slider: $('gain'), label: $('gainLabel') },
  bass: { slider: $('bass'), label: $('bassLabel') },
  treble: { slider: $('treble'), label: $('trebleLabel') },
  echo: { slider: $('echo'), label: $('echoLabel') }
};
let stream = null;
let context = null;
let nodes = null;
let animationId = null;
let busy = false;
let stopRequested = false;

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}
function setRunning(running) {
  $('status').textContent = running ? 'Micro đang hoạt động' : 'Chưa bật micro';
  $('dot').classList.toggle('active', running);
  toggle.textContent = running ? 'Tắt micro' : 'Bật micro';
}
function updateControls() {
  const gain = Number(controls.gain.slider.value) / 100;
  const bass = Number(controls.bass.slider.value);
  const treble = Number(controls.treble.slider.value);
  const echo = Number(controls.echo.slider.value) / 100;
  controls.gain.label.textContent = `${Math.round(gain * 100)}%`;
  controls.bass.label.textContent = `${bass > 0 ? '+' : ''}${bass} dB`;
  controls.treble.label.textContent = `${treble > 0 ? '+' : ''}${treble} dB`;
  controls.echo.label.textContent = `${Math.round(echo * 100)}%`;
  if (!context || !nodes || context.state === 'closed') return;
  const t = context.currentTime;
  nodes.outputGain.gain.setTargetAtTime(gain * 0.5, t, 0.02);
  nodes.bass.gain.setTargetAtTime(bass, t, 0.02);
  nodes.treble.gain.setTargetAtTime(treble, t, 0.02);
  nodes.echoGain.gain.setTargetAtTime(echo, t, 0.02);
}
Object.values(controls).forEach(({ slider }) => slider.addEventListener('input', updateControls));

function updateMeter() {
  if (!nodes) return;
  const samples = new Uint8Array(nodes.analyser.fftSize);
  nodes.analyser.getByteTimeDomainData(samples);
  let sum = 0;
  for (const sample of samples) {
    const x = (sample - 128) / 128;
    sum += x * x;
  }
  meter.value = Math.min(100, Math.round(Math.sqrt(sum / samples.length) * 250));
  animationId = requestAnimationFrame(updateMeter);
}

async function stop() {
  stopRequested = true;
  if (animationId !== null) cancelAnimationFrame(animationId);
  animationId = null;
  if (nodes && context && context.state !== 'closed') {
    nodes.outputGain.gain.setValueAtTime(0, context.currentTime);
  }
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
  if (nodes) {
    Object.values(nodes).forEach((node) => {
      try { node.disconnect(); } catch (_) { /* already disconnected */ }
    });
  }
  nodes = null;
  const oldContext = context;
  context = null;
  if (oldContext && oldContext.state !== 'closed') {
    try { await oldContext.close(); } catch (err) { console.warn('Audio close:', err); }
  }
  meter.value = 0;
  setRunning(false);
}

async function start() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Trình duyệt không hỗ trợ micro. Hãy dùng HTTPS trên Safari/Chrome.');
  }
  stopRequested = false;
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
    video: false
  });
  if (stopRequested || document.hidden) {
    localStream.getTracks().forEach((track) => track.stop());
    return;
  }
  stream = localStream;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Trình duyệt không hỗ trợ Web Audio API.');
  context = new AudioContextClass({ latencyHint: 'interactive' });
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  const bass = context.createBiquadFilter();
  bass.type = 'lowshelf';
  bass.frequency.value = 250;
  const treble = context.createBiquadFilter();
  treble.type = 'highshelf';
  treble.frequency.value = 3000;
  const delay = context.createDelay(0.5);
  delay.delayTime.value = 0.18;
  const echoGain = context.createGain();
  echoGain.gain.value = 0;
  const mix = context.createGain();
  const outputGain = context.createGain();
  outputGain.gain.value = 0;
  // Input meter measures raw mic signal, not amplified output.
  source.connect(analyser);
  source.connect(bass);
  bass.connect(treble);
  // Dry path and a single delayed repeat (no recursive feedback loop).
  treble.connect(mix);
  treble.connect(delay);
  delay.connect(echoGain);
  echoGain.connect(mix);
  mix.connect(outputGain);
  outputGain.connect(context.destination);
  nodes = { source, analyser, bass, treble, delay, echoGain, mix, outputGain };
  await context.resume();
  if (stopRequested || document.hidden) return;
  updateControls();
  setRunning(true);
  updateMeter();
  stream.getAudioTracks()[0]?.addEventListener('ended', () => { void stop(); }, { once: true });
}

toggle.addEventListener('click', async () => {
  if (busy) return;
  busy = true;
  toggle.disabled = true;
  showError('');
  try {
    if (stream) await stop();
    else await start();
  } catch (err) {
    await stop();
    showError(`Không thể bật micro: ${err.message || String(err)}`);
  } finally {
    // A stop requested during startup is handled before returning control.
    if (stopRequested && stream) await stop();
    busy = false;
    toggle.disabled = false;
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) void stop(); });
window.addEventListener('pagehide', () => { void stop(); });
updateControls();
