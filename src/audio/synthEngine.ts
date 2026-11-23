// Generates genuine, pleasant stereo WAV audio buffers on demand for built-in tracks
// so playback, seeking, 10-band Web Audio EQ, and FFT visualizers work with real audio.

interface TrackComposition {
  bpm: number;
  rootMidi: number;
  chords: number[][];
  bassPattern: number[];
  arpPattern: number[];
  waveform: 'warm-pad' | 'electric-piano' | 'pluck-synth' | 'ambient-chord';
  hasBeat: boolean;
}

const COMPOSITIONS: TrackComposition[] = [
  // 0: Midnight Platform 4 (Electronic, D minor 9)
  {
    bpm: 112,
    rootMidi: 50,
    chords: [
      [0, 3, 7, 10, 14],
      [-4, 0, 3, 7, 10],
      [-2, 2, 5, 9, 12],
      [-5, -2, 2, 5, 9],
    ],
    bassPattern: [0, 0, -4, -4, -2, -2, -5, -5],
    arpPattern: [0, 3, 7, 10, 14, 10, 7, 3],
    waveform: 'pluck-synth',
    hasBeat: true,
  },
  // 1: Concrete Echoes (Electronic, C minor)
  {
    bpm: 118,
    rootMidi: 48,
    chords: [
      [0, 3, 7, 12],
      [-4, 0, 3, 7],
      [-2, 2, 5, 10],
      [-5, -1, 2, 7],
    ],
    bassPattern: [0, 0, 0, -4, -2, -2, -5, -5],
    arpPattern: [0, 7, 12, 15, 12, 7, 3, 0],
    waveform: 'pluck-synth',
    hasBeat: true,
  },
  // 2: Sunlit Monolith (Ambient, F major 9)
  {
    bpm: 78,
    rootMidi: 53,
    chords: [
      [0, 4, 7, 11, 14],
      [-3, 0, 4, 7, 11],
      [-5, -1, 2, 7, 11],
      [-7, -3, 0, 4, 7],
    ],
    bassPattern: [0, 0, -3, -3, -5, -5, -7, -7],
    arpPattern: [0, 4, 7, 11, 14, 11, 7, 4],
    waveform: 'ambient-chord',
    hasBeat: false,
  },
  // 3: Dune Telemetry (Ambient, G minor 7)
  {
    bpm: 84,
    rootMidi: 55,
    chords: [
      [0, 3, 7, 10],
      [-2, 2, 5, 10],
      [-4, 0, 3, 7],
      [-5, -2, 2, 5],
    ],
    bassPattern: [0, -2, -4, -5, 0, -2, -4, -5],
    arpPattern: [7, 10, 14, 10, 7, 3, 0, 3],
    waveform: 'warm-pad',
    hasBeat: false,
  },
  // 4: Rain on Glass (Downtempo, Eb major 7)
  {
    bpm: 92,
    rootMidi: 51,
    chords: [
      [0, 4, 7, 11],
      [-3, 0, 4, 7],
      [-5, -1, 2, 7],
      [-7, -3, 0, 4],
    ],
    bassPattern: [0, 0, -3, -3, -5, -5, -7, -5],
    arpPattern: [0, 7, 11, 14, 11, 7, 4, 7],
    waveform: 'electric-piano',
    hasBeat: true,
  },
  // 5: Harbor Signal (Downtempo, A minor 9)
  {
    bpm: 96,
    rootMidi: 57,
    chords: [
      [0, 3, 7, 10, 14],
      [-4, 0, 3, 7, 10],
      [-7, -4, 0, 3, 7],
      [-5, -2, 2, 5, 9],
    ],
    bassPattern: [0, 0, -4, -4, -7, -7, -5, -5],
    arpPattern: [0, 3, 7, 14, 10, 7, 3, 0],
    waveform: 'electric-piano',
    hasBeat: true,
  },
  // 6: Walnut & Brass (Acoustic, D major 7)
  {
    bpm: 88,
    rootMidi: 50,
    chords: [
      [0, 4, 7, 11],
      [2, 5, 9, 12],
      [-3, 0, 4, 7],
      [-5, -1, 2, 7],
    ],
    bassPattern: [0, 0, 2, 2, -3, -3, -5, -5],
    arpPattern: [0, 4, 7, 11, 7, 4, 11, 7],
    waveform: 'electric-piano',
    hasBeat: false,
  },
  // 7: Late Afternoon Window (Acoustic, C major 9)
  {
    bpm: 82,
    rootMidi: 48,
    chords: [
      [0, 4, 7, 11, 14],
      [-3, 0, 4, 7, 11],
      [5, 9, 12, 16],
      [-5, -1, 2, 7, 11],
    ],
    bassPattern: [0, 0, -3, -3, 5, 5, -5, -5],
    arpPattern: [0, 7, 11, 14, 16, 14, 11, 7],
    waveform: 'warm-pad',
    hasBeat: false,
  },
];

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const urlCache = new Map<string, string>();

