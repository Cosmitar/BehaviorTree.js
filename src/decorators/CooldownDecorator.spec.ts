/* eslint-env jest */
import sinon from 'sinon';
import { RUNNING, SUCCESS, FAILURE } from '../constants';
import CooldownDecorator from './CooldownDecorator';
import Task from '../Task';
import { Blackboard } from '../types';

describe('CooldownDecorator', () => {
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
  let decoratedTask: CooldownDecorator;
  let decoratedTask5sec: CooldownDecorator;
  let decoratedSwitchTask: CooldownDecorator;
  let blackboard: Blackboard;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    blackboard = {
      count: 0
    };
    decoratedTask = new CooldownDecorator({ config: { cooldown: 3 }, node: task });
    decoratedTask5sec = new CooldownDecorator({ config: { cooldown: 5 }, node: task });
    decoratedSwitchTask = new CooldownDecorator({ config: { cooldown: 5 }, node: switchTask });
  });

  afterEach(() => {
    clock.restore();
  });

  it('has a nodeType', () => {
    expect(decoratedTask.nodeType).toEqual('CooldownDecorator');
  });

  it('calls the task on first call', () => {
    decoratedTask.run(blackboard);
    expect(blackboard.count).toEqual(1);
  });

  it('needs cooldown seconds before task will be called again and returns FAILURE in the meantime', () => {
    expect(decoratedTask.run(blackboard)).toEqual(SUCCESS);
    expect(blackboard.count).toEqual(1);

    expect(decoratedTask.run(blackboard)).toEqual(FAILURE);
    expect(blackboard.count).toEqual(1);

    clock.tick(2999);
    expect(decoratedTask.run(blackboard)).toEqual(FAILURE);
    expect(blackboard.count).toEqual(1);

    clock.tick(1);
    expect(decoratedTask.run(blackboard)).toEqual(SUCCESS);
    expect(blackboard.count).toEqual(2);
  });

  it('different cooldown tasks dont interfer with each other', () => {
    expect(decoratedTask.run(blackboard)).toEqual(SUCCESS);
    expect(decoratedTask5sec.run(blackboard)).toEqual(SUCCESS);
    expect(blackboard.count).toEqual(2);

    clock.tick(3000);
    expect(decoratedTask.run(blackboard)).toEqual(SUCCESS);
    expect(decoratedTask5sec.run(blackboard)).toEqual(FAILURE);
    expect(blackboard.count).toEqual(3);

    clock.tick(2000);
    expect(decoratedTask.run(blackboard)).toEqual(FAILURE);
    expect(decoratedTask5sec.run(blackboard)).toEqual(SUCCESS);
    expect(blackboard.count).toEqual(4);
  });

  it('does not start cooldown as long as task is running', () => {
    blackboard.switchResult = RUNNING;
    expect(decoratedSwitchTask.run(blackboard)).toEqual(RUNNING);
    expect(blackboard.count).toEqual(1);

    clock.tick(100);
    expect(decoratedSwitchTask.run(blackboard)).toEqual(RUNNING);
    expect(blackboard.count).toEqual(2);

    clock.tick(100);
    blackboard.switchResult = SUCCESS;
    expect(decoratedSwitchTask.run(blackboard)).toEqual(SUCCESS);
    expect(blackboard.count).toEqual(3);

    clock.tick(4900);
    blackboard.switchResult = RUNNING;
    expect(decoratedSwitchTask.run(blackboard)).toEqual(FAILURE);
    expect(blackboard.count).toEqual(3);

    clock.tick(100);
    expect(decoratedSwitchTask.run(blackboard)).toEqual(RUNNING);
    expect(blackboard.count).toEqual(4);
  });
});
