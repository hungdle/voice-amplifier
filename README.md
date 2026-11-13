# Voice Amplifier v0.6 — Audio Output Detection

Static mobile-first karaoke mixer for GitHub Pages. No backend, no upload of microphone or music files.

## Features

All v0.5 functionality is retained: local MP3/WAV/M4A player with seek, music volume/Bass/Treble; microphone with volume, Bass/Treble, Echo, Reverb; high/low-pass noise filters, 50 Hz notch, noise gate, experimental feedback guard.

New v0.6 output panel:
- Enumerates browser-exposed `audiooutput` devices.
- Optionally invokes `navigator.mediaDevices.selectAudioOutput()` if available.
- Attempts `AudioContext.setSinkId()` on both active Web Audio contexts, if supported.
- Explains unsupported browsers and how to choose output in iOS Control Center.
- Never claims that the physical output has changed merely because the API resolved.

## Publish

Upload `index.html`, `style.css`, `app.js`, `README.md` to the root of `hungdle/voice-amplifier`, then GitHub Settings > Pages > Deploy from branch `main` / `(root)`.

## Testing

1. Open the HTTPS site on an iPhone and an Android phone.
2. Tap **Quét thiết bị**; compare visible outputs.
3. Load a local MP3 and play at low volume. Try selecting a device; verify by listening.
4. Turn on the microphone at low volume. Try output selection again and verify both paths independently.
5. On iPhone, compare routing from Control Center / AirPlay.
6. Test stop, pause, backgrounding, reconnecting Bluetooth, and feedback guard.

## Limitations and safety

Browser audio routing support varies by browser and OS. Safari may ignore a route change even after a successful API call. Bluetooth speakers may be unavailable for mic monitoring, or introduce high latency. No browser code can guarantee speakerphone selection. Microphone and speaker on one phone can create dangerous feedback. Start with low physical volume, Echo/Reverb at zero, and stop immediately if feedback occurs. Feedback guard is experimental, not hearing protection. Audio routing cannot be fully validated without real devices.
