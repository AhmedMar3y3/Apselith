import type {
  ComputeRequest,
  ComputeResponse,
  ComputeResult,
  ComputeTask,
} from './protocol';
export class ComputationClient {
  private worker = new Worker(new URL('./compute.worker.ts', import.meta.url), {
    type: 'module',
  });
  private sequence = 0;
  private disposed = false;
  private pending = new Map<
    number,
    {
      resolve: (result: ComputeResult) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();
  constructor() {
    this.worker.onmessage = (event: MessageEvent<ComputeResponse>) => {
      const reply = event.data;
      const callback = this.pending.get(reply.id);
      if (!callback) return;
      this.pending.delete(reply.id);
      clearTimeout(callback.timeout);
      if (reply.ok) callback.resolve(reply.result);
      else callback.reject(new Error(reply.message));
    };
    this.worker.onerror = (event) => {
      this.disposed = true;
      this.worker.terminate();
      this.rejectAll(
        new Error(
          event.message || 'Calculation worker failed. Reload to retry.',
        ),
      );
    };
  }
  run(task: ComputeTask): Promise<ComputeResult> {
    if (this.disposed)
      return Promise.reject(
        new Error('Calculation worker is unavailable. Reload to restart it.'),
      );
    if (this.pending.size >= 3)
      return Promise.reject(
        new Error(
          'Calculation queue is full. Wait for the current calculation.',
        ),
      );
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.disposed = true;
        this.worker.terminate();
        this.rejectAll(
          new Error('Calculation timed out. Reload to restart the worker.'),
        );
      }, 20000);
      this.pending.set(id, { resolve, reject, timeout });
      const request: ComputeRequest = { id, task };
      this.worker.postMessage(request);
    });
  }
  private rejectAll(error: Error) {
    for (const callback of this.pending.values()) {
      clearTimeout(callback.timeout);
      callback.reject(error);
    }
    this.pending.clear();
  }
  dispose() {
    this.disposed = true;
    this.worker.terminate();
    this.rejectAll(new Error('Calculation cancelled.'));
  }
}
