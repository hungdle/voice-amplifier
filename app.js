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
  reverbTime: { slider: $('reverbTime'), label: $('reverbTimeLabel') },
  windCut: { slider: $('windCut'), label: $('windCutLabel') },
  fanCut: { slider: $('fanCut'), label: $('fanCutLabel') },
  gateThreshold: { slider: $('gateThreshold'), label: $('gateThresholdLabel') }
};
let stream = null;
let context = null;
let nodes = null;
let animationId = null;
let busy = false;
let stopRequested = false;
let reverbImpulse = null;
let gateLevel = 1;
let guardTripped = false;
let suspiciousFrames = 0;
let lastMeterTime = 0;
const guardStatus = $('guardStatus');
function resetGuard() {
  guardTripped = false;
  suspiciousFrames = 0;
  $('resetGuard').hidden = true;
  guardStatus.classList.remove('alert');
  guardStatus.textContent = 'Giám sát tiếng rít: đang sẵn sàng (không thay thế chống hú chuyên dụng).';
  updateControls();
}
$('resetGuard').addEventListener('click', resetGuard);
for (const id of ['noiseFilter','humFilter','gateEnabled','feedbackGuard']) {
  $(id).addEventListener('change', updateControls);
}


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
  controls.windCut.label.textContent = `${controls.windCut.slider.value} Hz`;
  controls.fanCut.label.textContent = `${controls.fanCut.slider.value} Hz`;
  controls.gateThreshold.label.textContent = `${controls.gateThreshold.slider.value} dBFS`;
  if (!context || !nodes || context.state === 'closed') return;
  const t = context.currentTime;
  nodes.outputGain.gain.setTargetAtTime(guardTripped ? 0 : gain * 0.5, t, 0.02);
  nodes.highpass.frequency.setTargetAtTime($('noiseFilter').checked ? Number(controls.windCut.slider.value) : 20, t, 0.03);
  nodes.lowpass.frequency.setTargetAtTime($('noiseFilter').checked ? Number(controls.fanCut.slider.value) : Math.min(20000, context.sampleRate * 0.45), t, 0.03);
  nodes.humNotch.Q.value = 18;
  nodes.humNotch.frequency.value = $('humFilter').checked ? 50 : 10;
  nodes.humNotch.gain.value = 0;
  if (!$('gateEnabled').checked) nodes.gate.gain.setTargetAtTime(1, t, 0.03);
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

function updateMeter(timestamp = 0) {
  if (!nodes || !context) return;
  const samples = new Float32Array(nodes.analyser.fftSize);
  nodes.analyser.getFloatTimeDomainData(samples);
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  const rms = Math.sqrt(sum / samples.length);
  meter.value = Math.min(100, Math.round(rms * 250));
  const db = 20 * Math.log10(Math.max(rms, 0.000001));
  if ($('gateEnabled').checked) {
    const threshold = Number(controls.gateThreshold.slider.value);
    // Hysteresis reduces chattering, but quiet speech can still be lost.
    const shouldOpen = db > threshold + (gateLevel < 0.5 ? 4 : -4);
    gateLevel = shouldOpen ? 1 : 0.06;
    nodes.gate.gain.setTargetAtTime(gateLevel, context.currentTime, shouldOpen ? 0.012 : 0.12);
  } else gateLevel = 1;
  // Heuristic: sustained strong narrowband energy in the microphone signal.
  // This is NOT acoustic feedback cancellation and may false-trigger on whistles/music.
  if (timestamp - lastMeterTime >= 100) {
    lastMeterTime = timestamp;
    if ($('feedbackGuard').checked && !guardTripped && rms > 0.045) {
      const bins = new Float32Array(nodes.spectrum.frequencyBinCount);
      nodes.spectrum.getFloatFrequencyData(bins);
      const hzPerBin = context.sampleRate / nodes.spectrum.fftSize;
      let maxPower = 0, totalPower = 0;
      const lo = Math.max(1, Math.ceil(700 / hzPerBin));
      const hi = Math.min(bins.length - 1, Math.floor(5000 / hzPerBin));
      for (let i = lo; i <= hi; i++) {
        const power = Math.pow(10, bins[i] / 10);
        totalPower += power;
        maxPower = Math.max(maxPower, power);
      }
      const tonal = totalPower > 0 && maxPower / totalPower > 0.38;
      suspiciousFrames = tonal ? suspiciousFrames + 1 : Math.max(0, suspiciousFrames - 2);
      if (suspiciousFrames >= 7) {
        guardTripped = true;
        nodes.outputGain.gain.setTargetAtTime(0, context.currentTime, 0.008);
        guardStatus.textContent = 'Phát hiện tín hiệu rít kéo dài: đã tắt âm đầu ra. Giảm âm lượng trước khi khôi phục.';
        guardStatus.classList.add('alert');
        $('resetGuard').hidden = false;
      }
    } else suspiciousFrames = 0;
  }
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
  resetGuard();
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
  resetGuard();
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
  const highpass = context.createBiquadFilter();
  highpass.type = 'highpass'; highpass.frequency.value = 120;
  const humNotch = context.createBiquadFilter();
  humNotch.type = 'notch'; humNotch.frequency.value = 50; humNotch.Q.value = 18;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass'; lowpass.frequency.value = 6500;
  const gate = context.createGain(); gate.gain.value = 1;
  const spectrum = context.createAnalyser();
  spectrum.fftSize = 2048;
  spectrum.smoothingTimeConstant = 0.7;
  source.connect(analyser);
  source.connect(spectrum);
  source.connect(highpass);
  highpass.connect(humNotch);
  humNotch.connect(lowpass);
  lowpass.connect(gate);
  gate.connect(bass);
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
  nodes = { source, analyser, spectrum, highpass, humNotch, lowpass, gate, bass, treble, delay, feedbackGain, echoGain, convolver, reverbGain, mix, limiter, outputGain };
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
