import { RUNNING, SUCCESS } from './constants';
import { identityLookUp, isRunning } from './helper';
import Node from './Node';
import { Blackboard, MinimalBlueprint, NodeOrRegistration, RunConfig, RunResult, Status, type ActivableDecorator } from './types';

export default class BranchNode extends Node {
  numNodes: number;
  nodes: NodeOrRegistration[];
  // Override this in subclasses
  OPT_OUT_CASE: Status = SUCCESS;
  START_CASE: Status = SUCCESS;

  nodeType = 'BranchNode';

  constructor(blueprint: MinimalBlueprint) {
    super(blueprint);

    this.nodes = blueprint.nodes || [];
    this.numNodes = this.nodes.length;
  }

  run(blackboard: Blackboard = {}, { lastRun, introspector, rerun, registryLookUp = identityLookUp }: RunConfig = {}) {
    if (!rerun) registryLookUp(this.blueprint.start)(blackboard);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let overallResult: Status | any = this.START_CASE;
    const results: Array<RunResult> = [];
    const lastRunStates: Array<RunResult> = (typeof lastRun === 'object' && lastRun.state) || [];
    const startingIndex = Math.max(
      lastRunStates.findIndex((x) => isRunning(x)),
      0
    );
    let currentIndex = 0;
    for (; currentIndex < this.numNodes; ++currentIndex) {
      const node = registryLookUp(this.nodes[currentIndex]);

      const forceRun =
        lastRunStates[currentIndex] !== undefined
          ? (node as ActivableDecorator).shouldActivate?.(lastRunStates[currentIndex], blackboard)
          : false;

      if (currentIndex < startingIndex && !forceRun) {
        // Keep last result
        results[currentIndex] = lastRunStates[currentIndex];
        continue;
      }

      if (forceRun) {
        registryLookUp(this.nodes[startingIndex]).abort(blackboard, {
          registryLookUp,
          lastRun: lastRunStates[startingIndex]
        });
      }

      const result = node.run(blackboard, {
        lastRun: lastRunStates[currentIndex],
        introspector,
        rerun,
        registryLookUp
      });
      results[currentIndex] = result;

      if (result === RUNNING || typeof result === 'object') {
        overallResult = RUNNING;
        break;
      } else if (result === this.OPT_OUT_CASE) {
        overallResult = result;
        break;
      } else {
        rerun = false;
      }
    }
    const running = isRunning(overallResult);
    if (!running) {
      registryLookUp(this.blueprint.end)(blackboard);
    }
    if (introspector) {
      const debugResult = running ? RUNNING : overallResult;
      introspector.wrapLast(Math.min(currentIndex + 1, this.numNodes), this, debugResult, blackboard);
    }
    return overallResult === RUNNING ? { total: overallResult, state: results } : overallResult;
  }

  abort(blackboard: Blackboard, { lastRun, registryLookUp = identityLookUp }: RunConfig = {}) {
    const lastRunStates = (typeof lastRun === 'object' && lastRun && 'state' in lastRun && lastRun.state) || [];
    for (let i = 0; i < lastRunStates.length; i++) {
      if (isRunning(lastRunStates[i])) {
        const node = registryLookUp(this.nodes[i]);
        node.abort(blackboard, {
          registryLookUp,
          lastRun: lastRunStates[i]
        });
      }
    }
  }
}
