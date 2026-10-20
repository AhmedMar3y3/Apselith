import type { OrbitalElements } from '../../domain/satellite/catalog';
import type { SatellitePosition } from '../propagation/sgp4';
import type { Observer, Pass } from '../propagation/passes';
import type { SatelliteTrack } from '../propagation/interpolation';
export type ComputeTask =
  | {
      kind: 'positions';
      elements: OrbitalElements[];
      time: number;
      span: number;
    }
  | {
      kind: 'trajectory';
      elements: OrbitalElements;
      time: number;
      minutes: number;
    }
  | {
      kind: 'passes';
      elements: OrbitalElements;
      time: number;
      observer: Observer;
    };
export type ComputeRequest = { id: number; task: ComputeTask };
export type ComputeResult =
  | { kind: 'positions'; tracks: SatelliteTrack[]; failures: string[] }
  | { kind: 'trajectory'; positions: SatellitePosition[] }
  | { kind: 'passes'; passes: Pass[] };
export type ComputeResponse = { id: number } & (
  { ok: true; result: ComputeResult } | { ok: false; message: string }
);
