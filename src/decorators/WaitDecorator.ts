import { RUNNING } from '../constants';
import Decorator from '../Decorator';
import { RunCallback } from '../types';

export default class WaitDecorator extends Decorator {
  isWaiting = false;
  waitingAt = 0;
  nodeType = 'AwaitDecorator';

  setConfig({ awaitFor = 5, timeProvider = Date.now }) {
    this.config = {
      awaitFor,
      timeProvider
    };
  }

  decorate(run: RunCallback) {
    // Is not waiting? wait...
    if (!this.isWaiting) {
      this.isWaiting = true;
      this.waitingAt = Date.now();
    }

    // Is waiting and time is not up? keep waiting...
    const now = this.config.timeProvider();
    if (now - this.waitingAt < this.config.awaitFor * 1000) {
      return RUNNING;
    }

    // Time is up, run the node
    this.isWaiting = false;

    return run();
  }
}
