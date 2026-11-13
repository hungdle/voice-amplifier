# Voice Amplifier v0.1

A minimal microphone-to-speaker prototype for iPhone and Android, built with plain HTML, CSS, and JavaScript (Web Audio API).

## Features
- Live microphone monitoring through the browser's selected audio output
- Adjustable **attenuation** (gain from 0 to 0.5), not physical loudspeaker amplification
- Live input level meter
- Start/stop and automatic stop when the page is hidden
- No recording, backend, or uploaded audio

## Run on GitHub Pages
1. Create a **public** GitHub repository named `voice-amplifier`.
2. Upload `index.html`, `style.css`, and `app.js` to the repository root.
3. Go to **Settings > Pages > Build and deployment**.
4. Select **Deploy from a branch**, branch `main`, folder `/(root)` and save.
5. Open `https://YOUR_USERNAME.github.io/voice-amplifier/` in Safari on iPhone or Chrome on Android.
6. Set the phone's physical speaker volume LOW, press **Bật micro**, and allow microphone access.

## Limitations and safety
- **Feedback warning:** Built-in microphone and speaker can form an acoustic feedback loop, causing loud squealing. Keep system volume low, do not hold near your ear, and stop immediately if feedback occurs.
- Browser audio output routing cannot be reliably forced to the loudspeaker, especially on iOS. It may route to the receiver or another device, and audio latency varies.
- Echo cancellation/noise suppression are *requested* from the browser, not guaranteed to eliminate feedback.
- The slider controls software gain **0–0.5**, so this prototype is not a reliable voice amplifier for a classroom. Native apps or external hardware are more suitable for higher volume and low latency.
- Microphone permission requires HTTPS (GitHub Pages provides it) or localhost.
- Microphone stops when the page is hidden; the app does not run in the background.

## Next steps
- Test output routing and latency on real iPhone and Android devices.
- If the browser cannot route to the speaker, build native iOS (`AVAudioSession` / `AVAudioEngine`) and Android (`AudioRecord` / `AudioTrack` or Oboe) prototypes.
- Add safe feedback detection, limiter, and robust audio routing controls.

## Project files
- `index.html` – UI
- `style.css` – styling
- `app.js` – Web Audio API logic
