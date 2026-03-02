// RUN as a test with `pnpm run test -- ./examples/PickOrWanderExample.spec.ts`

import BehaviorTree, {
  BehaviorTreeImporter,
  Parallel,
  RUNNING,
  Sequence,
  SUCCESS,
  Task,
  type Blackboard,
  type NodeOrRegistration
} from '../src';
import GuardDecorator from '../src/decorators/GuardDecorator';
import WaitDecorator from '../src/decorators/WaitDecorator';

describe('GuardWithIRQDecorator', () => {
  const bTree = new BehaviorTree();
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

    bTree.reset();
    bTree.setBlackboard(blackboard);
    bTree.registerNode(
      'moveTo',
      new Task({
        start: function () {
          // log('starting moveTo');
        },
        run: function () {
          if (blackboard.moveToPosition !== undefined) {
            // log('moving character');
          }
          // since it's async, we return RUNNING until the character reaches the target position
          return blackboard.moveToPosition !== undefined ? RUNNING : SUCCESS;
        }
        // I'm not handling currentPosition into this tree, thus someone from outside with accesss to the BB should clean moveToPosition when character reaches ther targetPosition.
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
        start: function () {
          // log('start setting target position');
        },
        run: function (bb) {
          // find the closest pickable or use any other criteria, and calculate the target position
          if (bb.targetPosition === undefined) {
            bb.targetPosition = { x: Math.random(), y: Math.random() };
            bb.moveToPosition = { x: bb.targetPosition.x - 1, y: bb.targetPosition.y - 1 };
          }
          return true; // a service whould always return true to let sibling to define the result
        }
      })
    );
    bTree.registerNode(
      'service:setRandomPosition',
      new Task({
        start: function () {
          // log('setting random position');
        },
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
    const waitingTask = new Task({
      start: function () {
        // log('waiting task starts');
      },
      end: function () {
        // log('waiting task ends');
      }
    });

    bTree.registerNode('shortWait', new WaitDecorator({ config: { awaitFor: 1 }, node: waitingTask }));
    bTree.registerNode('longWait', new WaitDecorator({ config: { awaitFor: 4 }, node: waitingTask }));

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
          condition: (bb) => bb.pickableAtSight,
          type: GuardDecorator.IRQ_TYPE.BOTH,
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
        {
          type: 'GuardDecorator',
          name: 'GuardToPickItem'
        },
        {
          type: 'wander',
          name: 'Wander'
        }
      ]
    };
    const importer = new BehaviorTreeImporter();
    const nodeLookup = (name: string) => bTree.nodeRegistry.get(name);
    bTree.setTree(importer.parse(jsonTree, nodeLookup) as NodeOrRegistration);
  });

  it('test', () => {
    blackboard.pickableAtSight = false;
    // since pickableAtSight is false, the tree should run the wander sequence
    bTree.step();

    //  suppose that now we have a pickable at sight
    blackboard.pickableAtSight = true;
    bTree.step();
  });
});
