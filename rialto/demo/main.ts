import {MediaSession} from '../index'

import Vue from 'vue'

const MainTemplate = require('./main.vue.html')

export namespace RialtoDemoApp {

  class RialtoDemoApp {

    _vueApp: Vue;

    constructor(videoElement) {

      const mediaSession = new MediaSession(videoElement,
        this. onMediaElementEventTranslatedCb_,
        this.onPlaybackStateMachineTransitionCb_);

      Vue.component('main-component', {
        template: MainTemplate,
        data () {
          return {
            message: 'Hello'
          }
        }
      })

      // create a root instance
      const app = new Vue({
        el: '#app'
      })

      this._vueApp = app;
    }

    onPlaybackStateMachineTransitionCb_(mediaSession) {
      console.log('Media playback state', mediaSession.mediaPlaybackState);
    }

    onMediaElementEventTranslatedCb_(mediaSession, eventReason) {
      console.log('Media element event translated:', eventReason);
    }
  }

  export const onPageLoaded = (videoElement: HTMLVideoElement) => {
    new RialtoDemoApp(videoElement)
  }

}


