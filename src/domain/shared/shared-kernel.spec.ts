import { Entity } from '@domain/shared/entity.js';
import { ValueObject } from '@domain/shared/value-object.js';
import { AggregateRoot } from '@domain/shared/aggregate-root.js';
import { DomainEvent } from '@domain/shared/domain-event.js';

// Concrete test doubles
class TestEntity extends Entity<{ name: string }> {
  static create(name: string, id?: string): TestEntity {
    return new TestEntity({ name }, id);
  }
  get name(): string {
    return this.props.name;
  }
}

class TestValueObject extends ValueObject<{ value: string }> {
  static create(value: string): TestValueObject {
    return new TestValueObject({ value });
  }
  get value(): string {
    return this.props.value;
  }
}

class TestEvent extends DomainEvent {
  readonly eventType = 'TestEvent';
  constructor(aggregateId: string) {
    super(aggregateId);
  }
}

class TestAggregate extends AggregateRoot<{ name: string }> {
  static create(name: string, id?: string): TestAggregate {
    const agg = new TestAggregate({ name }, id);
    agg.addDomainEvent(new TestEvent(agg.id));
    return agg;
  }
  get name(): string {
    return this.props.name;
  }
  emitEvent(event: DomainEvent): void {
    this.addDomainEvent(event);
  }
}

describe('Entity', () => {
  it('should generate a UUID when no id is provided', () => {
    const entity = TestEntity.create('test');
    expect(entity.id).toBeDefined();
    expect(entity.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('should use the provided id', () => {
    const entity = TestEntity.create('test', 'custom-id');
    expect(entity.id).toBe('custom-id');
  });

  it('should consider two entities with the same id as equal', () => {
    const a = TestEntity.create('Alice', 'same-id');
    const b = TestEntity.create('Bob', 'same-id');
    expect(a.equals(b)).toBe(true);
  });

  it('should consider two entities with different ids as not equal', () => {
    const a = TestEntity.create('Alice', 'id-1');
    const b = TestEntity.create('Alice', 'id-2');
    expect(a.equals(b)).toBe(false);
  });

  it('should return false when comparing with null or undefined', () => {
    const entity = TestEntity.create('test');
    expect(entity.equals(null as unknown as TestEntity)).toBe(false);
    expect(entity.equals(undefined as unknown as TestEntity)).toBe(false);
  });
});

describe('ValueObject', () => {
  it('should consider two VOs with the same value as equal', () => {
    const a = TestValueObject.create('hello');
    const b = TestValueObject.create('hello');
    expect(a.equals(b)).toBe(true);
  });

  it('should consider two VOs with different values as not equal', () => {
    const a = TestValueObject.create('hello');
    const b = TestValueObject.create('world');
    expect(a.equals(b)).toBe(false);
  });

  it('should freeze props to prevent mutation', () => {
    const vo = TestValueObject.create('immutable');
    expect(() => {
      (vo as unknown as { props: { value: string } }).props.value = 'mutated';
    }).toThrow();
  });
});

describe('AggregateRoot', () => {
  it('should record domain events on creation', () => {
    const agg = TestAggregate.create('test');
    expect(agg.domainEvents).toHaveLength(1);
    expect(agg.domainEvents[0]).toBeInstanceOf(TestEvent);
  });

  it('should clear events and return them', () => {
    const agg = TestAggregate.create('test');
    const events = agg.clearEvents();
    expect(events).toHaveLength(1);
    expect(agg.domainEvents).toHaveLength(0);
  });

  it('should accumulate multiple domain events', () => {
    const agg = TestAggregate.create('test');
    agg.emitEvent(new TestEvent(agg.id));
    agg.emitEvent(new TestEvent(agg.id));
    expect(agg.domainEvents).toHaveLength(3);
  });

  it('should return a copy of domain events, not the internal array', () => {
    const agg = TestAggregate.create('test');
    const events = agg.domainEvents;
    expect(events).not.toBe(agg.domainEvents);
  });
});

describe('DomainEvent', () => {
  it('should generate a unique eventId', () => {
    const event = new TestEvent('agg-1');
    expect(event.eventId).toBeDefined();
    expect(event.eventId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('should record the aggregateId', () => {
    const event = new TestEvent('agg-42');
    expect(event.aggregateId).toBe('agg-42');
  });

  it('should set occurredAt to approximately now', () => {
    const before = new Date();
    const event = new TestEvent('agg-1');
    const after = new Date();
    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should expose the eventType from the concrete class', () => {
    const event = new TestEvent('agg-1');
    expect(event.eventType).toBe('TestEvent');
  });
});