export function getOrGenerateSynthTrackUrl(
  presetIndex: number,
  durationSec: number
): string {
  const key = `${presetIndex}-${durationSec}`;
  const existing = urlCache.get(key);
  if (existing) return existing;

  const comp = COMPOSITIONS[presetIndex % COMPOSITIONS.length];
  const sampleRate = 22050;
  const numChannels = 2;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  const beatDur = 60 / comp.bpm;
  const barDur = beatDur * 4;
  const eighthDur = beatDur / 2;

  // Deterministic pseudo-noise for soft percussion
  let noiseSeed = (presetIndex + 1) * 1337;
  const nextNoise = () => {
    noiseSeed = (noiseSeed * 16807) % 2147483647;
    return (noiseSeed / 2147483647) * 2 - 1;
  };

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const barIndex = Math.floor(t / barDur) % comp.chords.length;
    const barLocalT = t % barDur;
    const beatLocalT = t % beatDur;
    const eighthIndex = Math.floor(t / eighthDur);
    const eighthLocalT = t % eighthDur;

    // Fade in/out envelope for smooth looping
    let masterEnv = 1;
    if (t < 0.8) masterEnv = t / 0.8;
    else if (t > durationSec - 1.2) masterEnv = Math.max(0, (durationSec - t) / 1.2);

    const chord = comp.chords[barIndex];
    const chordEnv =
      Math.min(1, barLocalT / 0.25) *
      (comp.waveform === 'ambient-chord'
        ? 0.85 + 0.15 * Math.sin(t * 0.8)
        : Math.exp(-barLocalT * 0.32));

    let padL = 0;
    let padR = 0;
    for (let n = 0; n < chord.length; n++) {
      const freq = midiToHz(comp.rootMidi + chord[n]);
      const phase = 2 * Math.PI * freq * t;
      let sample = 0;
      if (comp.waveform === 'electric-piano') {
        sample =
          Math.sin(phase) * 0.65 +
          Math.sin(phase * 2) * 0.25 * Math.exp(-barLocalT * 1.4) +
          Math.sin(phase * 3) * 0.1 * Math.exp(-barLocalT * 2.5);
      } else if (comp.waveform === 'pluck-synth') {
        sample =
          Math.sin(phase) * 0.55 +
          Math.sin(phase * 2 + 0.2) * 0.25 +
          Math.sin(phase * 0.5) * 0.2;
      } else {
        // warm-pad / ambient-chord with slight stereo detune
        sample =
          Math.sin(phase) * 0.6 +
          Math.sin(phase * 1.003) * 0.25 +
          Math.sin(phase * 2) * 0.12;
      }
      const pan = n % 2 === 0 ? 0.65 : 0.35;
      padL += sample * pan;
      padR += sample * (1 - pan);
    }
    const padNorm = 0.11 * chordEnv;
    padL *= padNorm;
    padR *= padNorm;

    // Warm sub-bass
    const bassSlot = Math.floor(t / (barDur / 2)) % comp.bassPattern.length;
    const bassFreq = midiToHz(comp.rootMidi - 12 + comp.bassPattern[bassSlot]);
    const bassEnv = Math.min(1, (t % (barDur / 2)) / 0.04) * Math.exp(-(t % (barDur / 2)) * 0.7);
    const bassSample =
      (Math.sin(2 * Math.PI * bassFreq * t) * 0.8 +
        Math.sin(4 * Math.PI * bassFreq * t) * 0.2) *
      0.16 *
      bassEnv;

    // Melodic arpeggio / chime
    const arpNote = comp.arpPattern[eighthIndex % comp.arpPattern.length];
    const arpFreq = midiToHz(comp.rootMidi + 12 + arpNote);
    const arpEnv = Math.min(1, eighthLocalT / 0.012) * Math.exp(-eighthLocalT * 5.2);
    const arpTone =
      (Math.sin(2 * Math.PI * arpFreq * t) * 0.72 +
        Math.sin(4 * Math.PI * arpFreq * t) * 0.28) *
      0.11 *
      arpEnv;
    const arpPan = 0.5 + 0.35 * Math.sin(eighthIndex * 0.9);

    // Optional soft rhythmic pulse (kick + crisp hi-hat)
    let perc = 0;
    if (comp.hasBeat) {
      // Soft kick on beats 0 and 2
      const beatInBar = Math.floor(barLocalT / beatDur);
      if (beatInBar === 0 || beatInBar === 2) {
        const kickEnv = Math.exp(-beatLocalT * 18);
        const kickFreq = 52 + 88 * Math.exp(-beatLocalT * 32);
        perc += Math.sin(2 * Math.PI * kickFreq * beatLocalT) * 0.2 * kickEnv;
      }
      // Subtle shaker/hat on off-eighths
      if (eighthIndex % 2 === 1) {
        const hatEnv = Math.exp(-eighthLocalT * 42);
        perc += nextNoise() * 0.045 * hatEnv;
      }
    }

    const outL = (padL + bassSample + arpTone * arpPan + perc) * masterEnv;
    const outR = (padR + bassSample + arpTone * (1 - arpPan) + perc) * masterEnv;

    left[i] = Math.max(-0.95, Math.min(0.95, outL));
    right[i] = Math.max(-0.95, Math.min(0.95, outR));
  }

  const wavBuffer = encodeStereoWav(left, right, sampleRate, numChannels);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  const objectUrl = URL.createObjectURL(blob);
  urlCache.set(key, objectUrl);
  return objectUrl;
}

function encodeStereoWav(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  numChannels: number
): ArrayBuffer {
  const numSamples = left.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    offset += 2;
    view.setInt16(offset, r < 0 ? r * 0x8000 : r * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function writeAscii(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
