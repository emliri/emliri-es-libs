import {MediaSession} from '../index'

export namespace RialtoDemoApp {

  class RialtoDemoApp {

    constructor(videoElement) {

      const mediaSession = new MediaSession(videoElement,
        this. onMediaElementEventTranslatedCb_,
        this.onPlaybackStateMachineTransitionCb_);
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


