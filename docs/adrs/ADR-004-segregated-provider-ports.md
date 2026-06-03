# ADR-004: Segregated Provider Ports (Interface Segregation Principle)

| Field       | Value                |
|-------------|----------------------|
| **Status**  | Accepted             |
| **Date**    | 2026-06-03           |
| **Authors** | Victor Gabriel       |

## Context

The initial WaaS Gateway design defined a single `IMessagingProvider` interface with 8+ methods:

```typescript
interface IMessagingProvider {
  connect(channelId: string): Promise<void>;
  disconnect(channelId: string): Promise<void>;
  getQrCode(channelId: string): Promise<string>;
  sendText(to: string, text: string): Promise<SendResult>;
  sendMedia(to: string, media: Media): Promise<SendResult>;
  sendTemplate(to: string, template: Template): Promise<SendResult>;
  onMessage(handler: MessageHandler): void;
  onStatusChange(handler: StatusHandler): void;
  // ... more methods
}
```

The problem appeared when modeling real providers:

| Capability          | Baileys | Meta Cloud API | Twilio |
|---------------------|---------|----------------|--------|
| connect/disconnect  | ✅       | ❌ (webhook)    | ❌      |
| getQrCode           | ✅       | ❌              | ❌      |
| sendText            | ✅       | ✅              | ✅      |
| sendMedia           | ✅       | ✅              | ✅      |
| onMessage (push)    | ✅       | ✅ (webhook)    | ✅      |
| onStatusChange      | ✅       | ✅              | ❌      |

**Twilio has no QR code nor connect/disconnect.** Meta Cloud API has no local lifecycle. Forcing these providers to implement the full `IMessagingProvider` leads to:

- `throw new NotImplementedError()` in unsupported methods — violates LSP (Liskov Substitution Principle).
- Consumers that depend on methods that will never be called — violates ISP (Interface Segregation Principle).
- Tests with mocks that need to stub irrelevant methods.

## Decision

Segregate `IMessagingProvider` into **3 cohesive interfaces**, each representing a distinct capability:

```typescript
// Port: Lifecycle management (connect, disconnect, QR pairing)
interface IProviderLifecycle {
  connect(channelId: string): Promise<void>;
  disconnect(channelId: string): Promise<void>;
  getQrCode(channelId: string): Promise<string>;
  isConnected(channelId: string): Promise<boolean>;
}

// Port: Message sending
interface IMessageSender {
  sendText(params: SendTextParams): Promise<SendResult>;
  sendMedia(params: SendMediaParams): Promise<SendResult>;
  sendTemplate(params: SendTemplateParams): Promise<SendResult>;
}

// Port: Inbound event source
interface IProviderEventSource {
  onMessage(handler: InboundMessageHandler): void;
  onStatusChange(handler: StatusChangeHandler): void;
  onConnectionUpdate(handler: ConnectionUpdateHandler): void;
}
```

### Provider Mapping

| Interface              | Baileys | Meta Cloud API | Twilio |
|------------------------|---------|----------------|--------|
| `IProviderLifecycle`   | ✅       | ❌              | ❌      |
| `IMessageSender`       | ✅       | ✅              | ✅      |
| `IProviderEventSource` | ✅       | ✅ (webhook)    | ✅ (webhook) |

### DI Registration

Each interface is a separate injection token in NestJS:

```typescript
// provider.module.ts
{
  provide: 'IProviderLifecycle',
  useClass: BaileysLifecycleAdapter,
},
{
  provide: 'IMessageSender',
  useFactory: (config) => resolveByProviderType(config),
},
{
  provide: 'IProviderEventSource',
  useClass: BaileysEventSourceAdapter,
}
```

Use cases depend only on the port they consume:

```typescript
class SendMessageUseCase {
  constructor(
    @Inject('IMessageSender') private sender: IMessageSender,
  ) {}
}
```

## Consequences

### Positive

- **ISP respected**: each consumer depends only on the interface it uses. `SendMessageUseCase` doesn't know that `IProviderLifecycle` exists.
- **LSP preserved**: Twilio implements `IMessageSender` and `IProviderEventSource`, but is never forced to implement `IProviderLifecycle`. No `NotImplementedError`.
- **Partial adapters possible**: a new provider that only supports sending implements only `IMessageSender`.
- **Smaller mocks**: tests for `SendMessageUseCase` mock only `IMessageSender` — 3 methods, not 8+.
- **Extensibility via composition**: if a new capability emerges (e.g., `IMediaDownloader`), it is a new interface without altering existing ones — OCP.

### Negative

- **One adapter, multiple interfaces**: `BaileysAdapter` implements all 3 interfaces. Internally it can delegate to sub-classes, but the main class carries 3 implementation responsibilities.
- **3 DI tokens**: the provider module registers 3 bindings instead of 1. More configuration in the module, but it is explicit and verifiable.
- **Capability discovery**: to know what a provider supports, one must check which interfaces it implements. Solved with a `ProviderCapabilityRegistry` that maps provider → supported interfaces.

## Alternatives Rejected

### Single god interface (IMessagingProvider)

- **Pros**: simple, one DI token, one mock.
- **Cons**: ISP and LSP violated. Adapters forced to implement unsupported methods. Consumers coupled to capabilities they don't use.
- **Rejected because**: the original design — this is exactly the problem that motivated this ADR.

### 2 interfaces (IProviderConnection + IProviderMessaging)

- **Pros**: fewer interfaces than 3, simpler.
- **Cons**: arbitrary grouping. `IProviderMessaging` would mix sending and event sourcing — two distinct concerns with different consumers. The sending use case doesn't need `onMessage`.
- **Rejected because**: segregation into 2 doesn't actually solve the problem — it still groups distinct concerns.

### Micro-interfaces (1 method per interface)

- **Pros**: maximum segregation, total flexibility.
- **Cons**: 8+ interfaces, 8+ DI tokens, 8+ mocks. Excessive granularity hinders system comprehension. Methods that are cohesive (sendText, sendMedia, sendTemplate) are artificially separated.
- **Rejected because**: over-segregation. The 3 methods of `IMessageSender` are cohesive — always used together by the same consumer. Segregating them individually violates the cohesion principle.
