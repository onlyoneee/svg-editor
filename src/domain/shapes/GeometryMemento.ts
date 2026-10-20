export class GeometryMemento {
  public constructor(private readonly restoreAction: () => void) {}

  public restore(): void {
    this.restoreAction();
  }
}
