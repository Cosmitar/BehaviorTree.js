/* eslint-disable @typescript-eslint/no-explicit-any */
import Introspector from './Introspector';
import Node from './Node';

export type Status = symbol | boolean;
export type RunResult = Status | StatusWithState | undefined | void;

export interface StatusWithState {
  total: Status;
  state: Array<RunResult>;
}
export interface Registry<T> {
  register(name: string, value: T): void;
  get(ElementOrRegistration: string | T): T;
  clear(): void;
}

export type Blackboard<T extends Record<string, any> = Record<string, any>> = T;
export type DecoratorConfig = Record<string, any>;
export type EndCallback = (...args: any[]) => void;
export type RunCallback = (...args: any[]) => RunResult;
export type StartCallback = (...args: any[]) => void;
export type AbortCallback = (...args: any[]) => void;
export type VoidCallback = StartCallback | EndCallback | AbortCallback;
export type NodeRegistry = Record<string, Node>;
export type CallbackRegistry = Record<string, RunCallback | VoidCallback>;
export type RegistryLookUp<T extends Node | RunCallback | VoidCallback> = (
  node: NodeOrFunctionOrRegistration,
  type?: 'node' | 'action'
) => T;

export interface IntrospectionResult {
  name?: string;
  result: Status | RunResult;
  children?: IntrospectionResult[];
}

export type NodeOrRegistration = Node | string;
export type NodeOrFunction = Node | RunCallback | VoidCallback;
export type FunctionOrRegistration = RunCallback | VoidCallback | string;
export type NodeOrFunctionOrRegistration = Node | RunCallback | VoidCallback | string;

export interface MinimalBlueprint {
  name?: string;
  end?: FunctionOrRegistration;
  abort?: FunctionOrRegistration;
  introspector?: Introspector;
  run?: FunctionOrRegistration;
  start?: FunctionOrRegistration;
  nodes?: NodeOrRegistration[];
  node?: NodeOrRegistration;
  config?: DecoratorConfig;
  registryLookUp?: RegistryLookUp<RunCallback | VoidCallback>;
}
export interface Blueprint {
  name?: string;
  end: EndCallback;
  abort: AbortCallback;
  introspector?: Introspector;
  run: RunCallback;
  start: StartCallback;
  nodes?: NodeOrRegistration[];
  node?: NodeOrRegistration;
}

export interface DecoratorBlueprint extends MinimalBlueprint {
  config?: DecoratorConfig;
}

export interface ActivableDecorator extends DecoratorBlueprint {
  shouldActivate?(lastRun: RunResult, bb: Blackboard): boolean;
}

export interface RunConfig {
  introspector?: Introspector;
  registryLookUp?: <T extends NodeOrFunction>(element: T | string) => T;
  rerun?: boolean;
  lastRun?: RunResult;
}

export interface ParallelRunConfig extends RunConfig {
  lastRun?: RunResult | undefined;
}

export interface StepParameter {
  introspector?: Introspector;
}

export interface ImportableJson {
  type: string;
  name?: string;
  node?: ImportableJson;
  nodes?: ImportableJson[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow additional properties like decorator configs.
}
