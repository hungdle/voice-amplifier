# Voice Amplifier v0.8 — Smart Voice (experimental)

Static GitHub Pages app. No backend. No audio uploads. Based on v0.7; keeps music player, karaoke mixer, three microphone presets, bass/treble, echo/reverb, wind/fan filters, noise gate, feedback guard. Device selector remains hidden.

## New in v0.8
- Smart Voice toggle, limited voice boost (1–2× before existing output safety gain), focus bandpass, compressor. These process *all* mic audio, not isolated vocals.
- Browser-requested AEC, noise suppression and AGC; actual reported settings displayed where available. Restart microphone to change these. On some browsers these features may be ignored or distort singing.
- Three five-second RMS microphone diagnostics: music only, voice only, music+voice. Results are in dBFS and **cannot quantify vocal separation**. Keep speaker volume and position consistent.

## Deploy
Upload `index.html`, `style.css`, `app.js`, `README.md` to repository root; enable GitHub Pages from main/root. Open over HTTPS.

## Testing
1. Set system volume low, Echo and Reverb to zero. Start mic and grant permission.
2. Select MP3 and test music playback, pause, seek, mic preset, Smart Voice sliders.
3. Run each diagnostic with phone ~30 cm from mouth. Use consistent playback volume.
4. Compare Smart Voice on/off, AEC on/off (restart mic), with actual listening.
5. If squealing/feedback starts, stop mic immediately. Do not put speaker near ear.

## Important limitations
AEC depends on browser/OS and may not remove music played through the same phone. The mic input meter is pre-processing. Filters and compression are **not** AI source separation. Feedback Guard is heuristic, not hearing protection. Bluetooth/speaker routing cannot be guaranteed by Safari. Browser backgrounding stops microphone and pauses music. Real karaoke at 30 cm on built-in speaker may require native voice-processing APIs or external microphone/speaker separation.
