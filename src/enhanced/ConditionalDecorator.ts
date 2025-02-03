import { SUCCESS } from '../constants';
import Decorator from '../Decorator';
import { isRunning } from '../helper';
import type { Blackboard, MinimalBlueprint, RunCallback, RunResult } from '../types';
import { isSet } from '../utils/evaluators';

type Config<T> = { controlKey?: keyof T; condition?: (bb: Blackboard) => boolean };
type ConditionalDecoratorProps<T> = { config: Config<T> } & Omit<MinimalBlueprint, 'nodes'>;

// This decorator runs a condition from config and calls run() if condition returns true.
// This decorator returns RUNNIG if sequence is running or SUCCESS (never fails), if you use it as a Selector node, then use AlwaysSucceedDecorator around it.
export default class ConditionalDecorator<T extends Blackboard> extends Decorator {
  nodeType = 'ConditionalDecorator';

  constructor(props: ConditionalDecoratorProps<T>) {
    super(props);
  }

  defaultValidator(bb: Blackboard, key = '') {
    return isSet(key)(bb);
  }

  setConfig({ condition = this.defaultValidator.bind(this), controlKey }: Config<T>) {
    this.config = { condition, controlKey };
  }

  decorate(run: RunCallback, blackboard: Blackboard): RunResult {
    let result: RunResult;

    if (this.config.condition?.(blackboard, this.config.controlKey)) {
      result = run();
    }

    return isRunning(result) ? result : SUCCESS;
  }
}
