# Voice Amplifier v0.4

A mobile-browser microphone-to-speaker prototype using the Web Audio API. No recording or uploads.

## Features
- Volume, bass, treble, echo, echo feedback, reverb
- Wind rumble reduction: adjustable high-pass (60–350 Hz)
- Fan/hiss reduction: adjustable low-pass (2.5–10 kHz)
- Optional 50 Hz hum notch (does not remove all motor harmonics)
- Optional RMS noise gate with threshold and hysteresis
- Experimental feedback warning: detects sustained strong narrowband tones and **mutes output** until manually reset

## Important limitations
- **Not true acoustic feedback cancellation**. It may miss feedback or falsely trigger on music/whistling.
- Filters cannot isolate a voice from overlapping fan noise; low-pass reduces voice brightness.
- Echo and reverb increase feedback risk. Start with both off and phone volume low.
- iOS Safari may route output unexpectedly; no guarantee of loudspeaker routing.
- Browser microphone permission requires HTTPS (GitHub Pages) or localhost.
- Browser may suspend audio in the background.

## Deployment
Upload `index.html`, `style.css`, `app.js`, `README.md` to the repository root, then enable GitHub Pages from `main` / `(root)`.

## Testing
Start with system volume very low, no headphones, device away from ears. Test wind filter with a fan, then the gate. Do not deliberately create loud feedback. If ringing begins, press Stop immediately.
