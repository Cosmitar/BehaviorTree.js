export default class Event<T extends unknown[] = []> {
  private subscribers: Set<(...args: T) => void> = new Set();
  private _onSubscribe?: Event<[callback: (...args: T) => void]>;
  private _onUnsubscribe?: Event<[callback: (...args: T) => void]>;

  /**
   * Event that is emitted when a new subscription is added.
   */
  get onSubscribe(): Event<[callback: (...args: T) => void]> {
    if (!this._onSubscribe) {
      this._onSubscribe = new Event();
    }
    return this._onSubscribe;
  }

  /**
   * Event that is emitted when a subscription is removed.
   */
  get onUnsubscribe(): Event<[callback: (...args: T) => void]> {
    if (!this._onUnsubscribe) {
      this._onUnsubscribe = new Event();
    }
    return this._onUnsubscribe;
  }

  /**
   * Subscribes a callback to the event.
   *
   * @param callback The callback to subscribe to the event.
   * @returns A function to unsubscribe the callback.
   */
  subscribe(callback: (...args: T) => void, options?: { signal?: AbortSignal }): () => void {
    this.subscribers.add(callback);
    this._onSubscribe?.emit(callback);

    // Handle the abort signal
    if (options?.signal) {
      options.signal.addEventListener('abort', () => {
        this.unsubscribe(callback);
      });
    }

    return () => this.unsubscribe(callback);
  }

  /**
   * Unsubscribes a callback from the event.
   *
   * @param callback The callback to unsubscribe from the event.
   */
  unsubscribe(callback: (...args: T) => void): void {
    this.subscribers.delete(callback);
    this._onUnsubscribe?.emit(callback);
  }

  /**
   * Clears all existing subscriptions.
   */
  clear(): void {
    if (this._onUnsubscribe) {
      for (const callback of this.subscribers) {
        this._onUnsubscribe.emit(callback);
      }
    }
    this.subscribers.clear();
  }

  /**
   * Emit the event. This invokes all stored listeners, passing the
   * given payload to each of them.
   *
   * @param args Arguments to pass to the listeners.
   */
  emit(...args: T): void {
    this.subscribers.forEach((callback) => callback(...args));
  }

  /**
   * Emit the event asynchronously. This invokes all stored listeners,
   * passing the given payload to each of them, and returns a promise
   * that resolves when all listeners have completed their work.
   *
   * @param args Arguments to pass to the listeners.
   * @returns A promise that resolves when all listeners have been invoked.
   */
  async emitAsync(...args: T): Promise<void> {
    await Promise.all(Array.from(this.subscribers).map((callback) => callback(...args)));
  }
}
