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

      Vue.component('session-history', {
        template: SessionHistoryTemplate,
        data () {
          return app.sessionHistoryData
        },
      })

      Vue.component('session-history-item', {
        props: ['history'],
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
    private _lastEventReason: string

    private _stateChangeHistory: object[]
    private _eventHistory: string[]

    sessionHistoryData: any

    constructor(videoElement: HTMLMediaElement) {

      const mediaSession = new MediaSession(videoElement,
        this.onMediaElementEventTranslatedCb_.bind(this),
        this.onPlaybackStateMachineTransitionCb_.bind(this));

      const stateChangeHistory = this._stateChangeHistory

      this._eventHistory = []
      this._stateChangeHistory = []

      this.sessionHistoryData = {
        sessionHistory: []
      }

      this._vueApp = RialtoDemoApp.declareVueComponents(this)
    }

    onPlaybackStateMachineTransitionCb_(mediaSession) {
      console.log('Media playback state', mediaSession.mediaPlaybackState);

      if (this._currentState) {
        this._previousState = this._currentState
      }

      this._currentState = mediaSession.mediaPlaybackState

      const item = {
        state: mediaSession.mediaPlaybackState,
        reason: this._lastEventReason
      }

      this._stateChangeHistory.push(item)

      if (item.reason !== PlaybackStateMachineTransitionReasons.MEDIA_CLOCK_UPDATE) {
        this.sessionHistoryData.sessionHistory.push({
          text: `New state: ${item.state}, transition reason: ${item.reason}`
        })
      }

    }

    onMediaElementEventTranslatedCb_(mediaSession, eventReason) {
      console.log('Media element event translated:', eventReason);

      this._eventHistory.push(eventReason)
      this._lastEventReason = eventReason
    }
  }

  export const onPageLoaded = (videoElement: HTMLVideoElement) => {
    new RialtoDemoApp(videoElement)
  }

}


