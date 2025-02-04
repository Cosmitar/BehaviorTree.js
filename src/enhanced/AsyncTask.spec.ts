import sinon from 'sinon';
import AsyncTask from './AsyncTask';
import type { Blackboard, RunConfig } from '../types';
import { FAILURE, RUNNING, SUCCESS } from '../constants';
import { EnhancedBehaviorTree } from './EnhancedBehaviorTree';
import Introspector from '../Introspector';
import Task from '../Task';

describe('AsyncTask', () => {
  let asyncTask: AsyncTask;
  let runStub: sinon.SinonStub;
  let endStub: sinon.SinonStub;
  let blackboard: Blackboard;
  let config: RunConfig;

  beforeEach(() => {
    runStub = sinon.stub().resolves(SUCCESS);
    endStub = sinon.stub();

    blackboard = {
      start: 0,
      run: 0,
      end: 0,
      result: RUNNING
    };

    const tree = new Task({
      start: sinon.stub(),
      run: sinon.stub(),
      end: sinon.stub()
    });

    const bTree = new EnhancedBehaviorTree({ tree, blackboard });
    bTree.IRQ_SIGNAL.subscribe = sinon.stub();

    const introspector = new Introspector();
    introspector.start(bTree);

    config = {
      introspector
    };

    asyncTask = new AsyncTask({ run: runStub, end: endStub });
  });

  it('should initialize with unresolved state', () => {
    expect(asyncTask.unresolved).toBe(true);
    expect(asyncTask.result).toBe(FAILURE);
    expect(asyncTask.listening).toBe(false);
  });

  it('should set unresolved to true on first run', () => {
    asyncTask.run(blackboard, config);
    expect(asyncTask.unresolved).toBe(true);
  });

  it('should set result to RUNNING when unresolved and not running', () => {
    asyncTask.run(blackboard, config);
    expect(asyncTask.result).toBe(RUNNING);
  });

  it('should call asyncRun when unresolved and not running', () => {
    const asyncRunSpy = sinon.spy(asyncTask, 'asyncRun');
    asyncTask.run(blackboard, config);
    expect(asyncRunSpy.calledOnce).toBe(true);
  });

  it('should set up listener on first run', () => {
    asyncTask.run(blackboard, config);
    expect(asyncTask.listening).toBe(true);
  });

  it('should handle async run success', async () => {
    await asyncTask.asyncRun(runStub);
    expect(asyncTask.result).toBe(SUCCESS);
  });

  it('should handle async run failure', async () => {
    runStub.rejects(new Error('Test Error'));
    await asyncTask.asyncRun(runStub);
    expect(asyncTask.result).toBe(FAILURE);
  });

  it('should call end callback with result on IRQ signal', () => {
    asyncTask.run(blackboard, config);
    const irqCallback = ((config.introspector?.tree as EnhancedBehaviorTree).IRQ_SIGNAL.subscribe as sinon.SinonStub).getCall(0).args[0];
    irqCallback();
    expect(endStub.calledOnce).toBe(true);
    expect(endStub.calledWith(blackboard, FAILURE)).toBe(true);
  });
});
