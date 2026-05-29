import Phaser from 'phaser';

/**
 * Generic object pool for Phaser GameObjects.
 *
 * Usage:
 *   const pool = new ObjectPool(scene, () => new MyObject(scene, defaultCfg), 10);
 *   const obj  = pool.get();        // retrieve (grows if empty)
 *   pool.release(obj);              // return to free list
 *   pool.releaseAll();              // return everything
 */
export class ObjectPool<T extends Phaser.GameObjects.GameObject> {
  private available: T[] = [];
  private active: T[] = [];
  private readonly scene: Phaser.Scene;
  private readonly factory: () => T;

  constructor(scene: Phaser.Scene, factory: () => T, initialSize = 0) {
    this.scene   = scene;
    this.factory = factory;
    if (initialSize > 0) this.preWarm(initialSize);
  }

  /** Fill the free list without activating. */
  preWarm(count: number): void {
    for (let i = 0; i < count; i++) {
      const obj = this.factory();
      obj.setActive(false);
      (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
      this.available.push(obj);
    }
  }

  /**
   * Retrieve an object from the pool.
   * Grows the pool automatically if no free objects remain.
   * Caller is responsible for calling reset() with actual config.
   */
  get(): T | null {
    let obj = this.available.pop();
    if (!obj) {
      obj = this.factory();
    }
    obj.setActive(true);
    (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(true);
    this.active.push(obj);
    return obj;
  }

  /** Return an object to the free list. */
  release(obj: T): void {
    const idx = this.active.indexOf(obj);
    if (idx !== -1) this.active.splice(idx, 1);
    obj.setActive(false);
    (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
    this.available.push(obj);
  }

  /** Snapshot of all currently active objects. */
  getActive(): T[] {
    return this.active.slice();
  }

  /** Release every active object back to the free list. */
  releaseAll(): void {
    for (const obj of this.active.slice()) {
      this.release(obj);
    }
  }

  /** Destroy all pooled objects (call on scene shutdown). */
  destroy(): void {
    for (const obj of [...this.active, ...this.available]) {
      obj.destroy();
    }
    this.active    = [];
    this.available = [];
  }
}
