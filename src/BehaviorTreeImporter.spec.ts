/* eslint-env jest */
import sinon from 'sinon';
import BehaviorTree from './BehaviorTree';
import BehaviorTreeImporter from './BehaviorTreeImporter';
import { FAILURE, SUCCESS } from './constants';
import Decorator from './Decorator';
import Introspector from './Introspector';
import Task from './Task';
import { Blackboard, IntrospectionResult, RunCallback, type NodeOrRegistration } from './types';

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
      bTree.setTree(importer.parse(json, nodeLookup) as NodeOrRegistration);
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
});
