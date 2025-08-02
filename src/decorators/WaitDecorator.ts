import { RUNNING, SUCCESS } from '../constants';
import Decorator from '../Decorator';
import type Node from '../Node';
import { RunCallback, type Blackboard, type MinimalBlueprint } from '../types';

type Config = {
  awaitFor?: number;
  timeProvider?: () => number;
};

type WaitDecoratorProps = { config?: Config } & Omit<MinimalBlueprint, 'nodes'>;

export const ERROR_NOOP_RUN =
  'WaitDecorator will ignore the run method for a given node. Use start and end as part of the lifecycle of the decorator';
export const ERROR_SETTING_ON_WAITING = 'Cannot set waitFor while waiting';

export default class WaitDecorator extends Decorator {
  isWaiting = false;
  waitingAt = 0;
  nodeType = 'AwaitDecorator';
  node: Node;

  constructor(props: WaitDecoratorProps) {
    super(props);
    if (!props.node) {
      throw new Error('Node is required for WaitDecorator');
    }
    this.node = props.node as Node;
    if (this.node?.blueprint?.run?.name !== 'NOOP_RUN') {
      throw new Error(ERROR_NOOP_RUN);
    }
  }

  setConfig({ awaitFor = 5, timeProvider = Date.now }) {
    this.config = {
      awaitFor,
      timeProvider
    };
  }

  setWaitFor(waitFor: number) {
    if (this.isWaiting) {
      throw new Error(ERROR_SETTING_ON_WAITING);
    }
    this.config.awaitFor = waitFor;
    return this;
  }

  decorate(run: RunCallback, blackboard: Blackboard) {
    // Is not waiting? wait...
    if (!this.isWaiting) {
      this.isWaiting = true;
      this.waitingAt = this.config.timeProvider();
      this.node?.blueprint?.start(blackboard);
    }

    // Is waiting and time is not up? keep waiting...
    const now = this.config.timeProvider();
    if (now - this.waitingAt < this.config.awaitFor * 1000) {
      return RUNNING;
    }

    // Time is up, run the end blueprint
    this.isWaiting = false;
    this.node?.blueprint?.end(blackboard);
    return SUCCESS;
  }
}
