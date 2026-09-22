const SOUND_PREF_KEY = 'onlineBookingSound';

// Default ON: the whole point of the alert is that front desk notices a booking without staring at
// the screen. The board shows a visible mute toggle, and the choice is remembered per browser.
export const readOnlineBookingSoundPreference = (): boolean => {
  try {
    return window.localStorage.getItem(SOUND_PREF_KEY) !== 'off';
  } catch {
    return true;
  }
};

export const writeOnlineBookingSoundPreference = (on: boolean): void => {
  try {
    window.localStorage.setItem(SOUND_PREF_KEY, on ? 'on' : 'off');
  } catch {
    /* best-effort persistence only */
  }
};

let audioContext: AudioContext | null = null;

// A short two-note chime synthesised with Web Audio -- no audio asset to ship or cache. Quiet on
// purpose (this is a busy front desk, not a fire alarm). Browsers only let audio start after the
// user has interacted with the page, which is always true by the time someone is on the board.
export const playOnlineBookingChime = (): void => {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioContext = audioContext ?? new Ctx();
    const ctx = audioContext;
    if (ctx.state === 'suspended') void ctx.resume();

    const start = ctx.currentTime;
    [{ freq: 880, at: 0 }, { freq: 1318.5, at: 0.14 }].forEach(({ freq, at }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start + at);
      gain.gain.exponentialRampToValueAtTime(0.12, start + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start + at);
      osc.stop(start + at + 0.4);
    });
  } catch {
    /* audio is a nicety -- it must never be able to break the board */
  }
};
