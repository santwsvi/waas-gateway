# ADR-006: GoF State Pattern with TypeScript Classes

| Field       | Value                |
|-------------|----------------------|
| **Status**  | Accepted             |
| **Date**    | 2026-06-03           |
| **Authors** | Victor Gabriel       |

## Context

Two central entities in the WaaS Gateway have state machines with transitions, guards and side-effects:

### Channel States

```
CREATED → CONNECTING → CONNECTED → DISCONNECTING → DISCONNECTED
                ↓                         ↓
              FAILED ←───────────────── FAILED
```

- `CONNECTING → CONNECTED`: side-effect → emits `ChannelConnectedEvent`
- `CONNECTING → FAILED`: guard → max retries exceeded
- `CONNECTED → DISCONNECTING`: guard → no pending messages

### Message States

```
QUEUED → SENDING → SENT → DELIVERED → READ
            ↓
          FAILED → QUEUED (retry)
```

- `QUEUED → SENDING`: guard → channel must be `CONNECTED`
- `SENDING → FAILED`: side-effect → increments retry count, emits `MessageFailedEvent`
- `FAILED → QUEUED`: guard → retry count < max retries

### Requirements

1. **Invalid transitions must be rejected at runtime** — `channel.connect()` when status is `DISCONNECTING` must throw an error.
2. **Conditional guards** — transitions depend on internal state (retry count, pending messages).
3. **Side-effects coupled to the transition** — domain events must be emitted at the exact moment of transition, not externally.
4. **Individual testability** — each state and its transitions must be testable in isolation.
5. **OCP for new states** — adding a state (e.g., `PAUSED`) should not alter existing states.

## Decision

Implement the **GoF State Pattern** with concrete TypeScript classes per state, implementing `IChannelState` / `IMessageState` interfaces.

### Structure

```typescript
// domain/entities/channel/states/channel-state.interface.ts
interface IChannelState {
  readonly name: ChannelStatus;
  connect(channel: Channel): IChannelState;
  disconnect(channel: Channel): IChannelState;
  fail(channel: Channel, reason: string): IChannelState;
}

// domain/entities/channel/states/created.state.ts
class CreatedState implements IChannelState {
  readonly name = ChannelStatus.CREATED;

  connect(channel: Channel): IChannelState {
    channel.addDomainEvent(new ChannelConnectingEvent(channel.id));
    return new ConnectingState();
  }

  disconnect(_channel: Channel): IChannelState {
    throw new InvalidStateTransitionError(this.name, 'disconnect');
  }

  fail(_channel: Channel, _reason: string): IChannelState {
    throw new InvalidStateTransitionError(this.name, 'fail');
  }
}

// domain/entities/channel/states/connecting.state.ts
class ConnectingState implements IChannelState {
  readonly name = ChannelStatus.CONNECTING;

  connect(channel: Channel): IChannelState {
    // Guard: connection confirmed by provider
    channel.addDomainEvent(new ChannelConnectedEvent(channel.id));
    return new ConnectedState();
  }

  disconnect(_channel: Channel): IChannelState {
    throw new InvalidStateTransitionError(this.name, 'disconnect');
  }

  fail(channel: Channel, reason: string): IChannelState {
    channel.addDomainEvent(new ChannelFailedEvent(channel.id, reason));
    return new FailedState();
  }
}
```

### Usage in the Entity

```typescript
class Channel extends AggregateRoot {
  private state: IChannelState;

  constructor(props: ChannelProps) {
    super();
    this.state = ChannelStateFactory.fromStatus(props.status);
  }

  get status(): ChannelStatus {
    return this.state.name;
  }

  connect(): void {
    this.state = this.state.connect(this);
  }

  disconnect(): void {
    this.state = this.state.disconnect(this);
  }

  fail(reason: string): void {
    this.state = this.state.fail(this, reason);
  }
}
```

### Hydration (serialization/deserialization)

