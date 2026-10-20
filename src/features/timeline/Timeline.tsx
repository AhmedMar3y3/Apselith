import { useEffect, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, Radio } from 'lucide-react';
import { useClock } from './clock-store';
export function Timeline() {
  const clock = useClock();
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) useClock.getState().tick();
    }, 250);
    const onVisible = () => {
      if (!document.hidden) useClock.getState().tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return (
    <section className="timeline" aria-label="Simulation timeline">
      <div className="clock-readout">
        <span className="eyebrow">SIMULATION CLOCK · UTC</span>
        <strong>
          {new Date(clock.now).toISOString().replace('T', ' ').slice(0, 19)}
        </strong>
        <span className={clock.live ? 'live-tag' : 'sim-tag'}>
          {clock.live ? '● REAL TIME' : 'SIMULATED TIME'}
        </span>
      </div>
      <div className="playback">
        <button
          aria-label="Step backward one minute"
          onClick={() => clock.jump(clock.now - 60000)}
        >
          <SkipBack size={17} />
        </button>
        <button
          className="primary square"
          aria-label={clock.playing ? 'Pause' : 'Resume'}
          onClick={clock.pause}
        >
          {clock.playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          aria-label="Step forward one minute"
          onClick={() => clock.jump(clock.now + 60000)}
        >
          <SkipForward size={17} />
        </button>
        <label className="sr-only" htmlFor="speed">
          Playback speed
        </label>
        <select
          id="speed"
          value={clock.speed}
          onChange={(event) => clock.setSpeed(Number(event.target.value))}
        >
          {[0.25, 1, 10, 60, 600].map((speed) => (
            <option key={speed} value={speed}>
              {speed}×
            </option>
          ))}
        </select>
        <button onClick={clock.reset}>
          <Radio size={15} /> Real time
        </button>
      </div>
      <form
        className="time-jump"
        onSubmit={(event) => {
          event.preventDefault();
          const time = Date.parse(`${date}Z`);
          if (!Number.isFinite(time)) {
            setError('Enter a valid UTC date and time.');
            return;
          }
          setError('');
          clock.jump(time);
        }}
      >
        <label htmlFor="jump">Jump to UTC</label>
        <input
          id="jump"
          type="datetime-local"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
        <button type="submit">Go</button>
        {error && <span role="alert">{error}</span>}
      </form>
    </section>
  );
}
