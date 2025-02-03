import type { Blackboard } from '../types';

// boolean
export const isSet = (key: string) => (bb: Blackboard) => bb[key] !== null && bb[key] !== undefined;
export const isEqual = (key: string, value: unknown) => (bb: Blackboard) => bb[key] === value;
export const isTrue = (key: string) => (bb: Blackboard) => bb[key] === true;
// numeric
export const isGT = (key: string, value: number) => (bb: Blackboard) => bb[key] > value;
export const isLT = (key: string, value: number) => (bb: Blackboard) => bb[key] < value;
