import {
  MediaSession,
  PlaybackStateMachine,
  PlaybackStateMachineTransitionReasons,
  PlaybackStates
} from '../index'

import Vue from 'vue'

const BOOTSWATCH_THEME_NAME = "Yeti";

require('../node_modules/bootswatch/dist/' + BOOTSWATCH_THEME_NAME.toLowerCase() + '/bootstrap')

require('./style')

const MainTemplate = require('./main.vue')
const SessionHistoryTemplate = require('./session-history.vue')
const SessionHistoryItemTemplate = require('./session-history-item.vue')
const SessionClockTemplate = require('./session-clock.vue')

type StateChangeHistoryItem = {
  state: string,
  reason: string,
  logText: string,
  time: Date
}

export namespace RialtoDemoApp {

  class RialtoDemoApp {

    static declareVueComponents(app: RialtoDemoApp): Vue {

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
          return app.sessionClockData
        }
      })

      Vue.component('session-history', {
        template: SessionHistoryTemplate,
        data () {
          return {
            sessionHistoryData: app.sessionHistoryData
          }
        },
      })

      Vue.component('session-history-item', {
        props: ['item'],
        template: SessionHistoryItemTemplate
      })

      // create a root instance
      const vueApp = new Vue({
        el: '#app'
      })

      return vueApp
    }

    private _vueApp: Vue;

    private _previousState: string
    private _currentState: string

    private _stateChangeHistory: StateChangeHistoryItem[]
    private _eventHistory: string[]

    private _sessionClockData: any

    constructor(videoElement: HTMLMediaElement) {

      const mediaSession = new MediaSession(videoElement,
        this.onMediaElementEventTranslatedCb_.bind(this),
        this.onPlaybackStateMachineTransitionCb_.bind(this));

      this._eventHistory = []

      this._stateChangeHistory = []

      this._sessionClockData = {
        time: 0,
        frame: 0,
        updateEventCount: 0
      }

      this._vueApp = RialtoDemoApp.declareVueComponents(this)
    }

    get sessionHistoryData() {
      return this._stateChangeHistory;
    }

    get sessionClockData() {
      return this._sessionClockData;
    }

    onPlaybackStateMachineTransitionCb_(mediaSession: MediaSession,
        reason: PlaybackStateMachineTransitionReasons) {

      const state = mediaSession.mediaPlaybackState

      this._previousState = this._currentState
      this._currentState = state;

      const previousStateChangeHistoryItem = this._stateChangeHistory[this._stateChangeHistory.length - 1]
      // only add to history if it's actually something new
      if (previousStateChangeHistoryItem &&
        previousStateChangeHistoryItem.state === state &&
        previousStateChangeHistoryItem.reason === reason
      ) {
        return;
      }

      console.log('Media playback state', state, 'reason:', reason);

      const time = new Date()
      const timeString = `${time.toLocaleTimeString()} + ${time.getMilliseconds()}`
      const logText = `[${timeString}] | New state: ${state}, transition reason: ${reason}`

      const item = {
        time,
        state,
        reason,
        logText
      }

      this._stateChangeHistory.push(item)
    }

    onMediaElementEventTranslatedCb_(mediaSession, eventReason) {
      if (eventReason === PlaybackStateMachineTransitionReasons.MEDIA_CLOCK_UPDATE) {
        this.sessionClockData.time = mediaSession.mediaElement.currentTime
      } else {
        console.log('Media element event translated:', eventReason);
        this._eventHistory.push(eventReason)
      }
    }
  }

  export const onPageLoaded = (videoElement: HTMLVideoElement) => {
    new RialtoDemoApp(videoElement)
  }

}


