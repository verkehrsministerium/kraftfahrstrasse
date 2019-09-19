export class Deferred<T> {
  public promise: Promise<T>;
  private resolveInternal?: (v: T) => void;
  private rejectInternal?: (reason?: any) => void;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolveInternal = resolve;
      this.rejectInternal = reject;
    });
  }

  public resolve(v: T) {
    this.resolveInternal!(v);
  }
  public reject(err?: any) {
    this.rejectInternal!(err);
  }

}
