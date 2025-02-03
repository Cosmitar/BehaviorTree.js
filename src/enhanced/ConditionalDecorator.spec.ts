import sinon from 'sinon';
import type { Blackboard } from '../types';
import ConditionalDecorator from './ConditionalDecorator';
import { RUNNING, SUCCESS } from '../constants';

describe('ConditionalDecorator', () => {
  let blackboard: Blackboard;
  let runStub: sinon.SinonStub;

  beforeEach(() => {
    blackboard = {};
    runStub = sinon.stub();
  });

  it('should execute when matching condition', () => {
    const condition = (bb: Blackboard) => bb.testKey === true;
    const decorator = new ConditionalDecorator({ config: { condition } });

    blackboard.testKey = true;
    runStub.returns(SUCCESS);

    const result = decorator.decorate(runStub, blackboard);

    expect(result).toBe(SUCCESS);
    expect(runStub.calledOnce).toBe(true);
  });

  it('should not execute when condition does not match', () => {
    const condition = (bb: Blackboard) => bb.testKey === true;
    const decorator = new ConditionalDecorator({ config: { condition } });

    blackboard.testKey = false;

    const result = decorator.decorate(runStub, blackboard);

    expect(result).toBe(SUCCESS);
    expect(runStub.called).toBe(false);
  });

  it('should return RUNNING if the decorated node is running', () => {
    const condition = (bb: Blackboard) => bb.testKey === true;
    const decorator = new ConditionalDecorator({ config: { condition } });

    blackboard.testKey = true;
    runStub.returns(RUNNING);

    const result = decorator.decorate(runStub, blackboard);

    expect(result).toBe(RUNNING);
    expect(runStub.calledOnce).toBe(true);
  });

  it('should use defaultValidator if no condition is provided', () => {
    const decorator = new ConditionalDecorator({ config: { controlKey: 'testKey' } });

    blackboard.testKey = true;
    runStub.returns(SUCCESS);

    const result = decorator.decorate(runStub, blackboard);

    expect(result).toBe(SUCCESS);
    expect(runStub.calledOnce).toBe(true);
  });
});
