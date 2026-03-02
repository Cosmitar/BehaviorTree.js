import { RUNNING } from './constants';
import { RunResult, type NodeOrFunction } from './types';

export function isRunning(result: RunResult | undefined): boolean {
  return result === RUNNING || (typeof result === 'object' && result.total === RUNNING);
}

export function identityLookUp<T extends NodeOrFunction>(x: string | T): T {
  return x as T;
}
