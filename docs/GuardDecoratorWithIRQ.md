# GuardDecorator rules:
- default validator evals to truthy value the control key.
- when runs, if condition is tre, run node.
- when runs, if condition is false, do not run node.
- when runs node, saves node result as last result and returns it.
- when doesn't run node, return last stored result or FAILURE.

## Interruption ruls (should activate)
- when deco last run is running, the running leaf node is a descendant of the deco.
- when deco last run is not running, the running leaf node is a low priority node, descendant of a sibling of the deco.
- IRQ CATCH should interrupt low priority nodes.
- IRQ BREAK should interrupt self branch nodes.
- IRQ BOTH should interrupt self and low priority nodes.
- IRQ NONE should never interrupt.
- if running node is descendant and condition is not met and IRQ type is BREAK or BOTH, shoud interrupt.
- if running node is low priority and condition is met and IRQ type is CATCH or BOTH, should interrupt.
- if any of the 2 upper conditions are not met, return false (do not interrupt)

