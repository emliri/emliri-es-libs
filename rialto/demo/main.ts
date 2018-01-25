import {
  MediaSession,
  MediaSegmentQueue,
  MediaSegment,
  MediaLocator,
  PlaybackStateMachine,
  PlaybackStateMachineTransitionReasons,
  PlaybackStates,
  getLogger
} from '../index'

import Vue from 'vue'

const {
  log
} = getLogger('demo/main')

const BOOTSWATCH_THEME_NAME = "Yeti";

require('../node_modules/bootswatch/dist/' + BOOTSWATCH_THEME_NAME.toLowerCase() + '/bootstrap')

require('./style')

const MainTemplate = require('./main.vue')
const SessionHistoryTemplate = require('./session-history.vue')
const SessionHistoryItemTemplate = require('./session-history-item.vue')
const SessionClockTemplate = require('./session-clock.vue')

export namespace RialtoDemoApp {

  class RialtoDemoApp {

    static declareVueComponents(app: RialtoDemoApp, domRootId: string): Vue {

      Vue.component('main-component', {
        template: MainTemplate,
        data () {
          return {
            // message: 'Hello'
          }
        }
      })

      Vue.component('session-clock', {
        template: SessionClockTemplate,
        data () {
          return app.mediaSession.sessionClockData
        }
      })

      Vue.component('session-history', {
        template: SessionHistoryTemplate,
        data () {
          return {
            sessionHistoryData: app.mediaSession.sessionHistoryData
          }
        },
      })

      Vue.component('session-history-item', {
        props: ['item'],
        template: SessionHistoryItemTemplate
      })

      // create a root component instance
      const vueApp = new Vue({
        el: '#' + domRootId
      })

      return vueApp
    }

    private _vueApp: Vue;
    private _mediaSession: MediaSession

    constructor(videoElement: HTMLMediaElement) {

      const mediaSession = new MediaSession(videoElement,
        this.onMediaElementEventTranslatedCb_.bind(this),
        this.onPlaybackStateMachineTransitionCb_.bind(this));

      this._mediaSession = mediaSession

      this._vueApp = RialtoDemoApp.declareVueComponents(this, 'app')

    }

    get mediaSession() {
      return this._mediaSession
    }

    onPlaybackStateMachineTransitionCb_(mediaSession: MediaSession,
        reason: PlaybackStateMachineTransitionReasons) {

      //
    }

    onMediaElementEventTranslatedCb_(mediaSession, eventReason) {
      //
    }
  }

  export const onPageLoaded = (videoElement: HTMLVideoElement) => {
    new RialtoDemoApp(videoElement)
  }

  export const runMediaSegmentQueueExample = () => {
    const locator = new MediaLocator('v-0360p-0550k-vp9.webm')
    const badLocator = new MediaLocator('v-0360p-0550k-vp9.webm__')

    const queue = new MediaSegmentQueue()

    queue.
      add(new MediaSegment(locator)).
      add(new MediaSegment(locator)).
      add(new MediaSegment(locator)).
      add(new MediaSegment(badLocator)).
      add(new MediaSegment(locator))

    queue.on('fetch-next:done', (mediaSegment) => {
      log('done:', mediaSegment)
    })

    queue.on('fetch-next:error', (mediaSegment) => {
      log('error:', mediaSegment)
    })

    queue.fetchAll()
  }
}


