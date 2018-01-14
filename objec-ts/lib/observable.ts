import {EventEmitter} from 'eventemitter3'

export type ObservablesMap = Map<symbol, ObservablesMapEntry>

export type ObservablesMapEntry = {
  key: ObservableType,
  events: symbol[]
}

const observablesMap: ObservablesMap = new Map()

export type EventCallbackFunction = (event: symbol, obs: Observable) => void

export class ObservableType {
  id: symbol
  constructor(name?: string) {
    this.id = Symbol(name)
  }
}

export abstract class Observable extends EventEmitter {

  private type_: ObservableType

  constructor(typeKey: ObservableType) {
    super()
    this.type_ = typeKey
  }

  emit(event: symbol): boolean {
    if (!Observable.hasEventSymbol(this.type, event)) {
      throw new Error('Observable does not fire event requested to emit')
    }

    return super.emit(event, this)
  }

  on(event: symbol | string, fn: EventCallbackFunction): this {
    if (typeof event === 'string') {
      throw new Error('Symbol type is enforced to identify events')
    }

    if (!Observable.hasEventSymbol(this.type, event)) {
      throw new Error('Observable does not fire event requested to listen on')
    }

    super.on(event, (arg0) => {
      fn(event, arg0)
    })
    return this;
  }

  get type(): ObservableType {
    return this.type_
  }

  static registerEventSymbol(key: ObservableType, event: string | symbol) {

    let entry: ObservablesMapEntry = observablesMap.get(key.id)

    let eventSymbol;
    if (typeof event === 'string') {
      eventSymbol = Symbol(event)
    } else if (typeof event === 'symbol') {
      eventSymbol = event
    }

    if (!entry) {
      entry = {
        key,
        events: []
      }
    }

    // update entry
    entry.events.push(eventSymbol)
    observablesMap.set(key.id, entry)
  }

  static getEventSymbols(type: ObservableType): symbol[] {
    const entry = observablesMap.get(type.id)

    if (entry) {
      return entry.events
    } else {
      return []
    }
  }

  static hasEventSymbol(type: ObservableType, event: symbol) {
    const entry = observablesMap.get(type.id)

    return entry.events.indexOf(event) !== -1
  }

}
