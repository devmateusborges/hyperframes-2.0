import { describe, it, expect } from "bun:test";
import { Semaphore } from "./semaphore.js";

describe("Semaphore", () => {
  it("allows immediate acquire when capacity available", async () => {
    const sem = new Semaphore(2);
    const release = await sem.acquire();
    expect(sem.active).toBe(1);
    expect(sem.waiting).toBe(0);
    release();
    expect(sem.active).toBe(0);
  });

  it("blocks when capacity is exhausted", async () => {
    const sem = new Semaphore(1);
    const release1 = await sem.acquire();
    let acquired = false;
    const p = sem.acquire().then((r) => {
      acquired = true;
      return r;
    });
    await Bun.sleep(50);
    expect(acquired).toBe(false);
    expect(sem.waiting).toBe(1);
    release1();
    await p;
    expect(acquired).toBe(true);
  });

  it("processes waiters FIFO", async () => {
    const sem = new Semaphore(1);
    const release1 = await sem.acquire();
    const order: number[] = [];
    const p2 = sem.acquire().then((r) => { order.push(2); return r; });
    const p3 = sem.acquire().then((r) => { order.push(3); return r; });
    release1();
    const r2 = await p2;
    r2();
    const r3 = await p3;
    r3();
    expect(order).toEqual([2, 3]);
  });
});
