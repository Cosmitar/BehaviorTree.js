import { FAILURE, RUNNING, SUCCESS } from '../constants';
import { isRunning } from '../helper';
import Task from '../Task';
import type { Blackboard, MinimalBlueprint, RunConfig, RunResult, Status } from '../types';
import type { EnhancedBehaviorTree } from './EnhancedBehaviorTree';

type AsyncRunResult = Promise<RunResult>;
type AsyncRunCallback = (...args: unknown[]) => AsyncRunResult;

export default class AsyncTask extends Task {
  nodeType = 'AsyncTask';

  unresolved = true;

  result: RunResult = FAILURE;

  listening = false;

  // Redefines constructor arguments to support async run() callback
  constructor({
    run,
    end,
    ...props
  }: Omit<MinimalBlueprint, 'run' | 'end'> & { run: AsyncRunCallback; end?: (bb: Blackboard, result: RunResult) => void }) {
    super({
      // Sets a syncronous callback for super.
      run: (bb, { rerun }) => {
        // updates internal state.
        if (!rerun) {
          this.unresolved = true;
        }

        // Starts running until async resolves.
        if (this.unresolved && !isRunning(this.result)) {
          this.asyncRun(() => run(bb));

          this.result = RUNNING;
        }

        return this.result as Status;
      },
      // Overwrites to inject result.
      end: (bb: Blackboard) => {
        end?.(bb, typeof this.result === 'object' ? this.result.total : this.result);
      },
      ...props
    });
  }

  // Overrides run() just to set up listeners for the first time.
  run(blackboard: Blackboard, config: RunConfig = {}) {
    if (!this.listening) {
      this.setUpListener(config.introspector?.tree as EnhancedBehaviorTree<Record<string, unknown>>);

      this.listening = true;
    }

    return super.run(blackboard, config);
  }

  // Subscribes to tree IRQ signal.
  setUpListener(bTree: EnhancedBehaviorTree<Record<string, unknown>>) {
    bTree.IRQ_SIGNAL.subscribe(() => {
      // aborts only if it's running
      if (isRunning(this.result)) {
        this.unresolved = false;

        this.result = FAILURE;

        // calls end() including result. When FAILURE, was aborted, otherwise resolved.
        this.blueprint.end(bTree.blackboard, this.result);
      }
    });
  }

  // Awaits for async run() to finish, handles promise error.
  async asyncRun(run: AsyncRunCallback) {
    try {
      await run();

      this.result = this.unresolved ? SUCCESS : this.result;
    } catch (e) {
      this.result = this.unresolved ? FAILURE : this.result;
    }

    if (this.unresolved) {
      this.unresolved = false;
    } else {
      // console.log('ignored aborted async', this.name);
    }
  }
}
