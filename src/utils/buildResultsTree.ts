import { registryLookUp } from '../BehaviorTree';
import type Node from '../Node';
import type { NodeOrRegistration, RunResult, Status, StatusWithState } from '../types';

export function buildResultsTree(targetNode: Node, xTree: NodeOrRegistration, lastResult: RunResult, nextStatus: Status): RunResult {
  const tree = registryLookUp(xTree);

  let nodeFound = false;
  function traverseAndBuild(nodes: NodeOrRegistration[] | undefined, lastState: RunResult[] = []): RunResult[] {
    if (!nodes) return [];

    const results: RunResult[] = [];

    for (let index = 0; index < nodes.length; index++) {
      const xNode = nodes[index];
      const node = registryLookUp(xNode);

      // Initialize the result node based on lastState
      const defaultResult = lastState[index];
      const resultNode: RunResult = typeof defaultResult === 'object' ? { ...defaultResult } : defaultResult;

      // If the current node matches the targetNode, add the runningSymbol and break
      if (node === targetNode) {
        results.push(nextStatus);
        nodeFound = true;
        break;
      }

      // If the node has child nodes, process them recursively
      if (node.blueprint.nodes && Array.isArray(node.blueprint.nodes) && typeof resultNode === 'object') {
        (resultNode as StatusWithState).state = traverseAndBuild(
          node.blueprint.nodes as Node[],
          (resultNode as StatusWithState).state || []
        );
      }

      results.push(resultNode);
    }

    return results;
  }

  // Build the results tree starting with the root node's children
  const result =
    typeof lastResult === 'object'
      ? {
          total: lastResult.total,
          state: traverseAndBuild(tree.blueprint.nodes, lastResult.state)
        }
      : lastResult;

  // if targetNode wasn't found, the interrupter has lower priority then result doesn't change.
  if (!nodeFound) return lastResult;

  return result;
}
