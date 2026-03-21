declare global {
  interface Array<T> {
    map<U>(
      this: [T, ...T[]],
      callbackfn: (value: T, index: number, array: [T, ...T[]]) => U,
      thisArg?: unknown,
    ): [U, ...U[]];
  }
}

export {};
