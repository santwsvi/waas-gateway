export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Invalid state transition from ${from} to ${to}`);
    this.name = 'InvalidStateTransitionError';
  }
}
