export type ClockState = {
  anchorUtc: number;
  anchorMonotonic: number;
  speed: number;
  playing: boolean;
  live: boolean;
};
export function clockTime(clock: ClockState, monotonic: number) {
  return (
    clock.anchorUtc +
    (clock.playing ? (monotonic - clock.anchorMonotonic) * clock.speed : 0)
  );
}
