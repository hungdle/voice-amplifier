'use strict';
const $ = (id) => document.getElementById(id);
const toggle = $('toggle');
const meter = $('meter');
const errorBox = $('error');
const controls = {
  gain: { slider: $('gain'), label: $('gainLabel') },
  bass: { slider: $('bass'), label: $('bassLabel') },
  treble: { slider: $('treble'), label: $('trebleLabel') },
  echo: { slider: $('echo'), label: $('echoLabel') },
  echoTime: { slider: $('echoTime'), label: $('echoTimeLabel') },
  echoFeedback: { slider: $('echoFeedback'), label: $('echoFeedbackLabel') },
  reverb: { slider: $('reverb'), label: $('reverbLabel') },
  reverbTime: { slider: $('reverbTime'), label: $('reverbTimeLabel') }
};
let stream = null;
let context = null;
let nodes = null;
let animationId = null;
let busy = false;
let stopRequested = false;
let reverbImpulse = null;

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
  const echoTime = Number(controls.echoTime.slider.value) / 1000;
  const echoFeedback = Number(controls.echoFeedback.slider.value) / 100;
  const reverb = Number(controls.reverb.slider.value) / 100;
  const reverbTime = Number(controls.reverbTime.slider.value) / 10;
  controls.gain.label.textContent = `${Math.round(gain * 100)}%`;
  controls.bass.label.textContent = `${bass > 0 ? '+' : ''}${bass} dB`;
  controls.treble.label.textContent = `${treble > 0 ? '+' : ''}${treble} dB`;
  controls.echo.label.textContent = `${Math.round(echo * 100)}%`;
  controls.echoTime.label.textContent = `${Math.round(echoTime * 1000)} ms`;
  controls.echoFeedback.label.textContent = `${Math.round(echoFeedback * 100)}%`;
  controls.reverb.label.textContent = `${Math.round(reverb * 100)}%`;
  controls.reverbTime.label.textContent = `${reverbTime.toFixed(1)} s`;
  if (!context || !nodes || context.state === 'closed') return;
  const t = context.currentTime;
  nodes.outputGain.gain.setTargetAtTime(gain * 0.5, t, 0.02);
  nodes.bass.gain.setTargetAtTime(bass, t, 0.02);
  nodes.treble.gain.setTargetAtTime(treble, t, 0.02);
  nodes.echoGain.gain.setTargetAtTime(echo, t, 0.02);
  nodes.delay.delayTime.setTargetAtTime(echoTime, t, 0.02);
  nodes.feedbackGain.gain.setTargetAtTime(echoFeedback, t, 0.02);
  nodes.reverbGain.gain.setTargetAtTime(reverb, t, 0.02);
  if (reverbImpulse !== reverbTime) {
    nodes.convolver.buffer = makeImpulse(context, reverbTime);
    reverbImpulse = reverbTime;
  }
}
function makeImpulse(ctx, seconds) {
  // Artificial room reverb; no remote impulse file required.
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const progress = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - progress, 3) * 0.55;
    }
  }
  return buffer;
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
  reverbImpulse = null;
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
  const delay = context.createDelay(1.0);
  delay.delayTime.value = 0.22;
  const feedbackGain = context.createGain();
  feedbackGain.gain.value = 0;
  const convolver = context.createConvolver();
  convolver.buffer = makeImpulse(context, 1.2);
  reverbImpulse = 1.2;
  const reverbGain = context.createGain();
  reverbGain.gain.value = 0;
  const echoGain = context.createGain();
  echoGain.gain.value = 0;
  const mix = context.createGain();
  const outputGain = context.createGain();
  outputGain.gain.value = 0;
  // Input meter measures raw mic signal, not amplified output.
  source.connect(analyser);
  source.connect(bass);
  bass.connect(treble);
  // Dry + limited feedback echo + artificial room reverb.
  treble.connect(mix);
  treble.connect(delay);
  delay.connect(echoGain);
  echoGain.connect(mix);
  delay.connect(feedbackGain);
  feedbackGain.connect(delay);
  treble.connect(convolver);
  convolver.connect(reverbGain);
  reverbGain.connect(mix);
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -18;
  limiter.knee.value = 8;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.2;
  mix.connect(limiter);
  limiter.connect(outputGain);
  outputGain.connect(context.destination);
  nodes = { source, analyser, bass, treble, delay, feedbackGain, echoGain, convolver, reverbGain, mix, limiter, outputGain };
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
