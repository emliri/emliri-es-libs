import {PlaybackStateMachine, PlaybackStateMachineEvents, PlaybackStates, PlaybackStateMachineTransitionReasons} from './playback-state-machine'
import {MediaElementObserver, MediaElement, MediaEventReasons} from './media-element-observer'

import {getLogger} from './logger'

const {
  log,
  warn
} = getLogger('media-session')

type StateChangeHistoryItem = {
  state: string,
  reason: string,
  logText: string,
  time: Date
}


export type MediaEventTranslationCallback = (MediaSession, MediaEventReasons) => void

export type PlaybackStateMachineTransitionCallback = (MediaSession, PlaybackStateMachineTransitionReasons) => void

export enum MediaElementSubclass {
  AUDIO = 'audio',
  VIDEO = 'video'
}

export class MediaSession {

  static createDOMMediaElement(subclass: MediaElementSubclass) {
    if (!window || !window.document) {
      throw new Error('Can not create DOM element when no window/document exist in scope')
    }
    return window.document.createElement(subclass)
  }

  private html5MediaElement_: MediaElement;
  private onMediaElementEventTranslatedCb_: MediaEventTranslationCallback;
  private onPlaybackStateMachineTransitionCb_: PlaybackStateMachineTransitionCallback;
  private playbackStateMachine_: PlaybackStateMachine;
  private mediaElObserver_: MediaElementObserver;

  private _previousState: string = PlaybackStates.NULL
  private _currentState: string = PlaybackStates.NULL

  private _stateChangeHistory: StateChangeHistoryItem[]
  private _eventHistory: string[]

  private _sessionClockData: {
    time: number,
    frame: number,
    updateEventCount: number
  }

  constructor(iHtml5MediaElement: MediaElement,
    onMediaElementEventTranslatedCb: MediaEventTranslationCallback,
    onPlaybackStateMachineTransitionCb: PlaybackStateMachineTransitionCallback) {

    this.html5MediaElement_ = iHtml5MediaElement
    this.onMediaElementEventTranslatedCb_ = onMediaElementEventTranslatedCb
    this.onPlaybackStateMachineTransitionCb_ = onPlaybackStateMachineTransitionCb

    this.mediaElObserver_ = new MediaElementObserver(this.onMediaElementEventTranslated_.bind(this), 60)
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

    // Track events/state changes
    this._eventHistory = []
    this._stateChangeHistory = []
    this._sessionClockData = {
      time: 0,
      frame: 0,
      updateEventCount: 0
    }

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

  get sessionHistoryData() {
    return this._stateChangeHistory;
  }

  get sessionClockData() {
    return this._sessionClockData;
  }

  onMediaElementEventTranslated_(eventReason) {

    if(this.onMediaElementEventTranslatedCb_) {
      this.onMediaElementEventTranslatedCbInternalTracking_(this, eventReason)
      this.onMediaElementEventTranslatedCb_(this, eventReason)
    }

    try {
      this.playbackStateMachine_.triggerStateTransition(eventReason)
    } catch(e) {
      warn('PlaybackStateMachine transition attempt error:', e.message)
    }
  }

  onPlaybackStateMachineTransition_(eventReason) {
    if (this.onPlaybackStateMachineTransitionCb_) {
      this.onPlaybackStateMachineTransitionCbInternalTracking_(this, eventReason)
      this.onPlaybackStateMachineTransitionCb_(this, eventReason)
    }
  }

  onPlaybackStateMachineFailure_() {
    throw new Error('PlaybackStateMachine had a fatal error')
  }

  setMediaObserverPollingFps(pollingFps) {
    this.mediaElObserver_.setPollingFps(pollingFps)
  }

  onPlaybackStateMachineTransitionCbInternalTracking_(mediaSession: MediaSession,
    reason: PlaybackStateMachineTransitionReasons) {

    const state = mediaSession.mediaPlaybackState

    const previousState = this._previousState = this._currentState
    this._currentState = state;

    const previousStateChangeHistoryItem = this._stateChangeHistory[this._stateChangeHistory.length - 1]
    // only add to history if it's actually something new
    if (previousStateChangeHistoryItem &&
      previousStateChangeHistoryItem.state === state &&
      previousStateChangeHistoryItem.reason === reason
    ) {
      return;
    }

    log('Media playback state', state, 'reason:', reason);

    const time = new Date()
    const timeString = `${time.toLocaleTimeString()} + ${time.getMilliseconds()}`
    const logText = `[${timeString}] | State: ${previousState} => ${state} | Reason: ${reason}`

    const item = {
      time,
      state,
      reason,
      logText
    }

    this._stateChangeHistory.push(item)
  }

  onMediaElementEventTranslatedCbInternalTracking_(mediaSession, eventReason) {
    if (eventReason === PlaybackStateMachineTransitionReasons.MEDIA_CLOCK_UPDATE) {
      this._sessionClockData.time = mediaSession.mediaElement.currentTime
    } else {
      log('Media element event translated:', eventReason);
      this._eventHistory.push(eventReason)
    }
  }
}
