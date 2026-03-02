import Decorator from './Decorator';
import AlwaysFailDecorator from './decorators/AlwaysFailDecorator';
import AlwaysSucceedDecorator from './decorators/AlwaysSucceedDecorator';
import CooldownDecorator from './decorators/CooldownDecorator';
import GuardDecorator from './decorators/GuardDecorator';
import InvertDecorator from './decorators/InvertDecorator';
import LoopDecorator from './decorators/LoopDecorator';
import WaitDecorator from './decorators/WaitDecorator';
import Node from './Node';
import Parallel from './Parallel';
import Random from './Random';
import Selector from './Selector';
import Sequence from './Sequence';
import Task from './Task';
import { ImportableJson, type NodeOrFunction } from './types';

export default class BehaviorTreeImporter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  types: Record<string, any> = {
    task: Task,
    decorator: Decorator,
    selector: Selector,
    sequence: Sequence,
    parallel: Parallel,
    random: Random,
    invert: InvertDecorator,
    fail: AlwaysFailDecorator,
    succeed: AlwaysSucceedDecorator,
    cooldown: CooldownDecorator,
    loop: LoopDecorator,
    wait: WaitDecorator,
    guard: GuardDecorator
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defineType(type: string, Klass: any) {
    this.types[type] = Klass;
  }

  parse(
    json: ImportableJson,
    nodeLookup?: (name: string) => Node | ((...args: unknown[]) => unknown)
  ): NodeOrFunction {
    const { type, name, ...config } = json;
    const Klass = this.types[type];
    if (!Klass) {
      if (!nodeLookup) {
        throw new Error(`Don't know how to handle type ${type}. Please register this first.`);
      }
      const registeredNode = nodeLookup(type);
      if (typeof registeredNode === 'function') {
        return registeredNode;
      } else if (registeredNode) {
        (registeredNode as Node).name = name;
        return registeredNode as Node;
      }
      throw new Error(`Don't know how to handle type ${type}. Please register this first.`);
    }

    return new Klass({
      name: name,
      node: json.node ? this.parse(json.node, nodeLookup) : null,
      nodes: json.nodes ? json.nodes.map((subJson: ImportableJson) => this.parse(subJson, nodeLookup)) : null,
      config
    });
  }
}
