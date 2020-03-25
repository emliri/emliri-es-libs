import { TestAction } from "./test-action";

import { ObjectUnderTestFactory, ObjectUnderTest } from "./object-under-test";

export type TestSuiteContext = Partial<{}>

export function declareTestSuite<ObjectUnderTestType, InteractorType>(
  description: string,
  factory: ObjectUnderTestFactory<ObjectUnderTest<ObjectUnderTestType>>,
  context: TestSuiteContext,
  actions: TestAction<ObjectUnderTest<ObjectUnderTestType>, InteractorType>[]
  ): TestSuite<ObjectUnderTest<ObjectUnderTestType>, InteractorType> {
  return TestSuite.declare(description, factory, context, actions);
}

export class TestSuite<ObjectUnderTest, InteractorType> {

  static declare<ObjectUnderTest, InteractorType>(

    description: string,
    factory: ObjectUnderTestFactory<ObjectUnderTest>,
    context: TestSuiteContext,
    actions: TestAction<ObjectUnderTest, InteractorType>[]

    ): TestSuite<ObjectUnderTest, InteractorType> {

    const suite = new TestSuite<ObjectUnderTest, InteractorType>(description, factory, context);
    actions.forEach(suite.addAction, suite);
    return suite;
  }

  private _actions: TestAction<ObjectUnderTest, InteractorType>[] = []
  private _nextRunIndex: number = 0;

  private constructor(
    public readonly description: string,
    private _factory: ObjectUnderTestFactory<ObjectUnderTest>,
    private readonly context: TestSuiteContext) {}

  addAction(action: TestAction<ObjectUnderTest, InteractorType>) {
    this._actions.push(action);
  }

  run() {
    const action = this._actions[this._nextRunIndex++];
    action.perform(this._factory, this.context).then(() => {
      this.run();
    }).catch((err) => {
      console.warn('Error while performing action, aborting suite run');
      console.error(err);
      this._nextRunIndex = 0;
    });
  }

}
