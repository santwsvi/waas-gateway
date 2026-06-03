export abstract class Entity<T> {
  protected readonly _id: string;
  protected props: T;

  protected constructor(props: T, id?: string) {
    this._id = id ?? crypto.randomUUID();
    this.props = props;
  }

  get id(): string {
    return this._id;
  }

  equals(other: Entity<T>): boolean {
    if (other === null || other === undefined) return false;
    if (!(other instanceof Entity)) return false;
    return this._id === other._id;
  }
}
