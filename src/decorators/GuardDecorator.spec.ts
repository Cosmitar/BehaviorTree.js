import { RUNNING, SUCCESS } from '../constants';
import Task from '../Task';
import type { Blackboard, RunResult } from '../types';
import GuardDecorator from './GuardDecorator';

describe('GuardDecorator', () => {
  let guardedTask: GuardDecorator<Blackboard>;
  let guardedDefaultTask: GuardDecorator<Blackboard>;
  let blackboard: Blackboard;

  const taskNextResult = new Task({
    run(blackboard) {
      ++blackboard.count;
      return blackboard.nodeNextResult;
    }
  });

  beforeEach(() => {
    blackboard = {
      shouldPass: true, // guard condition
      nodeNextResult: SUCCESS, // task result
      count: 0
    };

    guardedTask = new GuardDecorator({ config: { condition: (bb) => bb.shouldPass }, node: taskNextResult });
    guardedDefaultTask = new GuardDecorator({ config: {}, node: taskNextResult });
  });

  it('should return node result when neither condition nor controlKey is provided', () => {
    blackboard.nodeNextResult = SUCCESS;
    const result = guardedDefaultTask.run(blackboard);

    expect(result).toBe(SUCCESS);
  });

  it('should return node result when condition matches', () => {
    blackboard.nodeNextResult = RUNNING;
    blackboard.shouldPass = true;
    const result = guardedTask.run(blackboard);

    expect(result).toBe(RUNNING);
  });

  it('should return node result when condition does not match and IRQ is not set', () => {
    blackboard.nodeNextResult = SUCCESS;
    blackboard.shouldPass = false;
    const result = guardedTask.run(blackboard);

    expect(result).toBe(SUCCESS);
  });

  it('should emulate moveTo node', () => {
    const bb: Blackboard<{
      targetToMove?: { x: number; y: number };
      nodeNextResult: RunResult;
      count: number;
    }> = {
      targetToMove: { x: 0, y: 0 }, // has target to move
      nodeNextResult: RUNNING, // task will call to move and return this
      count: 0
    };

    guardedTask = new GuardDecorator({ config: { condition: (bb) => bb.targetToMove !== undefined }, node: taskNextResult });
    const result = guardedTask.run(bb);

    expect(result).toBe(RUNNING);
    expect(bb.count).toBe(1);

    // at some point the target is reached and removed from the blackboard
    bb.targetToMove = undefined;
    bb.nodeNextResult = SUCCESS;

    // the tree run is called arbitrarily
    const result2 = guardedTask.run(bb);

    expect(result2).toBe(SUCCESS);
    expect(bb.count).toBe(2);
  });
});
