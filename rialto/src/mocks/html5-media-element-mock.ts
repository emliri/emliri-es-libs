import {EventEmitter} from 'eventemitter3'

export default class Html5MediaElementMock {

  private ee_: EventEmitter
  private readyState_: number

  constructor() {
    this.ee_ = new EventEmitter()
    this.readyState_ = 0
  }

  addEventListener(event, handler) {
    const ee = this.ee_
    ee.on(event, handler)
  }

  removeEventListener(handler) {
    const ee = this.ee_
    ee.off(handler)
  }

  dispatchEvent(event) {
    const ee = this.ee_
    ee.emit(event)
  }

  dispatchEventAsync(event) {
    setTimeout(this.dispatchEvent.bind(this, event), 0)
  }

  get readyState() {
    return this.readyState_
  }
}
