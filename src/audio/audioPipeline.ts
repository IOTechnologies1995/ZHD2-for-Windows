import { EQ_FREQUENCIES } from '../data/library';

// Real Web Audio API 10-band Equalizer + Preamp + Stereo Panner + FFT Analyser
export class ZhdAudioPipeline {
  private ctx: AudioContext | null = null;
  private sources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private preampNode: GainNode | null = null;
  private filterNodes: BiquadFilterNode[] = [];
  private pannerNode: StereoPannerNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  private eqEnabled = true;
  private bandGains: number[] = new Array(10).fill(0);
  private preampDb = 0;
  private balance = 0;

  public ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.preampNode = this.ctx.createGain();
      this.filterNodes = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = this.ctx!.createBiquadFilter();
        if (idx === 0) filter.type = 'lowshelf';
        else if (idx === EQ_FREQUENCIES.length - 1) filter.type = 'highshelf';
        else filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.4;
        filter.gain.value = this.eqEnabled ? this.bandGains[idx] ?? 0 : 0;
        return filter;
      });

      this.pannerNode = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.78;

      // Connect chain: preamp -> filters[0..9] -> (panner) -> analyser -> destination
      let prev: AudioNode = this.preampNode;
      for (const filter of this.filterNodes) {
        prev.connect(filter);
        prev = filter;
      }
      if (this.pannerNode) {
        prev.connect(this.pannerNode);
        prev = this.pannerNode;
      }
      prev.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);

      this.applySettings();
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public attachElement(element: HTMLMediaElement) {
    const ctx = this.ensureContext();
    if (!ctx || !this.preampNode) return;
    if (this.sources.has(element)) return;

    try {
      const source = ctx.createMediaElementSource(element);
      source.connect(this.preampNode);
      this.sources.set(element, source);
    } catch {
      // Already connected in a previous mount cycle
    }
  }

  public updateEq(enabled: boolean, gains: number[], preampDb: number, balance: number) {
    this.eqEnabled = enabled;
    this.bandGains = [...gains];
    this.preampDb = preampDb;
    this.balance = balance;
    this.applySettings();
  }

  private applySettings() {
    if (!this.ctx || !this.preampNode) return;
    const now = this.ctx.currentTime;
    const linearPreamp = this.eqEnabled ? Math.pow(10, this.preampDb / 20) : 1;
    this.preampNode.gain.setTargetAtTime(linearPreamp, now, 0.015);

    this.filterNodes.forEach((filter, idx) => {
      const targetGain = this.eqEnabled ? this.bandGains[idx] ?? 0 : 0;
      filter.gain.setTargetAtTime(targetGain, now, 0.015);
    });

    if (this.pannerNode) {
      this.pannerNode.pan.setTargetAtTime(this.balance, now, 0.015);
    }
  }

  public getFrequencyData(target: Uint8Array<ArrayBuffer>): boolean {
    if (!this.analyserNode) return false;
    this.analyserNode.getByteFrequencyData(target);
    return true;
  }

  public getFrequencyBinCount(): number {
    return this.analyserNode ? this.analyserNode.frequencyBinCount : 128;
  }
}

export const audioPipeline = new ZhdAudioPipeline();
