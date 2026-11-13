# Voice Amplifier v0.5 — Karaoke Mixer

Static mobile-friendly Web Audio application for iPhone/Android, hosted with GitHub Pages.

## New in v0.5
- Import local MP3/WAV/M4A audio; playback, pause, stop, seek and time display.
- Independent music volume, bass and treble.
- Separate microphone path with all v0.4 controls: mic gain, bass/treble, echo delay and feedback, reverb, wind high-pass, fan low-pass, 50 Hz hum notch, noise gate, and experimental feedback guard.
- Both sources play to the phone's default audio output. The microphone guard does not mute the music track.
- No uploads, server, dependencies, or build step.

## Deployment
Upload `index.html`, `style.css`, `app.js`, and `README.md` to the root of the `main` branch of your GitHub repository. Enable **Settings → Pages → Deploy from a branch → main → /(root)**. Open the HTTPS Pages URL.

## Usage
1. Lower phone speaker volume first. Start with mic gain at 10%, echo and reverb at zero.
2. Select an audio file and press Play. Adjust music volume independently.
3. Press Bật micro and grant microphone permission. Adjust microphone effects separately.
4. Press Stop to silence the microphone; stop or pause the music separately.

## Important limitations
- Acoustic leakage from the phone speaker back into its microphone cannot be reliably removed by separating the digital audio paths. Loud feedback may damage hearing or speakers. Prefer headphones or a separate microphone/speaker with physical distance.
- The v0.4 feedback guard is a heuristic, **not** a true feedback canceller. It only mutes the microphone path when a suspicious tone persists; it can miss feedback or trigger falsely.
- Browser mic output routing (particularly iOS Safari), latency, and simultaneous playback vary by device. HTTPS is required for mic access.
- Backgrounding the page stops the microphone and pauses music.
- Local music stays on the device; the app does not record or export a mixed karaoke file.
- Music is a separately loaded instrumental track; this app does not remove vocals from songs.
