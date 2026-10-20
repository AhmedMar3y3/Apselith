import { create } from 'zustand';
import { clockTime, type ClockState } from '../../domain/clock';
type SimulationStore = ClockState & {
  now: number;
  realNow: number;
  tick: () => void;
  pause: () => void;
  setSpeed: (speed: number) => void;
  jump: (utc: number) => void;
  reset: () => void;
};
export const useClock = create<SimulationStore>((set, get) => ({
  anchorUtc: Date.now(),
  anchorMonotonic: performance.now(),
  speed: 1,
  playing: true,
  live: true,
  now: Date.now(),
  realNow: Date.now(),
  tick: () =>
    set({ now: clockTime(get(), performance.now()), realNow: Date.now() }),
  pause: () => {
    const state = get();
    const now = clockTime(state, performance.now());
    set({
      anchorUtc: now,
      anchorMonotonic: performance.now(),
      now,
      playing: !state.playing,
      live: false,
    });
  },
  setSpeed: (speed) => {
    const now = clockTime(get(), performance.now());
    set({
      anchorUtc: now,
      anchorMonotonic: performance.now(),
      now,
      speed,
      live: false,
    });
  },
  jump: (utc) => {
    if (!Number.isFinite(utc)) return;
    set({
      anchorUtc: utc,
      anchorMonotonic: performance.now(),
      now: utc,
      live: false,
    });
  },
  reset: () => {
    const now = Date.now();
    set({
      anchorUtc: now,
      anchorMonotonic: performance.now(),
      now,
      speed: 1,
      playing: true,
      live: true,
    });
  },
}));
