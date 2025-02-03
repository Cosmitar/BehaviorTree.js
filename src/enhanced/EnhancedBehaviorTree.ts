import BlackboardWithListeners from './BlackboardWithListeners';
import type { Blackboard, NodeOrRegistration, Status, StepParameter } from '../types';
import BehaviorTree from '../BehaviorTree';
import Introspector from '../Introspector';
import Event from '../utils/Event';
import { buildResultsTree } from '../utils/buildResultsTree';
import type Node from '../Node';

export class EnhancedBehaviorTree<T extends Blackboard = Blackboard> extends BehaviorTree {
  public readonly IRQ_SIGNAL = new Event();

  public readonly ON_BLACKBOARD_CHANGE = new Event<[key: keyof T, bb: T]>();

  private introspector: Introspector = new Introspector();

  constructor(props: { tree: NodeOrRegistration; blackboard: T }) {
    // Proxies the blackboard to support listeners
    super({
      tree: props.tree,
      blackboard: new BlackboardWithListeners<T>(props.blackboard, (key: keyof T, bb: T) => this.ON_BLACKBOARD_CHANGE.emit(key, bb))
    });
  }

  step({ introspector }: StepParameter = {}) {
    // always injects an introspector since it's used as the connection between Nodes and EnhancedBehaviorTree
    if (introspector) {
      this.introspector = introspector;
    }

    super.step({ introspector: this.introspector });
  }

  requestInterruption(node: Node, nextStatus: Status) {
    const newResult = buildResultsTree(node, this.tree, this.lastResult, nextStatus);

    // When last result and new result are the same, interrupter wasn't present in the results tree.
    // Then, does not interrupt due to lower priority.
    if (this.lastResult !== newResult) {
      this.IRQ_SIGNAL.emit();

      this.lastResult = newResult;
    }

    //bTree.step()
  }
}
