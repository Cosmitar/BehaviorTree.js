import BehaviorTree from '../BehaviorTree';
import BehaviorTreeImporter from '../BehaviorTreeImporter';
import { RUNNING, SUCCESS } from '../constants';
import Parallel from '../Parallel';
import Sequence from '../Sequence';
import Task from '../Task';
import type { Blackboard, NodeOrRegistration } from '../types';
import GuardDecorator from './GuardDecorator';
import WaitDecorator from './WaitDecorator';

type IRQType = (typeof GuardDecorator.IRQ_TYPE)[keyof typeof GuardDecorator.IRQ_TYPE];

function createTreeWithConfig(blackboard: Blackboard, bTree: BehaviorTree, irqType: IRQType) {
  const pickItemSequenceWithService = new Parallel({
    nodes: ['service:setTarget', new Sequence({ nodes: ['moveTo', 'pick', 'shortWait'] })]
  });

  const wanderSequenceWithService = new Parallel({
    nodes: ['service:setRandomPosition', new Sequence({ nodes: ['moveTo', 'longWait'] })]
  });

  bTree.registerNode(
    'GuardDecorator',
    new GuardDecorator({
      node: pickItemSequenceWithService,
      config: {
        controlKey: 'pickableAtSight',
        IRQType: irqType,
        onIRQ: (bb) => {
          bb.moveToPosition = bb.targetPosition = undefined;
        }
      }
    })
  );
  bTree.registerNode('wander', wanderSequenceWithService);
  bTree.registerNode('pickItem', pickItemSequenceWithService);

  const jsonTree = {
    type: 'selector',
    name: 'the root',
    nodes: [
      { type: 'GuardDecorator', name: 'IRQ' },
      { type: 'wander', name: 'Wander' }
    ]
  };
  const importer = new BehaviorTreeImporter();
  const nodeLookup = (name: string) => bTree.nodeRegistry.get(name);
  bTree.setTree(importer.parse(jsonTree, nodeLookup) as NodeOrRegistration);
}

