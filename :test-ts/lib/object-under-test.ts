import { TestSuiteContext } from "./test-suite";

export class ObjectUnderTest<ObjectUnderTestType> {

  static createDefaultFactory<ObjectUnderTestType>(ObjectFactory: () => ObjectUnderTestType): ObjectUnderTestFactory<ObjectUnderTest<ObjectUnderTestType>> {
    const factory = (context: TestSuiteContext) => {
      const out = new ObjectUnderTest<ObjectUnderTestType>(ObjectFactory());
      return out;
    };
    return factory;
  }

  constructor(private readonly _object: ObjectUnderTestType) {}

  get(): ObjectUnderTestType { return this._object }
}

export type ObjectUnderTestFactory<ObjectUnderTest> = (context: TestSuiteContext) => ObjectUnderTest;
