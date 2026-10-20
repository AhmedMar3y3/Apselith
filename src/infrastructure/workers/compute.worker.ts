/// <reference lib="webworker" />
import {
  createRecord,
  positionAt,
  validatePredictionTime,
} from '../propagation/sgp4';
import { predictPasses } from '../propagation/passes';
import type {
  ComputeRequest,
  ComputeResponse,
  ComputeResult,
} from './protocol';
import type { OrbitalElements } from '../../domain/satellite/catalog';
const records = new Map<
  number,
  { epoch: string; record: ReturnType<typeof createRecord> }
>();
function recordFor(elements: OrbitalElements) {
  const existing = records.get(elements.NORAD_CAT_ID);
  if (existing?.epoch === elements.EPOCH) return existing.record;
  const record = createRecord(elements);
  records.set(elements.NORAD_CAT_ID, { epoch: elements.EPOCH, record });
  return record;
}
self.onmessage = (event: MessageEvent<ComputeRequest>) => {
  const { id, task } = event.data;
  let response: ComputeResponse;
  try {
    let result: ComputeResult;
    if (task.kind === 'positions') {
      const tracks = [];
      const failures: string[] = [];
      for (const elements of task.elements) {
        try {
          const start = Math.floor(task.time / 10000) * 10000 - 10000;
          const count =
            Math.ceil(Math.min(1800000, Math.max(20000, task.span)) / 10000) +
            2;
          const samples = [];
          for (let index = 0; index <= count; index++) {
            const time = start + index * 10000;
            validatePredictionTime(elements, time);
            samples.push(
              positionAt(recordFor(elements), elements.NORAD_CAT_ID, time),
            );
          }
          tracks.push({ id: elements.NORAD_CAT_ID, samples });
        } catch (error) {
          failures.push(
            error instanceof Error ? error.message : 'Propagation failed.',
          );
        }
      }
      result = { kind: 'positions', tracks, failures };
    } else if (task.kind === 'trajectory') {
      const positions = [];
      const record = recordFor(task.elements);
      const step = (task.minutes * 60000) / 240;
      for (let sample = 0; sample <= 240; sample++) {
        const time = task.time - task.minutes * 30000 + sample * step;
        validatePredictionTime(task.elements, time);
        positions.push(positionAt(record, task.elements.NORAD_CAT_ID, time));
      }
      result = { kind: 'trajectory', positions };
    } else
      result = {
        kind: 'passes',
        passes: predictPasses(task.elements, task.observer, task.time),
      };
    response = { id, ok: true, result };
  } catch (error) {
    response = {
      id,
      ok: false,
      message: error instanceof Error ? error.message : 'Calculation failed.',
    };
  }
  self.postMessage(response);
};
