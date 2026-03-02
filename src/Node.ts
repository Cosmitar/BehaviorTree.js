import { RUNNING } from './constants';
import { identityLookUp } from './helper';
import { Blackboard, Blueprint, MinimalBlueprint, RunConfig, RunResult } from './types';

const NOOP_RUN = () => false;
const NOOP_START = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function
const NOOP_END = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function
const NOOP_ABORT = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function

export default class Node<T extends Blueprint = Blueprint> {
  _name?: string;
  blueprint: T;
  nodeType = 'Node';

  constructor({ run = NOOP_RUN, start = NOOP_START, end = NOOP_END, abort = NOOP_ABORT, ...props }: MinimalBlueprint) {
    this.blueprint = {
      run,
      start,
      end,
      abort,
      ...props
    } as T;
  }

  run(blackboard: Blackboard, { introspector, rerun = false, registryLookUp = identityLookUp, ...config }: RunConfig = {}): RunResult {
    if (!rerun) registryLookUp(this.blueprint.start)(blackboard);
    const result = registryLookUp(this.blueprint.run)(blackboard, { ...config, rerun, registryLookUp });
    if (result !== RUNNING) {
      registryLookUp(this.blueprint.end)(blackboard);
    }
    if (introspector) {
      introspector.push(this, result, blackboard);
    }
    return result;
  }

  abort(blackboard: Blackboard, { registryLookUp = identityLookUp }: RunConfig = {}): RunResult {
    return registryLookUp(this.blueprint.abort)(blackboard);
  }

  get name(): string | undefined {
    return this._name || this.blueprint.name;
  }

  set name(name: string | undefined) {
    this._name = name;
  }
}
