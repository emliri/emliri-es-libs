import {PlaybackStateMachine, PlaybackStateMachineTransitionReasons} from './playback-state-machine'

const EventReasons = PlaybackStateMachineTransitionReasons

export type MediaElement = HTMLMediaElement

export type MediaEventHandler = () => void

export class MediaElementObserver {

  private mediaEl_: MediaElement;

  private eventTranslatorCallback_: (eventReason: string) => void;

  private mediaElEventHandlers_: MediaEventHandler[];
  private mediaElEventsRegistered_: string[];

  get mediaEl(): MediaElement {
    return this.mediaEl_
  }

  get hasMedia(): boolean {
    return !! this.mediaEl_
  }

  constructor(eventTranslatorCallback) {
    this.resetMedia()

    if (!eventTranslatorCallback) {
      throw new Error('Observer needs an eventTranslatorCallback argument')
    }

    this.eventTranslatorCallback_ = eventTranslatorCallback
  }

  resetMedia() {
    this.mediaEl_ = null // HTMLMediaElement
    this.mediaElEventHandlers_ = []
  }

  attachMedia(mediaElement: MediaElement) {

    if(this.hasMedia) {
      throw new Error('Media element already attached to observer, need to detach first')
    }

    this.mediaEl_ = mediaElement

    this.registerMediaElement()
  }

  detachMedia() {
    if(!this.hasMedia) {
      throw new Error('No media element already attached to observer, cant detach')
    }

    this.unregisterMediaElement()
    this.resetMedia()
  }

  replaceMedia(mediaElement: MediaElement) {
    this.detachMedia()
    this.attachMedia(mediaElement)
  }

  registerMediaElement() {

    const mediaEl = this.mediaEl
    const onEventTranslated = this.onEventTranslated_.bind(this)

    this.listenToMediaElementEvent('readystatechange', () => {

      /*
        HAVE_NOTHING	0	No information is available about the media resource.
        HAVE_METADATA	1	Enough of the media resource has been retrieved that the metadata attributes are initialized. Seeking will no longer raise an exception.
        HAVE_CURRENT_DATA	2	Data is available for the current playback position, but not enough to actually play more than one frame.
        HAVE_FUTURE_DATA	3	Data for the current playback position as well as for at least a little bit of time into the future is available (in other words, at least two frames of video, for example).
        HAVE_ENOUGH_DATA	4	Enough data is available—and the download rate is high enough—that the media can be played through to the end without interruption.

      */

      switch(mediaEl.readyState) {
        case 0:
          onEventTranslated(EventReasons.MEDIA_ENGINE_INIT)
          break
        case 1:
          onEventTranslated(EventReasons.MEDIA_LOADING_PROGRESS)
          onEventTranslated(EventReasons.MEDIA_DURATION_CHANGE)
          break
        case 2:
          onEventTranslated(EventReasons.MEDIA_LOADING_PROGRESS)
          break
        case 3:
          onEventTranslated(EventReasons.MEDIA_LOADING_PROGRESS)
          break
        case 4:
          onEventTranslated(EventReasons.MEDIA_LOADING_PROGRESS)
          break
      }
    })

    this.listenToMediaElementEvent('loadedmetadata', () => {
      onEventTranslated(EventReasons.MEDIA_ENGINE_INIT)
      onEventTranslated(EventReasons.MEDIA_LOADING_PROGRESS)
    })

    this.listenToMediaElementEvent('loadeddata', () => {
      //onEventTranslated(EventReasons.MEDIA_ENGINE_INIT);
      onEventTranslated(EventReasons.MEDIA_LOADING_PROGRESS)
    })

    // We need the PLAY event to indicate the intent to play
    // NOTE: use TIMECHANGED event on 'playing' and trigger PLAY as intended in states.dot graph

    this.listenToMediaElementEvent('play', () => {
      if (mediaEl.autoplay) {
        onEventTranslated(EventReasons.MEDIA_AUTO_PLAY)
      } else {
        onEventTranslated(EventReasons.MEDIA_MANUAL_PLAY)
      }
    })

    this.listenToMediaElementEvent('pause', () => {
      onEventTranslated(EventReasons.MEDIA_PAUSE)
    })

    this.listenToMediaElementEvent('playing', () => {
      onEventTranslated(EventReasons.MEDIA_LOADING_PROGRESS)
    })

    this.listenToMediaElementEvent('error', () => {
      onEventTranslated(EventReasons.MEDIA_ERROR)
    })

    this.listenToMediaElementEvent('seeking', () => {
      onEventTranslated(EventReasons.MEDIA_SEEK)
    })

    this.listenToMediaElementEvent('seeked', () => {
      onEventTranslated(EventReasons.MEDIA_LOADING_PROGRESS)
    })

    this.listenToMediaElementEvent('timeupdate', () => {
      onEventTranslated(EventReasons.MEDIA_CLOCK_UPDATE)
    })

    this.listenToMediaElementEvent('durationchange', () => {
      onEventTranslated(EventReasons.MEDIA_DURATION_CHANGE)
    })

    this.listenToMediaElementEvent('ended', () => {
      onEventTranslated(EventReasons.MEDIA_END)
    })

    // The waiting event is fired when playback has stopped because of a temporary lack of data.
    // See https://developer.mozilla.org/en-US/docs/Web/Events/waiting
    this.listenToMediaElementEvent('waiting', () => {
      onEventTranslated(EventReasons.MEDIA_BUFFER_UNDERRUN)
    })

    // The stalled event is fired when the user agent is trying to fetch media data,
    // but data is unexpectedly not forthcoming.
    // https://developer.mozilla.org/en-US/docs/Web/Events/stalled
    this.listenToMediaElementEvent('stalled', () => {

      // this event doesn't indicate buffering by definition (interupted playback),
      // only that data throughput to playout buffers is not as high as expected
      // It happens on Chrome every once in a while as SourceBuffer's are not fed
      // as fast as the underlying native player may prefer (but it does not lead to
      // interuption).

    })

  }

  /**
   * Should only be calld when a mediaEl is attached
   */
  unregisterMediaElement(): void {
    if (!this.mediaEl) {
      throw new Error('No media attached')
    }

    this.mediaElEventHandlers_.forEach((handler, index) => {
      const eventName = this.mediaElEventsRegistered_[index]
      this.mediaEl.removeEventListener(eventName, handler)
    })
  }

  /**
  * Should only be calld when a mediaEl is attached
  */
  listenToMediaElementEvent(event: string, handler: MediaEventHandler) {
    if (!this.mediaEl) {
      throw new Error('No media attached')
    }

    const boundHandler = handler.bind(this)

    this.mediaElEventHandlers_.push(boundHandler)
    this.mediaEl.addEventListener(event, boundHandler, false)
  }

  private onEventTranslated_(eventReason) {
    this.eventTranslatorCallback_(eventReason)
  }
}
