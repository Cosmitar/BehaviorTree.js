## Effects
this goes straight to BT semantics, not tooling.

### Why “on SUCCESS” is the default

Because in BTs:

- `SUCCESS` = the action achieved its intent

- `FAILURE` = the intent was not achieved

Effects usually represent **facts that became true because the action worked**.

Example:
```
RiseFromGround → hasSpawned = true
```

If it failed, that fact is false.

That’s why `SUCCESS` is the safe default.

----

### But what if I do need effects on failure?

That’s valid — just be explicit.

#### Pattern: Outcome-scoped effects

Instead of a single END:

- OnSuccess

- OnFailure

- (optionally) OnAbort (pending)

Each is declarative and explicit.

Example:
```
Action: TrySpawn
OnSuccess:
  hasSpawned = true
OnFailure:
  spawnFailed = true
```

Now the meaning is crystal clear.

----

#### Should you use Invert for this? ❌

No.

`Invert` is a control-flow decorator, not a semantic one.

Using it to trigger effects:

- hides intent

- couples logic to tree shape

- breaks readability

Inversion answers:

> “How should this node be interpreted?”

Not:

> “What facts changed?”

----

### Clean mental model

- **Decorators** → *when / whether a node runs*

- **Actions** → *what is attempted*

- **Effects** → *what changed because of the outcome*

Effects are about facts, not flow.

----

### TL;DR

- `END` callbacks are too coarse

- `SUCCESS` is the safe default for effects

- Failure effects are valid, but must be explicit

- Don’t abuse Invert for state mutation

- Prefer **outcome-scoped** declarative effects