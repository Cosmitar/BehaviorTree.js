import WaitDecorator from './WaitDecorator';
import { RUNNING, SUCCESS, FAILURE } from '../constants';
import sinon from 'sinon';
import Task from '../Task';
import type { Blackboard } from '../types';

describe('WaitDecorator', () => {
  let clock: sinon.SinonFakeTimers;
  let decoratedTask: WaitDecorator;
  let decoratedTask0s: WaitDecorator;
  let decoratedSwitchTask: WaitDecorator;
  let blackboard: Blackboard;
  // let runStub: sinon.SinonStub;
  const task = new Task({
    run(blackboard) {
      ++blackboard.count;
      return SUCCESS;
    }
  });
  const switchTask = new Task({
    run(blackboard) {
      ++blackboard.count;
      return blackboard.switchResult;
    }
  });

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    blackboard = {
      count: 0
    };
    decoratedTask = new WaitDecorator({ config: { awaitFor: 5 }, node: task });
    decoratedTask0s = new WaitDecorator({ config: { awaitFor: 0 }, node: task });
    decoratedSwitchTask = new WaitDecorator({ config: { awaitFor: 5 }, node: switchTask });
  });

  afterEach(() => {
    clock.restore();
  });

  it('should return result on first call when awaitFor is 0', () => {
    const result = decoratedTask0s.run(blackboard);
    expect(result).toBe(SUCCESS);
    expect(blackboard.count).toEqual(1);
  });

  it('should return RUNNING when first called', () => {
    const result = decoratedTask.run(blackboard);
    expect(result).toBe(RUNNING);
    expect(blackboard.count).toEqual(0);
  });

  it('should return RUNNING if called before await time is up', () => {
    decoratedTask.run(blackboard);
    clock.tick(4000); // 4 seconds
    const result = decoratedTask.run(blackboard);
    expect(result).toBe(RUNNING);
    expect(blackboard.count).toEqual(0);
  });

  it('should call the run callback after await time is up', () => {
    decoratedTask.run(blackboard);
    clock.tick(6000); // 6 seconds
    const result = decoratedTask.run(blackboard);
    expect(result).toBe(SUCCESS);
    expect(blackboard.count).toEqual(1);
  });

  it('should reset awaiting state after running the node', () => {
    decoratedTask.run(blackboard);
    clock.tick(6000); // 6 seconds
    decoratedTask.run(blackboard);
    expect(decoratedTask.isWaiting).toBe(false);
  });

  it('should return the result of the run callback after await time is up', () => {
    decoratedSwitchTask.run(blackboard);
    clock.tick(6000); // 6 seconds

    blackboard.switchResult = FAILURE;

    const result = decoratedSwitchTask.run(blackboard);
    expect(result).toBe(FAILURE);
  });
});
