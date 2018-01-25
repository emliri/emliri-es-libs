import {PlaybackStateMachine, PlaybackStateMachineTransitionReasons} from './playback-state-machine'

const MAX_POLLING_FPS = 60

export const MediaEventReasons = PlaybackStateMachineTransitionReasons

export type MediaElement = HTMLMediaElement

export type MediaEventHandler = () => void

export type MediaEventTranslationCallback = (eventReason: string) => void

/**
 *
 * MediaElementObserver takes a callback as argument during construction.
 *
 * Every event of media-element is thus "translated" to a single event all handled
 * through this callback. The latter is being called with a value from the `MediaEventReasons`
 * enum, which is always identical with the `PlaybackStateMachineTransitionReasons`.
 *
 * Every callback from the media-observer is therefore a potential transition cause for the playback state-machine.
 *
 * @constructor
 */
export class MediaElementObserver {

  private mediaEl_: MediaElement;

  private eventTranslatorCallback_: MediaEventTranslationCallback;

  private mediaElEventHandlers_: MediaEventHandler[];
  private mediaElEventsRegistered_: string[];
  private pollingInterval_: number;
  private pollingFps_: number;
  private previousMediaTime_: number;
  private previousEventReason_: string;

  get mediaEl(): MediaElement {
    return this.mediaEl_
  }

  get hasMedia(): boolean {
    return !! this.mediaEl_
  }

  /**
   * @constructs
   * @param eventTranslatorCallback
   * @param pollingFps How many frames-per-second to aim for at polling to update state
   */
  constructor(eventTranslatorCallback, pollingFps?: number) {
    this.resetMedia()

    if (!eventTranslatorCallback) {
      throw new Error('Observer needs an eventTranslatorCallback argument')
    }

    this.eventTranslatorCallback_ = eventTranslatorCallback

    this.pollingFps_ = pollingFps;

    this.setPollingFps(pollingFps)
  }

  /**
   * @param pollingFps How many frames-per-second to aim for at polling to update state (pass NaN or 0 to unset)
   */
  setPollingFps(pollingFps: number) {
    clearInterval(this.pollingInterval_)
    if (pollingFps > MAX_POLLING_FPS) {
      throw new Error(`Clock-polling FPS can not be larger than ${MAX_POLLING_FPS} but requested ${pollingFps}`)
    }
    if (typeof pollingFps === 'number' && pollingFps > 0) {
      const intervalMs = 1000 / pollingFps
      this.pollingInterval_ = setInterval(this.onPollFrame_.bind(this), intervalMs)
    }
  }

  dispose() {
    this.detachMedia()
  }

  resetMedia() {
    clearInterval(this.pollingInterval_)
    this.previousMediaTime_ = null;
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
          onEventTranslated(MediaEventReasons.MEDIA_ENGINE_INIT)
          break
        case 1:
          onEventTranslated(MediaEventReasons.MEDIA_LOADING_PROGRESS)
          onEventTranslated(MediaEventReasons.MEDIA_DURATION_CHANGE)
          break
        case 2:
          onEventTranslated(MediaEventReasons.MEDIA_LOADING_PROGRESS)
          break
        case 3:
          onEventTranslated(MediaEventReasons.MEDIA_LOADING_PROGRESS)
          break
        case 4:
          onEventTranslated(MediaEventReasons.MEDIA_LOADING_PROGRESS)
          break
      }
    })

    this.listenToMediaElementEvent('loadedmetadata', () => {
      onEventTranslated(MediaEventReasons.MEDIA_ENGINE_INIT)
      onEventTranslated(MediaEventReasons.MEDIA_LOADING_PROGRESS)
    })

    this.listenToMediaElementEvent('loadeddata', () => {
      //onEventTranslated(MediaEventReasons.MEDIA_ENGINE_INIT);
      onEventTranslated(MediaEventReasons.MEDIA_LOADING_PROGRESS)
    })

    // We need the PLAY event to indicate the intent to play
    // NOTE: use TIMECHANGED event on 'playing' and trigger PLAY as intended in states.dot graph

    this.listenToMediaElementEvent('play', () => {
      if (mediaEl.autoplay) {
        onEventTranslated(MediaEventReasons.MEDIA_AUTO_PLAY)
      } else {
        onEventTranslated(MediaEventReasons.MEDIA_MANUAL_PLAY)
      }
    })

    this.listenToMediaElementEvent('pause', () => {
      onEventTranslated(MediaEventReasons.MEDIA_PAUSE)
    })

    this.listenToMediaElementEvent('playing', () => {
      onEventTranslated(MediaEventReasons.MEDIA_LOADING_PROGRESS)
    })

    this.listenToMediaElementEvent('error', () => {
      onEventTranslated(MediaEventReasons.MEDIA_ERROR)
    })

    this.listenToMediaElementEvent('seeking', () => {
      onEventTranslated(MediaEventReasons.MEDIA_SEEK)
    })

    this.listenToMediaElementEvent('seeked', () => {
      onEventTranslated(MediaEventReasons.MEDIA_LOADING_PROGRESS)
    })

    this.listenToMediaElementEvent('timeupdate', () => {
      //onEventTranslated(MediaEventReasons.MEDIA_CLOCK_UPDATE

      // will only update if clock actually changed since last call
      this.onPollForClockUpdate_()
    })

    this.listenToMediaElementEvent('durationchange', () => {
      onEventTranslated(MediaEventReasons.MEDIA_DURATION_CHANGE)
    })

    this.listenToMediaElementEvent('ended', () => {
      onEventTranslated(MediaEventReasons.MEDIA_END)
    })

    // The waiting event is fired when playback has stopped because of a temporary lack of data.
    // See https://developer.mozilla.org/en-US/docs/Web/Events/waiting
    this.listenToMediaElementEvent('waiting', () => {
      onEventTranslated(MediaEventReasons.MEDIA_BUFFER_UNDERRUN)
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
    this.previousEventReason_ = eventReason
  }

  private onPollFrame_() {
    if (
      this.mediaEl.readyState > 0
      && this.previousEventReason_ !== MediaEventReasons.MEDIA_PAUSE
    ) {
      this.onPollForClockUpdate_()
    }
  }

  /**
   * NOTE: we may want to move out of the function triggering the event itself.
   *
   * @returns {boolean}
   */
  private onPollForClockUpdate_() {
    if (this.mediaEl.currentTime !== this.previousMediaTime_) {
      this.onEventTranslated_(MediaEventReasons.MEDIA_CLOCK_UPDATE)
      this.previousMediaTime_ = this.mediaEl.currentTime
      return true
    }
    return false
  }
}
