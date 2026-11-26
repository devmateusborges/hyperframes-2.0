export class Semaphore {
  private _active = 0;
  private _queue: Array<() => void> = [];

  constructor(private readonly _max: number) {}

  get active() { return this._active; }
  get waiting() { return this._queue.length; }
  get max() { return this._max; }

  acquire(): Promise<() => void> {
    if (this._active < this._max) {
      this._active++;
      return Promise.resolve(this._release.bind(this));
    }
    return new Promise<() => void>((resolve) => {
      this._queue.push(() => {
        this._active++;
        resolve(this._release.bind(this));
      });
    });
  }

  private _release() {
    this._active--;
    const next = this._queue.shift();
    if (next) next();
  }
}
