import { FAILURE, RUNNING, SUCCESS } from '../constants';
import Task from '../Task';
import type { Blackboard } from '../types';
import { EnhancedBehaviorTree } from './EnhancedBehaviorTree';

describe('BehaviorTree', () => {
  let blackboard: Blackboard;
  let bTree: EnhancedBehaviorTree;
  describe('with the simplest tree possible', () => {
    beforeEach(() => {
      blackboard = {
        start: 0,
        run: 0,
        end: 0,
        result: RUNNING
      };
      const tree = new Task({
        start: function (blackboard) {
          ++blackboard.start;
        },
        run: function (blackboard) {
          ++blackboard.run;
          return blackboard.result;
        },
        end: function (blackboard) {
          ++blackboard.end;
        }
      });
      bTree = new EnhancedBehaviorTree({ tree, blackboard });
    });

    it('running does not call start multiple times', () => {
      bTree.step();

      expect(blackboard.start).toEqual(1);
      expect(blackboard.run).toEqual(1);
      expect(blackboard.end).toEqual(0);

      bTree.step();

      expect(blackboard.start).toEqual(1);
      expect(blackboard.run).toEqual(2);
      expect(blackboard.end).toEqual(0);

      blackboard.result = FAILURE;
      bTree.step();

      expect(blackboard.start).toEqual(1);
      expect(blackboard.run).toEqual(3);
      expect(blackboard.end).toEqual(1);

      blackboard.result = SUCCESS;
      bTree.step();

      expect(blackboard.start).toEqual(2);
      expect(blackboard.run).toEqual(4);
      expect(blackboard.end).toEqual(2);
    });
  });
});
