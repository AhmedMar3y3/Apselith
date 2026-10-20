import { useEffect, useRef, useState } from 'react';
import type { OrbitalElements } from '../../domain/satellite/catalog';
import { ComputationClient } from '../../infrastructure/workers/client';
import type { SatellitePosition } from '../../infrastructure/propagation/sgp4';
import {
  interpolateTrack,
  type SatelliteTrack,
} from '../../infrastructure/propagation/interpolation';
import { useClock } from '../timeline/clock-store';
type PositionSnapshot = {
  elements?: OrbitalElements[];
  tracks: SatelliteTrack[];
  error: string;
};
type TrajectorySnapshot = {
  key: string;
  positions: SatellitePosition[];
  error: string;
};
export function useTracking(
  elements: OrbitalElements[],
  time: number,
  selected: OrbitalElements | undefined,
  showOrbit: boolean,
  minutes: number,
) {
  const client = useRef<ComputationClient | null>(null);
  const [snapshot, setSnapshot] = useState<PositionSnapshot>({
    tracks: [],
    error: '',
  });
  const [path, setPath] = useState<TrajectorySnapshot>({
    key: '',
    positions: [],
    error: '',
  });
  useEffect(() => {
    const worker = new ComputationClient();
    client.current = worker;
    return () => {
      client.current = null;
      worker.dispose();
    };
  }, []);
  const speed = useClock((state) => state.speed);
  const bucketSize = Math.max(1000, speed * 1000);
  const bucket = Math.floor(time / bucketSize);
  const requestTime = bucket * bucketSize;
  const span = Math.max(20000, speed * 4000);
  useEffect(() => {
    if (!client.current || !elements.length || document.hidden) return;
    let current = true;
    client.current
      .run({ kind: 'positions', elements, time: requestTime, span })
      .then((result) => {
        if (!current || result.kind !== 'positions') return;
        setSnapshot({
          elements,
          tracks: result.tracks,
          error: result.failures.length
            ? `${result.failures.length} object(s) unavailable. ${result.failures[0]}`
            : '',
        });
      })
      .catch((failure: unknown) => {
        if (current)
          setSnapshot({
            elements,
            tracks: [],
            error:
              failure instanceof Error ? failure.message : 'Tracking failed.',
          });
      });
    return () => {
      current = false;
    };
  }, [elements, requestTime, span]);
  const minute = Math.floor(time / 60000);
  const pathKey = `${selected?.NORAD_CAT_ID}:${selected?.EPOCH}:${minute}:${minutes}`;
  useEffect(() => {
    if (!client.current || !selected || !showOrbit) return;
    let current = true;
    client.current
      .run({
        kind: 'trajectory',
        elements: selected,
        time: minute * 60000,
        minutes,
      })
      .then((result) => {
        if (current && result.kind === 'trajectory')
          setPath({ key: pathKey, positions: result.positions, error: '' });
      })
      .catch((failure: unknown) => {
        if (current)
          setPath({
            key: pathKey,
            positions: [],
            error:
              failure instanceof Error ? failure.message : 'Trajectory failed.',
          });
      });
    return () => {
      current = false;
    };
  }, [selected, showOrbit, minute, minutes, pathKey]);
  const tracks = snapshot.elements === elements ? snapshot.tracks : [];
  const positions = tracks.flatMap((track) => {
    const point = interpolateTrack(track, time);
    return point ? [point] : [];
  });
  const trajectory = showOrbit && path.key === pathKey ? path.positions : [];
  return {
    positions,
    tracks,
    trajectory,
    error: [snapshot.error, showOrbit && path.key === pathKey ? path.error : '']
      .filter(Boolean)
      .join(' '),
  };
}
