import { ObjectUnderTestFactory } from "./object-under-test";
import { TestSuiteContext } from "./test-suite";

export type Interaction<ObjectUnderTestType, InteractorType>
  = (interactor: InteractorType, object: ObjectUnderTestType, done: () => void) => void;

export type TestActionValidator<ObjectUnderTestType> = (object: ObjectUnderTestType) => void;

export class TestAction<ObjectUnderTest, InteractorType> {

  private _hasPerformed: boolean = false;
  private _errorOnPerformed: Error = null;
  private _objectUnderTest: ObjectUnderTest = null;

  constructor(
    private readonly _interactor: InteractorType,
    private readonly _interaction: Interaction<InteractorType, ObjectUnderTest>,
    private readonly _validator: TestActionValidator<ObjectUnderTest>,
  ) {}

  hasPerformed(): boolean { return this._hasPerformed; }

  errorOnPerformed(): Error { return this._errorOnPerformed; }

  perform(factory: ObjectUnderTestFactory<ObjectUnderTest>,
    context: TestSuiteContext): Promise<void> {

    const objectUnderTest = this._objectUnderTest = factory(context);

    if (this._hasPerformed) {
      throw new Error('Action already performed');
    }
    return new Promise((resolve, reject) => {
      this._hasPerformed = true;
      try {
        this._interaction(objectUnderTest, this._interactor, resolve);
      } catch(err) {
        this._errorOnPerformed = err;
        console.error('Fatal: Error performing action:', err);
        reject(err);
      }
    });
  }

  validate(): Error | true {
    try {
      this._validator(this._objectUnderTest);
      return true;
    } catch(err) {
      return err;
    }
  }


}
