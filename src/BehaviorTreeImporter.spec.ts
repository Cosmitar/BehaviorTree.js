/* eslint-env jest */
import sinon from 'sinon';
import BehaviorTree from './BehaviorTree';
import BehaviorTreeImporter from './BehaviorTreeImporter';
import { FAILURE, SUCCESS } from './constants';
import Decorator from './Decorator';
import type WaitDecorator from './decorators/WaitDecorator';
import Introspector from './Introspector';
import Task from './Task';
import { Blackboard, IntrospectionResult, RunCallback } from './types';

class EnemyInSightDecorator extends Decorator {
  nodeType = 'EnemyInSightDecorator';

  decorate(run: RunCallback, blackboard: Blackboard) {
    return blackboard.enemyInSight ? run() : FAILURE;
  }
}

describe('BehaviorTreeImporter', () => {
  let clock: sinon.SinonFakeTimers;
  let blackboard: Blackboard;
  let importer: BehaviorTreeImporter;
  let bTree: BehaviorTree;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    blackboard = {
      timesJumped: 0
    };
    bTree = new BehaviorTree();
    bTree.setBlackboard(blackboard);
    bTree.registerNode(
      'walk',
      new Task({
        run: function (blackboard) {
          blackboard.walking = true;
          return SUCCESS;
        }
      })
    );
    bTree.registerNode(
      'idle',
      new Task({
        run: function (blackboard) {
          blackboard.walking = false;
          return SUCCESS;
        }
      })
    );
    bTree.registerNode(
      'jump',
      new Task({
        run: function (blackboard) {
          blackboard.timesJumped++;
          return SUCCESS;
        }
      })
    );
    bTree.registerNode(
      'wait_task',
      new Task({
        start: function (blackboard) {
          blackboard.waiting = true;
          return SUCCESS;
        }
      })
    );
    importer = new BehaviorTreeImporter();
    importer.defineType('ifEnemyInSight', EnemyInSightDecorator);
  });

  describe('importing a complex JSON tree into a usable behavior tree', () => {
    const json = {
      type: 'selector',
      name: 'the root',
      nodes: [
        {
          type: 'ifEnemyInSight',
          name: 'handling enemies',
          node: { type: 'walk', name: 'go to enemy' }
        },
        {
          type: 'cooldown',
          name: 'jumping around',
          cooldown: 1,
          node: { type: 'jump', name: 'jump up' } // beacuse we can ;)
        },
        { type: 'idle', name: 'doing nothing' }
      ]
    };
    let introspector: Introspector;

    beforeEach(() => {
      introspector = new Introspector();
      bTree.reset();
      bTree.setBlackboard(blackboard);
      bTree.registerNode(
        'walk',
        new Task({
          run: function (blackboard) {
            blackboard.walking = true;
            return SUCCESS;
          }
        })
      );
      bTree.registerNode(
        'idle',
        new Task({
          run: function (blackboard) {
            blackboard.walking = false;
            return SUCCESS;
          }
        })
      );
      bTree.registerNode(
        'jump',
        new Task({
          run: function (blackboard) {
            blackboard.timesJumped++;
            return SUCCESS;
          }
        })
      );

      const nodeLookup = (name: string) => bTree.nodeRegistry.get(name);
      bTree.setTree(importer.parse(json, nodeLookup));
    });

    it('works', () => {
      bTree.step({ introspector });

      expect(introspector.lastResult?.name).toEqual('the root');

      const selectorNodes = introspector.lastResult?.children || [];

      expect(selectorNodes.length).toEqual(2);
      expect(selectorNodes.map((x: IntrospectionResult) => x.name)).toEqual(['handling enemies', 'jumping around']);
      expect(selectorNodes.map((x) => x.result)).toEqual([false, true]);
    });

    it('passes in the config as it is supposed to', () => {
      bTree.step({ introspector });
      bTree.step({ introspector });
      let selectorNodes = introspector.lastResult?.children || [];
      expect(selectorNodes.map((x) => x.result)).toEqual([false, false, true]);

      clock.tick(999);
      bTree.step({ introspector });

      selectorNodes = introspector.lastResult?.children || [];
      expect(selectorNodes.map((x) => x.result)).toEqual([false, false, true]);

      clock.tick(1);
      bTree.step({ introspector });

      selectorNodes = introspector.lastResult?.children || [];
      expect(selectorNodes.map((x) => x.result)).toEqual([false, true]);
    });
  });

  describe('task with start/run/end/abort callbacks defined as actions via registerAction', () => {
    const json = {
      type: 'task',
      name: 'actionTask',
      start: 'onStart',
      run: 'doRun',
      end: 'onEnd',
      abort: 'onAbort'
    };

    it('invokes start, run, and end callbacks when task runs to completion', () => {
      const startSpy = sinon.spy();
      const runSpy = sinon.spy(() => SUCCESS);
      const endSpy = sinon.spy();
      const abortSpy = sinon.spy();

      bTree.reset();
      bTree.setBlackboard(blackboard);
      bTree.registerAction('onStart', startSpy);
      bTree.registerAction('doRun', runSpy);
      bTree.registerAction('onEnd', endSpy);
      bTree.registerAction('onAbort', abortSpy);

      const nodeLookup = (name: string) => bTree.nodeRegistry.get(name);
      bTree.setTree(importer.parse(json, nodeLookup));

      bTree.step();

      expect(startSpy.calledOnce).toBe(true);
      expect(startSpy.calledWith(blackboard)).toBe(true);
      expect(runSpy.calledOnce).toBe(true);
      expect(runSpy.firstCall.args).toContainEqual(blackboard);
      expect(endSpy.calledOnce).toBe(true);
      expect(endSpy.calledWith(blackboard)).toBe(true);
      expect(abortSpy.called).toBe(false);
    });

    it('invokes abort callback when task is aborted', () => {
      const startSpy = sinon.spy();
      const runSpy = sinon.spy(() => FAILURE);
      const endSpy = sinon.spy();
      const abortSpy = sinon.spy();

      bTree.reset();
      bTree.setBlackboard(blackboard);
      bTree.registerAction('onStart', startSpy);
      bTree.registerAction('doRun', runSpy);
      bTree.registerAction('onEnd', endSpy);
      bTree.registerAction('onAbort', abortSpy);

      const nodeLookup = (name: string) => bTree.nodeRegistry.get(name);
      const taskNode = importer.parse(json, nodeLookup);
      bTree.setTree(taskNode);

      const registryLookUp = <T>(el: T | string): T => {
        try {
          return bTree.actionRegistry.get(el as string) as T;
        } catch {
          return bTree.nodeRegistry.get(el as import('./types').NodeOrRegistration) as T;
        }
      };

      bTree.step();
      (taskNode as import('./Node').default).abort(blackboard, { registryLookUp });

      expect(abortSpy.calledOnce).toBe(true);
      expect(abortSpy.calledWith(blackboard)).toBe(true);
    });
  });

  describe('importing a wait decorator with configuration', () => {
    const json = {
      type: 'wait',
      name: 'waiting',
      awaitFor: 1,
      node: { type: 'wait_task', name: 'idling' }
    };

    it('imports the wait decorator with the correct configuration', () => {
      const nodeLookup = (name: string) => bTree.nodeRegistry.get(name);
      const waitNode = importer.parse(json, nodeLookup);
      expect((waitNode as WaitDecorator).config.awaitFor).toBe(1);
    });
  });

  describe('importing a wait decorator with registered task node', () => {
    const json = {
      type: 'wait',
      name: 'waiting',
      awaitFor: 1,
      node: { type: 'wait_task', name: 'waiting' }
    };

    it('imports the wait decorator with the correct configuration', () => {
      const nodeLookup = (name: string) => bTree.nodeRegistry.get(name);
      const waitNode = importer.parse(json, nodeLookup);
      expect((waitNode as WaitDecorator).config.awaitFor).toBe(1);
    });
  });
});
