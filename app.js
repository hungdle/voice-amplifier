'use strict';
const toggle = document.getElementById('toggle');
const gainSlider = document.getElementById('gain');
const gainLabel = document.getElementById('gainLabel');
const statusText = document.getElementById('status');
const dot = document.getElementById('dot');
const meter = document.getElementById('meter');
const errorBox = document.getElementById('error');

let stream = null;
let context = null;
let source = null;
let gainNode = null;
let analyser = null;
let animationId = null;
let busy = false;
let starting = false;
let stopRequested = false;

function showError(message) { errorBox.textContent = message; errorBox.hidden = !message; }
function setRunning(running) {
  statusText.textContent = running ? 'Micro đang hoạt động' : 'Chưa bật micro';
  dot.classList.toggle('active', running);
  toggle.textContent = running ? 'Tắt micro' : 'Bật micro';
}
function updateGain() {
  const level = Number(gainSlider.value) / 100;
  gainLabel.textContent = `${gainSlider.value}%`;
  if (gainNode && context) gainNode.gain.setTargetAtTime(level * 0.5, context.currentTime, 0.02);
}
gainSlider.addEventListener('input', updateGain);

function updateMeter() {
  if (!analyser) return;
  const samples = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(samples);
  let sum = 0;
  for (const sample of samples) { const x = (sample - 128) / 128; sum += x * x; }
  const rms = Math.sqrt(sum / samples.length);
  meter.value = Math.min(100, Math.round(rms * 250));
  animationId = requestAnimationFrame(updateMeter);
}

async function stop() {
  stopRequested = true;
  if (animationId !== null) cancelAnimationFrame(animationId);
  animationId = null;
  if (gainNode && context && context.state !== 'closed') gainNode.gain.setValueAtTime(0, context.currentTime);
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  if (source) source.disconnect();
  if (analyser) analyser.disconnect();
  if (gainNode) gainNode.disconnect();
  source = null; analyser = null; gainNode = null;
  const oldContext = context;
  context = null;
  if (oldContext && oldContext.state !== 'closed') {
    try { await oldContext.close(); } catch (err) { console.warn('Audio context close:', err); }
  }
  meter.value = 0;
  setRunning(false);
}

async function start() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Trình duyệt không hỗ trợ micro. Hãy mở trang qua HTTPS bằng Safari hoặc Chrome.');
  stopRequested = false;
  starting = true;
  try {
    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      video: false
    });
    if (stopRequested || document.hidden) {
      localStream.getTracks().forEach(track => track.stop());
      return;
    }
    stream = localStream;
    context = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    source = context.createMediaStreamSource(stream);
    gainNode = context.createGain();
    gainNode.gain.value = 0;
    analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    source.connect(gainNode);
    gainNode.connect(context.destination);
    await context.resume();
    if (stopRequested || document.hidden) return;
    updateGain();
    setRunning(true);
    updateMeter();
    stream.getAudioTracks()[0]?.addEventListener('ended', () => { void stop(); }, { once: true });
  } finally { starting = false; }
}

toggle.addEventListener('click', async () => {
  if (busy || starting) return;
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
    busy = false;
    toggle.disabled = false;
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) void stop();
});
window.addEventListener('pagehide', () => { void stop(); });
updateGain();
