import {PlaybackStateMachine, PlaybackStateMachineEvents, PlaybackStateMachineTransitionReasons} from './playback-state-machine'
import {MediaElementObserver, MediaElement} from './media-element-observer'

export type MediaEventTranslationCallback = (MediaSession, PlaybackStateMachineTransitionReasons) => void

export type PlaybackStateMachineTransitionCallback = (MediaSession) => void

export class MediaSession {

  static get Subclasses() {
    return {
      AUDIO: 'audio',
      VIDEO: 'video'
    }
  }

  static createDOMMediaElement(subclass) {
    if (!window || !window.document) {
      throw new Error('Can not create DOM element when no window/document exist in scope')
    }

    if (subclass !== 'audio'
            || subclass !== 'video') {
      throw new Error('Invalid subclass value for DOM media element:' + subclass)
    }

    return window.document.createElement(subclass)
  }

  private html5MediaElement_: MediaElement;
  private onMediaElementEventTranslatedCb_: MediaEventTranslationCallback;
  private onPlaybackStateMachineTransitionCb_: PlaybackStateMachineTransitionCallback;
  private playbackStateMachine_: PlaybackStateMachine;
  private mediaElObserver_: MediaElementObserver;

  constructor(iHtml5MediaElement: MediaElement,
    onMediaElementEventTranslatedCb: MediaEventTranslationCallback,
    onPlaybackStateMachineTransitionCb: PlaybackStateMachineTransitionCallback) {

    this.html5MediaElement_ = iHtml5MediaElement
    this.onMediaElementEventTranslatedCb_ = onMediaElementEventTranslatedCb
    this.onPlaybackStateMachineTransitionCb_ = onPlaybackStateMachineTransitionCb

    this.mediaElObserver_ = new MediaElementObserver(this.onMediaElementEventTranslated_.bind(this))
    this.mediaElObserver_.attachMedia(this.mediaElement)

    this.playbackStateMachine_ = new PlaybackStateMachine(
      PlaybackStateMachine.lookupStateOfMediaElement(this.mediaElement)
    )

    this.playbackStateMachine_.on(
      PlaybackStateMachineEvents.STATE_TRANSITION,
      this.onPlaybackStateMachineTransition_.bind(this)
    )

    // fatal error
    this.playbackStateMachine_.on(
      PlaybackStateMachineEvents.FAILURE,
      this.onPlaybackStateMachineFailure_.bind(this)
    )
  }

  dispose() {
    this.html5MediaElement_ = null

    this.mediaElObserver_.detachMedia()
    this.mediaElObserver_ = null

    this.playbackStateMachine_ = null

    this.onMediaElementEventTranslatedCb_ = null
    this.onPlaybackStateMachineTransitionCb_ = null
  }

  get mediaElement() {
    return this.html5MediaElement_
  }

  get mediaPlaybackState() {
    if (!this.playbackStateMachine_) {
      throw new Error('PlaybackStateMachine not initialized')
    }
    return this.playbackStateMachine_.state
  }

  onMediaElementEventTranslated_(eventReason) {

    if(this.onMediaElementEventTranslatedCb_) {
      this.onMediaElementEventTranslatedCb_(this, eventReason)
    }

    try {
      this.playbackStateMachine_.triggerStateTransition(eventReason)
    } catch(e) {
      console.log('PlaybackStateMachine transition attempt error:', e.message)
    }
  }

  onPlaybackStateMachineTransition_() {

    if (this.onPlaybackStateMachineTransitionCb_) {
      this.onPlaybackStateMachineTransitionCb_(this)
    }
  }

  onPlaybackStateMachineFailure_() {
    throw new Error('PlaybackStateMachine had a fatal error')
  }
}
