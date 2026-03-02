import { type FAILURE } from '../constants';
import Decorator from '../Decorator';
import { isRunning } from '../helper';
import type { Blackboard, MinimalBlueprint, RunCallback } from '../types';
import { SUCCESS } from './../constants';

type Effect<T> = {
  prop: keyof T;
  value: T[keyof T];
};

type Config<T> = {
  type?: typeof SUCCESS | typeof FAILURE | 'both';
  effects: Effect<T>[];
};

type EffectDecoratorProps<T> = { config?: Config<T> } & Omit<MinimalBlueprint, 'nodes'>;

export default class EffectDecorator<T extends Blackboard = Blackboard> extends Decorator {
  nodeType = 'EffectDecorator';

  constructor(props: EffectDecoratorProps<T>) {
    super(props);
  }

  decorate(run: RunCallback, blackboard: Blackboard) {
    const result = run();

    if (isRunning(result)) return result;

    const { effects, type = SUCCESS } = this.config as Config<T>;

    if (type === 'both' || type === result) {
      effects.forEach(({ prop, value }) => {
        (blackboard as T)[prop] = value;
      });
    }

    return result;
  }
}
