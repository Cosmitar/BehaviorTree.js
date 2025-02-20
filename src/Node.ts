import { RUNNING } from './constants';
import { Blackboard, Blueprint, MinimalBlueprint, RunConfig, RunResult } from './types';

const NOOP_RUN = () => false;
const NOOP_START = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function
const NOOP_END = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function

export default class Node<T extends Blueprint = Blueprint> {
  _name?: string;
  blueprint: T;
  nodeType = 'Node';

  constructor({ run = NOOP_RUN, start = NOOP_START, end = NOOP_END, ...props }: MinimalBlueprint) {
    this.blueprint = { run, start, end, ...props } as T;
  }

  run(blackboard: Blackboard, { introspector, rerun = false, registryLookUp = (x) => x as Node, ...config }: RunConfig = {}): RunResult {
    if (!rerun) this.blueprint.start(blackboard);
    const result = this.blueprint.run(blackboard, { ...config, rerun, registryLookUp });
    if (result !== RUNNING) {
      this.blueprint.end(blackboard);
    }
    if (introspector) {
      introspector.push(this, result, blackboard);
    }
    return result;
  }

  get name(): string | undefined {
    return this._name || this.blueprint.name;
  }

  set name(name: string | undefined) {
    this._name = name;
  }
}
