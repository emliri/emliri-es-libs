import {TestSuite, declareTestSuite} from '../lib/test-suite';
import { ObjectUnderTest } from '../lib/object-under-test';

class Foo {}

class FakeInteractor {}

const context = {};

const actions = [];

TestSuite.declare<ObjectUnderTest<Foo>, FakeInteractor>("Foo", , context, actions);
