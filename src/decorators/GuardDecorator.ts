import { FAILURE } from '../constants';
import Decorator from '../Decorator';
import { isRunning } from '../helper';
import { RunCallback, type Blackboard, type DecoratorConfig, type MinimalBlueprint, type RunResult } from '../types';

type Config<T> = {
  controlKey?: keyof T;
  condition?: (bb: Blackboard) => boolean;
  IRQType?: IRQType;
  onIRQ?: (bb: Blackboard, type: IRQType) => void;
};
type GuardDecoratorProps<T> = { config?: Config<T> } & Omit<MinimalBlueprint, 'nodes'>;

enum IRQ_TYPE {
  CATCH = 'CATCH', // low priority
  BREAK = 'BREAK', // self
  BOTH = 'BOTH',
  NONE = 'NONE' // needed?
}
type IRQType = (typeof IRQ_TYPE)[keyof typeof IRQ_TYPE];

export default class GuardDecorator<T extends Blackboard = Blackboard> extends Decorator {
  nodeType = 'GuardDecorator';
  lastResult: RunResult = FAILURE;

  static IRQ_TYPE = IRQ_TYPE;

  constructor(props: GuardDecoratorProps<T>) {
    super(props);
  }

  defaultValidator(bb: T): boolean {
    const controlKey = (this.config as Config<T>).controlKey;
    return controlKey !== undefined && bb[controlKey] === true;
  }

  setConfig({ condition, ...config }: Config<T>) {
    const validator = condition ?? this.defaultValidator.bind(this);
    this.config = { condition: validator, ...config };
  }

  decorate(run: RunCallback, blackboard: Blackboard, config: DecoratorConfig): RunResult {
    let result: RunResult = FAILURE;

    if (config.condition?.(blackboard)) {
      result = run();
    }

    this.lastResult = result;
    return result;
  }

  // overwrite
  shouldActivate(lastRun: RunResult, blackboard: Blackboard): boolean {
    // current running node is descendant if this node last run is running.
    const isDescendant = isRunning(lastRun);

    // is descendant, condition is not valid and should break? return true.
    if (
      isDescendant &&
      !this.config.condition?.(blackboard) &&
      (this.config.IRQType === IRQ_TYPE.BREAK || this.config.IRQType === IRQ_TYPE.BOTH)
    ) {
      this.config.onIRQ?.(blackboard, IRQ_TYPE.BREAK);

      return true;
    }

    // current running node is low priority if this node last run is not running.
    const isLowPriority = !isRunning(lastRun);
    // running node is low priority, condition is valid and should catch? return true.
    if (
      isLowPriority &&
      this.config.condition?.(blackboard) &&
      (this.config.IRQType === IRQ_TYPE.CATCH || this.config.IRQType === IRQ_TYPE.BOTH)
    ) {
      this.config.onIRQ?.(blackboard, IRQ_TYPE.CATCH);

      return true;
    }

    // otherwise, return false.
    return false;
  }
}