```typescript
class ChannelStateFactory {
  private static readonly states: Record<ChannelStatus, () => IChannelState> = {
    [ChannelStatus.CREATED]: () => new CreatedState(),
    [ChannelStatus.CONNECTING]: () => new ConnectingState(),
    [ChannelStatus.CONNECTED]: () => new ConnectedState(),
    [ChannelStatus.DISCONNECTING]: () => new DisconnectingState(),
    [ChannelStatus.DISCONNECTED]: () => new DisconnectedState(),
    [ChannelStatus.FAILED]: () => new FailedState(),
  };

  static fromStatus(status: ChannelStatus): IChannelState {
    const factory = this.states[status];
    if (!factory) throw new UnknownChannelStatusError(status);
    return factory();
  }
}
```

## Consequences

### Positive

- **Compile-time + runtime safety**: the `IChannelState` interface forces each state to explicitly declare what happens on each transition. If the method throws `InvalidStateTransitionError`, the transition is forbidden. If it returns a new state, it is allowed.
- **OCP for new states**: adding `PausedState` means creating a new class that implements `IChannelState`, registering it in the factory, and defining transitions from/to existing states that need to know about it. Existing states are not altered unless they need to transition to the new one.
- **Side-effects co-located with the transition**: domain events are emitted inside the transition method, not in an external orchestrator. Impossible to forget emitting the event — it is in the same place as the transition logic.
- **Granular testability**: each state is a pure class, testable in isolation. `new ConnectingState().connect(mockChannel)` returns `ConnectedState` and emits the correct event. No infrastructure needed.
- **Clear debugging**: `channel.status` returns the current state name. The stack trace of an invalid transition shows exactly which state rejected which action.

### Negative

- **More classes**: ~5-6 classes per state machine (CreatedState, ConnectingState, ConnectedState, DisconnectingState, DisconnectedState, FailedState). For 2 state machines (Channel + Message), that's ~10-12 classes. It is real overhead, but each class is small (< 30 lines) and single-responsibility.
- **Serialization requires hydration**: the database stores `status: 'CONNECTED'` as a string/enum. When loading the entity, the factory reconstructs the state object. It is an extra step in the mapper, but it is explicit and testable.
- **Transitions between existing states when adding a new state**: if `PausedState` needs to be reachable from `ConnectedState`, then `ConnectedState` needs to be altered to add the `pause()` method. This is a partial OCP violation, but unavoidable in any state machine representation — the graph needs to be updated.

## Alternatives Rejected

### Enum + switch/if-else

```typescript
// Anti-pattern
class Channel {
  transition(action: string): void {
    switch (this.status) {
      case 'CREATED':
        if (action === 'connect') this.status = 'CONNECTING';
        else throw new Error('Invalid');
        break;
      case 'CONNECTING':
        // ... more cases
    }
  }
}
```

- **Pros**: simple, familiar, few files.
- **Cons**: SRP violated — all transition logic for all states lives in a single switch. Guards and side-effects are scattered in if/else within cases. Adding a state requires altering the switch (OCP violated). No type safety — `action: string` accepts anything.
- **Rejected because**: does not scale with the complexity of WaaS state machines. With guards, side-effects and 5+ states, the switch becomes an unmanageable block.

### XState

- **Pros**: mature state machine library, graphical visualization, support for hierarchical/parallel states, interpreter with side-effects.
- **Cons**: heavy dependency (~40KB) for state machines with <10 states. Declarative API (JSON-like config) is powerful but opaque for debugging. Integration with DDD (domain events, aggregate invariants) is not native — requires adaptation. Learning overhead for contributors unfamiliar with the library.
- **Rejected because**: XState shines in complex state machines (UI, workflows with dozens of states). For <10 states with simple side-effects (emitting domain events), the GoF State Pattern is more direct, lighter and more aligned with the domain's OO paradigm.

### Data-driven transition table

```typescript
const transitions = {
  CREATED: { connect: 'CONNECTING' },
  CONNECTING: { success: 'CONNECTED', fail: 'FAILED' },
  // ...
};
```

- **Pros**: declarative, easy to visualize the full graph, configurable.
- **Cons**: loses type safety — transitions are strings. Guards and side-effects need to be external functions referenced by name, hard to type and test. Debugging requires tracing the table + the guard/side-effect functions. Errors at runtime, not compile-time.
- **Rejected because**: the type safety and side-effect co-location trade-off is unfavorable. The State Pattern keeps everything typed and co-located.