describe('GuardWithIRQDecorator', () => {
  const bTree = new BehaviorTree();
  let blackboard: Blackboard<{
    pickableAtSight: boolean;
    pickedItems: number;
    targetPosition?: { x: number; y: number };
    moveToPosition?: { x: number; y: number };
    moveToAbortCount?: number;
  }>;

  beforeEach(() => {
    blackboard = {
      pickableAtSight: false,
      pickedItems: 0,
      targetPosition: undefined,
      moveToPosition: undefined
    };

    bTree.reset();
    bTree.setBlackboard(blackboard);
    bTree.registerNode(
      'moveTo',
      new Task({
        run: function () {
          if (blackboard.moveToPosition !== undefined) {
            // moving character
          }
          // since it's async, we return RUNNING until the character reaches the target position
          return blackboard.moveToPosition !== undefined ? RUNNING : SUCCESS;
        },
        abort: (bb) => {
          bb.moveToAbortCount = (bb.moveToAbortCount || 0) + 1;
        }
        // I'm not handling currentPosition into this tree, so someone from outside with accesss to the BB should clean moveToPosition when character reaches ther targetPosition.
      })
    );
    bTree.registerNode(
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
    bTree.registerNode(
      'service:setTarget',
      new Task({
        run: function (bb) {
          // find the closest pickable or any other criteria, and calculate the target position
          if (bb.targetPosition === undefined) {
            bb.targetPosition = { x: Math.random(), y: Math.random() };
            // simulate a position based on pickable target
            bb.moveToPosition = { x: bb.targetPosition.x - 1, y: bb.targetPosition.y - 1 };
          }
          return true; // a service whould always return true to let sibling to define the result
        }
      })
    );
    bTree.registerNode(
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
    const waitingTask = new Task({});
    bTree.registerNode('shortWait', new WaitDecorator({ config: { awaitFor: 1 }, node: waitingTask }));
    bTree.registerNode('longWait', new WaitDecorator({ config: { awaitFor: 4 }, node: waitingTask }));

    createTreeWithConfig(blackboard, bTree, GuardDecorator.IRQ_TYPE.BOTH);
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

  it('calls abort on the leaf (moveTo) when breaking', () => {
    blackboard.pickableAtSight = true;
    bTree.step();
    expect(blackboard.moveToAbortCount).toBeUndefined();

    blackboard.pickableAtSight = false;
    bTree.step();
    expect(blackboard.moveToAbortCount).toBe(1);
  });

  it('calls abort on the leaf (moveTo) when catching', () => {
    blackboard.pickableAtSight = false;
    bTree.step();
    expect(blackboard.moveToAbortCount).toBeUndefined();

    blackboard.pickableAtSight = true;
    bTree.step();
    expect(blackboard.moveToAbortCount).toBe(1);
  });

  describe('IRQ_TYPE.BREAK only', () => {
    beforeEach(() => {
      createTreeWithConfig(blackboard, bTree, GuardDecorator.IRQ_TYPE.BREAK);
    });

    it('breaks when condition is lost while running guarded branch', () => {
      blackboard.pickableAtSight = true;
      bTree.step();
      expect(bTree.lastResult).toMatchObject({ state: [expect.any(Object)] });

      blackboard.pickableAtSight = false;
      bTree.step();
      expect(bTree.lastResult).toMatchObject({
        state: [
          false, // pick item aborted
          { state: [true, { state: [RUNNING] }] } // wander running
        ]
      });
    });

    it('does NOT catch when condition is gained while running low-priority branch', () => {
      blackboard.pickableAtSight = false;
      bTree.step();
      expect(bTree.lastResult).toMatchObject({ state: [false, expect.any(Object)] });

      blackboard.pickableAtSight = true;
      bTree.step();
      // With BREAK only, shouldActivate returns false for CATCH - wander keeps running
      expect(bTree.lastResult).toMatchObject({
        state: [
          false, // pick item still skipped
          { state: [true, { state: [RUNNING] }] } // wander still running
        ]
      });
    });
  });

  describe('IRQ_TYPE.CATCH only', () => {
    beforeEach(() => {
      createTreeWithConfig(blackboard, bTree, GuardDecorator.IRQ_TYPE.CATCH);
    });

    it('catches when condition is gained while running low-priority branch', () => {
      blackboard.pickableAtSight = false;
      bTree.step();
      expect(bTree.lastResult).toMatchObject({ state: [false, expect.any(Object)] });

      blackboard.pickableAtSight = true;
      bTree.step();
      expect(bTree.lastResult).toMatchObject({
        state: [
          {
            state: [true, { state: [RUNNING] }]
          }
        ]
      });
    });

    it('does NOT break when condition is lost while running guarded branch', () => {
      blackboard.pickableAtSight = true;
      bTree.step();
      expect(bTree.lastResult).toMatchObject({ state: [expect.any(Object)] });

      blackboard.pickableAtSight = false;
      bTree.step();
      // With CATCH only, shouldActivate returns false for BREAK - no abort called on leaf
      expect(blackboard.moveToAbortCount).toBeUndefined();
      // GuardDecorator returns FAILURE when condition false, so selector runs wander
      expect(bTree.lastResult).toMatchObject({
        state: [false, { state: [true, { state: [RUNNING] }] }]
      });
    });
  });

  describe('IRQ_TYPE.NONE', () => {
    beforeEach(() => {
      createTreeWithConfig(blackboard, bTree, GuardDecorator.IRQ_TYPE.NONE);
    });

    it('does NOT break when condition is lost while running guarded branch', () => {
      blackboard.pickableAtSight = true;
      bTree.step();
      expect(bTree.lastResult).toMatchObject({ state: [expect.any(Object)] });

      blackboard.pickableAtSight = false;
      bTree.step();
      expect(blackboard.moveToAbortCount).toBeUndefined();
      expect(bTree.lastResult).toMatchObject({
        state: [false, { state: [true, { state: [RUNNING] }] }]
      });
    });

    it('does NOT catch when condition is gained while running low-priority branch', () => {
      blackboard.pickableAtSight = false;
      bTree.step();
      expect(bTree.lastResult).toMatchObject({ state: [false, expect.any(Object)] });

      blackboard.pickableAtSight = true;
      bTree.step();
      expect(bTree.lastResult).toMatchObject({
        state: [
          false,
          { state: [true, { state: [RUNNING] }] }
        ]
      });
    });
  });
});
