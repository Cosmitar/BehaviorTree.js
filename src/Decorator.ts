import { RUNNING } from './constants';
import { identityLookUp } from './helper';
import Node from './Node';
import { Blackboard, DecoratorBlueprint, DecoratorConfig, RunCallback, RunConfig, type ActivableDecorator } from './types';

export default class Decorator extends Node implements ActivableDecorator {
  config!: DecoratorConfig;
  nodeType = 'Decorator';

  constructor({ config = {}, ...props }: DecoratorBlueprint = { config: {} }) {
    super(props);
    this.setConfig(config);
  }

  decorate(run: RunCallback, blackboard: Blackboard, config: DecoratorConfig) {
    // This method should be overridden to make it useful
    return run(run, blackboard, config);
  }

  run(blackboard: Blackboard, { introspector, rerun, registryLookUp = identityLookUp, ...config }: RunConfig = {}) {
    if (!rerun) this.blueprint.start(blackboard);
    let runCount = 0;
    const result = this.decorate(
      () => {
        ++runCount;
        return registryLookUp(this.blueprint.node as Node).run(blackboard, {
          ...config,
          rerun,
          introspector,
          registryLookUp
        });
      },
      blackboard,
      { ...this.config, rerun }
    );

    if (result !== RUNNING) {
      this.blueprint.end(blackboard);
    }
    if (introspector) {
      introspector.wrapLast(runCount, this, result, blackboard);
    }
    return result;
  }

  setConfig(config: DecoratorConfig) {
    this.config = config;
  }

  abort(blackboard: Blackboard, { lastRun, registryLookUp = identityLookUp }: RunConfig = {}) {
    const child = registryLookUp(this.blueprint.node as Node);
    child.abort(blackboard, { registryLookUp, lastRun });
  }
}
