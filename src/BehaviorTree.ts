import { isRunning } from './helper';
import Node from './Node';
import Task from './Task';
import {
  Blackboard,
  NodeOrRegistration,
  RunResult,
  StepParameter,
  type FunctionOrRegistration,
  type NodeOrFunction,
  type RunCallback,
  type VoidCallback
} from './types';

export default class BehaviorTree {
  tree?: NodeOrRegistration;
  blackboard?: Blackboard;
  lastResult?: RunResult;
  nodeRegistry: Registry<Node>;
  actionRegistry: Registry<RunCallback | VoidCallback>;

  constructor({
    tree,
    blackboard,
    actionRegistry,
    nodeRegistry
  }: {
    tree?: NodeOrRegistration;
    blackboard?: Blackboard;
    actionRegistry?: Registry<RunCallback | VoidCallback>;
    nodeRegistry?: Registry<Node>;
  } = {}) {
    if (tree) {
      this.tree = tree;
    }

    if (blackboard) {
      this.blackboard = blackboard;
    }

    this.lastResult = undefined;
    this.nodeRegistry = nodeRegistry || new Registry<Node>();
    this.actionRegistry = actionRegistry || new Registry<RunCallback | VoidCallback>();
  }

  setTree(tree: NodeOrRegistration) {
    this.tree = tree;
  }

  setBlackboard(blackboard: Blackboard) {
    this.blackboard = blackboard;
  }

  registerNode(name: string, node: NodeOrFunction) {
    this.nodeRegistry.register(name, typeof node === 'function' ? new Task({ run: node }) : node);
  }

  registerAction(name: string, action: RunCallback | VoidCallback) {
    this.actionRegistry.register(name, action);
  }

  step({ introspector }: StepParameter = {}) {
    if (this.tree === undefined) {
      throw new Error('Tree is not defined');
    }

    if (this.blackboard === undefined) {
      throw new Error('Blackboard is not defined');
    }

    const lastRun = this.lastResult && typeof this.lastResult === 'object' ? this.lastResult : undefined;
    const rerun = isRunning(this.lastResult);
    if (introspector) {
      introspector.start(this);
    }
    this.lastResult = this.nodeRegistry.get(this.tree).run(this.blackboard, {
      lastRun,
      introspector,
      rerun,
      registryLookUp: <T>(element: T | string): T => {
        try {
          return this.actionRegistry.get(element as FunctionOrRegistration) as T;
        } catch {
          return this.nodeRegistry.get(element as NodeOrRegistration) as T;
        }
      }
    });

    if (introspector) {
      introspector.end();
    }
  }

  reset() {
    this.lastResult = undefined;
    this.nodeRegistry.clear();
    this.actionRegistry.clear();
  }

  destroy() {
    this.reset();
    this.tree = undefined;
    this.blackboard = undefined;
  }
}

export class Registry<T> {
  private map = new Map<string, T>();

  register(name: string, value: T) {
    this.map.set(name, value);
  }

  get(ElementOrRegistration: string | T): T {
    if (typeof ElementOrRegistration === 'string' && !this.map.has(ElementOrRegistration)) {
      throw new Error(`Missing registry entry: ${ElementOrRegistration}`);
    }
    const value = typeof ElementOrRegistration === 'string' ? this.map.get(ElementOrRegistration) : ElementOrRegistration;
    return value ?? (ElementOrRegistration as T);
  }

  clear() {
    this.map.clear();
  }
}
