import sinon from 'sinon';
import { RUNNING, SUCCESS } from '../constants';
import Task from '../Task';
import type { Blackboard } from '../types';
import WaitDecorator, { ERROR_NOOP_RUN, ERROR_SETTING_ON_WAITING } from './WaitDecorator';

describe('WaitDecorator', () => {
  let clock: sinon.SinonFakeTimers;
  let decoratedTask: WaitDecorator;
  let blackboard: Blackboard;

  const task = new Task({
    start(blackboard) {
      ++blackboard.starts;
      return SUCCESS;
    },
    end(blackboard) {
      ++blackboard.ends;
      return SUCCESS;
    }
  });

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    blackboard = {
      starts: 0,
      ends: 0
    };

    decoratedTask = new WaitDecorator({ config: { awaitFor: 0 }, node: task });
  });

  afterEach(() => {
    clock.restore();
  });

  it('should run end on first call when awaitFor is 0', () => {
    const result = decoratedTask.run(blackboard);
    expect(result).toBe(SUCCESS);
    expect(blackboard.starts).toEqual(1);
    expect(blackboard.ends).toEqual(1);
  });

  it('should return RUNNING after first called', () => {
    const result = decoratedTask.setWaitFor(5).run(blackboard);
    expect(result).toBe(RUNNING);
    expect(blackboard.starts).toEqual(1);
    expect(blackboard.ends).toEqual(0);
  });

  it('should return RUNNING if called before await time is up', () => {
    decoratedTask.setWaitFor(5).run(blackboard);
    clock.tick(4000); // 4 seconds
    const result = decoratedTask.run(blackboard);
    expect(result).toBe(RUNNING);
    expect(blackboard.starts).toEqual(1);
    expect(blackboard.ends).toEqual(0);
  });

  it('should call the run callback after await time is up', () => {
    decoratedTask.setWaitFor(5).run(blackboard);
    clock.tick(6000); // 6 seconds
    const result = decoratedTask.run(blackboard);
    expect(result).toBe(SUCCESS);
    expect(blackboard.starts).toEqual(1);
    expect(blackboard.ends).toEqual(1);
  });

  it('should reset awaiting state after running the node', () => {
    decoratedTask.setWaitFor(5).run(blackboard);
    expect(decoratedTask.isWaiting).toBe(true);
    clock.tick(6000); // 6 seconds
    decoratedTask.run(blackboard);
    expect(decoratedTask.isWaiting).toBe(false);
  });

  it('should throw an error if the node has a run implementation', () => {
    const taskWithRun = new Task({
      run: () => {
        return false;
      }
    });
    expect(() => new WaitDecorator({ node: taskWithRun })).toThrow(ERROR_NOOP_RUN);
  });

  it('should throw an error if setting waitFor while waiting', () => {
    decoratedTask.setWaitFor(5).run(blackboard);
    decoratedTask.run(blackboard);
    expect(() => decoratedTask.setWaitFor(5)).toThrow(ERROR_SETTING_ON_WAITING);
  });
});
