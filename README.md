# Voice Amplifier v0.3

A small, static HTML/CSS/JavaScript experiment that routes phone microphone audio to the browser's audio output, with adjustable **Bass**, **Treble**, **Echo**, and output level.

## Run on GitHub Pages

1. Upload `index.html`, `app.js`, `style.css` to the root of a public GitHub repository.
2. Open **Settings → Pages**, choose **Deploy from a branch**, branch `main`, folder `/(root)`, then save.
3. Open `https://YOUR_USERNAME.github.io/voice-amplifier/` on your phone using HTTPS.
4. Start with your phone's **hardware volume very low**, allow microphone access, then tap **Bật micro**.

## Audio processing

`Microphone → bass lowshelf (250 Hz) → treble highshelf (3 kHz) → dry + single echo (180 ms) → limited output gain → speaker`

- Bass/Treble: -12 to +12 dB shelving filters.
- Echo: 0–40% single delayed repeat; off by default.
- Output level: 0–100% UI maps to 0–0.5 gain, not above unity.
- Built-in echo cancellation is requested from the browser, but may not prevent acoustic feedback.
- Microphone level meter reads the input, not the speaker output.

## Safety and limitations

**Feedback warning:** A phone's microphone and speaker are very close. Start with low hardware volume, keep the speaker away from your ear, and stop immediately if squealing occurs. Bass/Treble/Echo are effects, not anti-feedback processing. The output gain limit does not guarantee safe loudness.

On iOS, browser audio routing may select the earpiece rather than the loudspeaker; this app cannot reliably force speakerphone routing. Mobile browsers may pause audio when backgrounded. The app does not record or upload audio.

## Files

- `index.html` – UI
- `style.css` – responsive styling
- `app.js` – Web Audio signal graph and controls

## v0.3: Echo & Reverb

- Echo wet: 0–70%, echo delay: 80–800 ms, feedback: 0–55% (repeating echoes).
- Reverb wet: 0–50%, artificial room decay: 0.4–3.0 s, generated locally with a Web Audio ConvolverNode.
- Dynamics compressor reduces peaks, but **does not prevent acoustic feedback**.
- Both effects start at zero. Use low device volume; built-in mic and speaker can howl loudly.
- Web browser speaker routing and latency vary by iOS/Android device.
