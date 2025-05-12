import BehaviorTree from '../BehaviorTree';
import BehaviorTreeImporter from '../BehaviorTreeImporter';
import { RUNNING, SUCCESS } from '../constants';
import Parallel from '../Parallel';
import Sequence from '../Sequence';
import Task from '../Task';
import type { Blackboard } from '../types';
import GuardDecorator, { IRQ_TYPE } from './GuardDecorator';
import WaitDecorator from './WaitDecorator';

describe('GuardWithIRQDecorator', () => {
  let bTree: BehaviorTree;
  let blackboard: Blackboard<{
    pickableAtSight: boolean;
    pickedItems: number;
    targetPosition?: { x: number; y: number };
    moveToPosition?: { x: number; y: number };
  }>;
  beforeEach(() => {
    blackboard = {
      pickableAtSight: false,
      pickedItems: 0,
      targetPosition: undefined,
      moveToPosition: undefined
    };

    BehaviorTree.register(
      'moveTo',
      new Task({
        run: function () {
          if (blackboard.moveToPosition !== undefined) {
            // moving character
          }
          // since it's async, we return RUNNING until the character reaches the target position
          return blackboard.moveToPosition !== undefined ? RUNNING : SUCCESS;
        }
        // I'm not handling currentPosition into this tree, so someone from outside with accesss to the BB should clean moveToPosition when character reaches ther targetPosition.
      })
    );

    BehaviorTree.register(
      'pick',
      new Task({
        start: function (bb) {
          // run side effect for picking action
          bb.pickedItems += 1;
        },
        run: function () {
          return true;
        }
      })
    );

    BehaviorTree.register(
      'service:setTarget',
      new Task({
        run: function (bb) {
          // find the closest pickable or use any other criteria, and calculate the target position
          if (bb.targetPosition === undefined) {
            bb.targetPosition = { x: Math.random(), y: Math.random() };
            // simulate a position based on pickable target
            bb.moveToPosition = { x: bb.targetPosition.x - 1, y: bb.targetPosition.y - 1 };
          }
          return true; // a service whould always return true to let sibling to define the result
        }
      })
    );

    BehaviorTree.register(
      'service:setRandomPosition',
      new Task({
        run: function (bb) {
          // sets a random target if needed
          if (bb.targetPosition === undefined) {
            bb.targetPosition = { x: Math.random(), y: Math.random() };
            bb.moveToPosition = bb.targetPosition;
          }
          return true; // a service whould always return true to let sibling to define the result
        }
      })
    );
    // dumb task for Wait decorator to run
    const waitingTask = new Task({
      run() {
        return SUCCESS;
      }
    });

    BehaviorTree.register('shortWait', new WaitDecorator({ config: { awaitFor: 1 }, node: waitingTask }));
    BehaviorTree.register('longWait', new WaitDecorator({ config: { awaitFor: 4 }, node: waitingTask }));

    const pickItemSequenceWithService = new Parallel({
      nodes: ['service:setTarget', new Sequence({ nodes: ['moveTo', 'pick', 'shortWait'] })]
    });

    const wanderSequenceWithService = new Parallel({
      nodes: ['service:setRandomPosition', new Sequence({ nodes: ['moveTo', 'longWait'] })]
    });

    BehaviorTree.register(
      'GuardDecorator',
      new GuardDecorator({
        node: pickItemSequenceWithService,
        config: {
          condition: (bb) => bb.pickableAtSight,
          type: IRQ_TYPE.BOTH,
          onIRQ: (bb) => {
            bb.moveToPosition = bb.targetPosition = undefined;
          }
        }
      })
    );
    BehaviorTree.register('wander', wanderSequenceWithService);
    BehaviorTree.register('pickItem', pickItemSequenceWithService);

    const jsonTree = {
      type: 'selector',
      name: 'the root',
      nodes: [
        {
          type: 'GuardDecorator',
          name: 'IRQ'
        },
        {
          type: 'wander',
          name: 'Wander'
        }
      ]
    };
    const importer = new BehaviorTreeImporter();

    bTree = new BehaviorTree({ tree: importer.parse(jsonTree), blackboard });
  });
  it('breaks on lost condition', () => {
    // initial condition to enter PICK ITEM branch
    blackboard.pickableAtSight = true;
    bTree.step();
    expect(bTree.lastResult).toMatchObject({
      state: [
        // pick item
        {
          state: [
            true, // set target position
            {
              state: [RUNNING] // moveTo
            }
          ]
        }
      ]
    });

    // break condition while running PICK ITEM branch, should abort and run WANDER branch
    blackboard.pickableAtSight = false;
    bTree.step();
    expect(bTree.lastResult).toMatchObject({
      state: [
        false, // pick item
        {
          state: [
            true, // set random position
            {
              state: [RUNNING] // moveTo
            }
          ]
        }
      ]
    });
  });

  it('catches in low priority nodes', () => {
    // initial condition to enter WANDERING branch
    blackboard.pickableAtSight = false;
    bTree.step();
    expect(bTree.lastResult).toMatchObject({
      state: [
        false, // pick item
        {
          state: [
            true, // set random position
            {
              state: [RUNNING] // moveTo
            }
          ]
        }
      ]
    });

    // break condition while running WANDERING branch, should catch and run PICK ITEM branch
    blackboard.pickableAtSight = true;
    bTree.step();
    expect(bTree.lastResult).toMatchObject({
      state: [
        // pick item
        {
          state: [
            true, // set target position
            {
              state: [RUNNING] // moveTo
            }
          ]
        }
      ]
    });
  });
});
