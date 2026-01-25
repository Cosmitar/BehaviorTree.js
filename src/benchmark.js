/**
 * Just a small benchmarking script, just for the sake of it.
 *
 * Run with `npx babel-node src/benchmark.js`
 *
 * My last run:
 * without introspection x 4,221,914 ops/sec ±0.54% (99 runs sampled)
 * with introspection x 1,066,265 ops/sec ±27.80% (72 runs sampled)
 * task without introspection x 18,541,936 ops/sec ±0.76% (96 runs sampled)
 * task with introspection x 2,540,779 ops/sec ±48.66% (68 runs sampled)
 * Fastest is task without introspection
 */
const Benchmark = require('benchmark');

const { SUCCESS, BehaviorTree, Sequence, Task, Introspector, Decorator } = require('../lib/index.js');

const suite = new Benchmark.Suite();

const task1 = new Task({
  start: function (blackboard) {
    ++blackboard.start1;
  },
  end: function (blackboard) {
    ++blackboard.end1;
  },
  run: function (blackboard) {
    ++blackboard.run1;
    return SUCCESS;
  }
});
const task2 = new Task({
  start: function (blackboard) {
    ++blackboard.start2;
  },
  end: function (blackboard) {
    ++blackboard.end2;
  },
  run: function (blackboard) {
    ++blackboard.run2;
    return blackboard.task2Result;
  }
});
const task3 = new Task({
  start: function (blackboard) {
    ++blackboard.start3;
  },
  end: function (blackboard) {
    ++blackboard.end3;
  },
  run: function (blackboard) {
    ++blackboard.run3;
    return SUCCESS;
  }
});

const decoratedTask2 = new Decorator({
  start: function (blackboard) {
    ++blackboard.startDeco;
  },
  end: function (blackboard) {
    ++blackboard.endDeco;
  },
  node: task2
});

const sequence = new Sequence({
  start: function (blackboard) {
    ++blackboard.startSeq;
  },
  end: function (blackboard) {
    ++blackboard.endSeq;
  },
  nodes: [task1, decoratedTask2, task3]
});
const blackboard = {
  task2Result: SUCCESS,
  start1: 0,
  run1: 0,
  end1: 0,
  start2: 0,
  run2: 0,
  end2: 0,
  start3: 0,
  run3: 0,
  end3: 0,
  startSeq: 0,
  endSeq: 0,
  startDeco: 0,
  endDeco: 0
};

const bTree = new BehaviorTree({ tree: sequence, blackboard });
const introspector = new Introspector();

const taskTree = new BehaviorTree({ tree: task1, blackboard });

// add tests
suite
  .add('without introspection', function () {
    bTree.step();
  })
  .add('with introspection', function () {
    bTree.step({ introspector });
  })

  .add('task without introspection', function () {
    taskTree.step();
  })
  .add('task with introspection', function () {
    taskTree.step({ introspector });
  })
  // add listeners
  .on('cycle', function (event) {
    console.log(String(event.target));
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  // run async
  .run({ async: true });
