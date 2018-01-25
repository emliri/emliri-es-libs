
// TODO: Move to Objec-TS long-term

const stringProtoPadEnd = import('string.prototype.padend')

export abstract class Polyfill {
  static install() { throw new Error('Abstract polyfill, implement install method') }

  static get collection(): (typeof Polyfill)[] {
    return [
      PlayReturnsPromisePolyfill,
      StringPadEndPolyfill,
      ArrayLastPolyfill
    ]
  }

  static installCollection() {
    Polyfill.collection.forEach((polyfill) => polyfill.install())
  }
}

export class ArrayLastPolyfill extends Polyfill {
  static install() {
    Array.prototype['last'] = function() {
      return this[this.length - 1]
    }
    /*
    Array.prototype['last'] = function() {
      // more expensive but funny
      return this.slice().reverse()[0]
    }
    */
  }
}

export class StringPadEndPolyfill extends Polyfill {
  static install() {
    String.prototype['padEnd'] = String.prototype['padEnd']  ? String.prototype['padEnd']  : stringProtoPadEnd
  }
}

export class PlayReturnsPromisePolyfill extends Polyfill {
  static install() {

    // DOM ?
    if (!window || !window.document) {
      return
    }

    /**
     * All modern browsers except Edge return a promise from audio/video
     * elements play() method.
     */
    const playReturnsNoPromise = !window.document.createElement('video').play()

    if (playReturnsNoPromise) {
      const originalPlay = HTMLMediaElement.prototype.play

      HTMLMediaElement.prototype.play = function () {
        return new Promise((resolve, reject) => {
          once(this, 'playing', resolve)
          once(this, 'error', reject)
          originalPlay.apply(this, arguments)
        })
      }
    }

    // Register an event handler that is only invoked once
    function once (target, event, listener) {
      function wrappedListener () {
        target.removeEventListener(event, wrappedListener)
        listener.apply(this, arguments)
      }
      target.addEventListener(event, wrappedListener)
    }
  }
}


