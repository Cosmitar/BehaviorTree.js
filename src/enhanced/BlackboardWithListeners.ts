import type Event from '../utils/Event';

export default class BlackboardWithListeners<T extends Record<string, unknown>> {
  private target: T;

  constructor(initialObject: T, cb?: (key: keyof T, bb: T) => void) {
    this.target = initialObject;

    return new Proxy(this.target, {
      get: (target, property, receiver) => {
        if (Object.getOwnPropertyNames(this).includes(String(property))) {
          // If the property exists in the class, access it
          return Reflect.get(this, property, receiver);
        }

        return Reflect.get(target, property, receiver); // Access the proxied object
      },

      set: (target, property, value) => {
        if (value !== target[property as keyof typeof target]) {
          Reflect.set(target, property, value);

          cb?.(property as keyof T, target);
        }

        return true;
      },

      has: (target, property) => Reflect.has(target, property)
    }) as unknown as BlackboardWithListeners<T> & { ON_CHANGE: Event<[key: keyof T, bb: T]> };
  }
}
