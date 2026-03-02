### The clean pattern (BT + ECS)
- **BT Action**: expresses intent
→ “I need a spawn point”

- **AI Controller**: forwards the request

- **ECS System**: computes the spawn point

- **AI Controller**: writes result to BB

```
BT Action
 → AI Controller
   → SpawnPointSystem (ECS)
     → AI Controller
       → Blackboard
```

### Key rules (to keep it clean)

- BT nodes **never query ECS directly**
- ECS systems **don’t know about BTs**

- AI Controller is the **only bridge**

- ECS systems are **stateless / pure** if possible

### Randomness

- Put randomness **inside the ECS system**

- Optional: seed per-entity for determinism

- No globals needed

### Pros

- UI stays engine-agnostic

- BT stays declarative

- ECS does world math (where it belongs)

#### Rule of thumb:

**BT** = *what I need*

**ECS** = *how the world works*

**AI Controller** = *translator*