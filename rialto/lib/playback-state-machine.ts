import {EventEmitter} from 'eventemitter3'

import {MediaElement} from './media-element-observer'

export enum PlaybackStateMachineEvents {
  STATE_TRANSITION = 'state-transition',
  FAILURE = 'failure'
}

export enum PlaybackStateMachineTransitionReasons {
  MEDIA_ERROR = 'media-error',
  MEDIA_RECOVER = 'media-recover',
  MEDIA_ENGINE_INIT = 'media-engine-init',
  MEDIA_LOADING_PROGRESS = 'media-loading-progress',
  MEDIA_CLOCK_UPDATE = 'media-clock-update',
  MEDIA_DURATION_CHANGE = 'media-duration-change',
  MEDIA_AUTO_PLAY = 'media-autoplay',
  MEDIA_MANUAL_PLAY = 'media-manual-play',
  MEDIA_PAUSE = 'media-pause',
  MEDIA_BUFFER_UNDERRUN = 'media-buffer-underrun',
  MEDIA_SEEK = 'media-seek',
  MEDIA_END = 'media-end',
  STATE_TRANSITION_FAIL = 'state-transition-fail'
}

export enum PlaybackStates {
  NULL = 'null',
  READY = 'ready',
  METADATA_LOADING = 'metadata-loading',
  PAUSED = 'paused',
  PLAYING = 'playing',
  ENDED = 'ended',
  ERROR = 'error'
}

export enum PlaybackSubStates {
  DEFAULT = 'default',
  FIRST_BUFFERING = 'first-buffering',
  REBUFFERING = 'rebuffering',
  SEEKING = 'seeking'
}

// local aliases :)
const States = PlaybackStates
const EventReasons = PlaybackStateMachineTransitionReasons

export const PlaybackStateMachineTransitions: PlaybackStateTransition[] = [
  [States.NULL, States.READY, EventReasons.MEDIA_ENGINE_INIT],
  [States.NULL, States.READY, EventReasons.MEDIA_MANUAL_PLAY],

  [States.READY, States.METADATA_LOADING, EventReasons.MEDIA_BUFFER_UNDERRUN],
  [States.READY, States.METADATA_LOADING, EventReasons.MEDIA_LOADING_PROGRESS],

  [States.METADATA_LOADING, States.PAUSED, EventReasons.MEDIA_DURATION_CHANGE],

  [States.METADATA_LOADING, States.ERROR, EventReasons.MEDIA_ERROR],

  [States.PAUSED, States.PAUSED, EventReasons.MEDIA_ENGINE_INIT],
  [States.PAUSED, States.PAUSED, EventReasons.MEDIA_AUTO_PLAY],
  [States.PAUSED, States.PAUSED, EventReasons.MEDIA_MANUAL_PLAY],
  [States.PAUSED, States.PAUSED, EventReasons.MEDIA_SEEK],
  [States.PAUSED, States.PAUSED, EventReasons.MEDIA_BUFFER_UNDERRUN],
  [States.PAUSED, States.PAUSED, EventReasons.MEDIA_LOADING_PROGRESS],

  [States.PAUSED, States.PLAYING, EventReasons.MEDIA_CLOCK_UPDATE],
  [States.PLAYING, States.PLAYING, EventReasons.MEDIA_CLOCK_UPDATE],

  [States.PLAYING, States.PAUSED, EventReasons.MEDIA_PAUSE],
  [States.PLAYING, States.PAUSED, EventReasons.MEDIA_BUFFER_UNDERRUN],
  [States.PLAYING, States.PAUSED, EventReasons.MEDIA_SEEK],
  [States.PLAYING, States.PAUSED, EventReasons.MEDIA_ERROR],

  [States.PLAYING, States.ENDED, EventReasons.MEDIA_END],

  [States.ENDED, States.PAUSED, EventReasons.MEDIA_SEEK],
  [States.ENDED, States.PAUSED, EventReasons.MEDIA_MANUAL_PLAY],

  [States.PAUSED, States.ERROR, EventReasons.MEDIA_ERROR],

  [States.ERROR, States.PAUSED, EventReasons.MEDIA_RECOVER]
]


export type PlaybackStateTransition = [PlaybackStates, PlaybackStates, PlaybackStateMachineTransitionReasons]

export class PlaybackStateMachine extends EventEmitter {

  static inspectTransition(transition) {
    return {
      from: transition[0],
      to: transition[1],
      reason: transition[2]
    }
  }

  static mapInspectTransitionsArray(transitionsArray) {
    return transitionsArray.map((transition) => {
      return PlaybackStateMachine.inspectTransition(transition)
    })
  }

  static lookupStateOfMediaElement(mediaEl) {
    const States = PlaybackStates

    if (mediaEl.error) {
      return States.ERROR
    }

    if (mediaEl.ended) {
      return States.ENDED
    }

    switch(mediaEl.readyState) {
      case 0:
        if (mediaEl.src) {
          return States.READY
        } else {
          return States.NULL
        }
      case 1:
      case 2:
      case 3:
      case 4:
        return mediaEl.paused ? States.PAUSED : States.PLAYING
    }
  }

  private state_: PlaybackStates;
  private previousState_: PlaybackStates;
  private error_: Error;

  constructor(initialStateOrMediaElement: MediaElement | PlaybackStates) {
    super()
    this.previousState_ = null
    this.error_ = null

    let initialState
    if (typeof initialStateOrMediaElement === 'string') {
      initialState = initialStateOrMediaElement
    } else if (typeof initialStateOrMediaElement === 'object') {
      initialState = PlaybackStateMachine
        .lookupStateOfMediaElement(initialStateOrMediaElement)
    } else if(initialStateOrMediaElement) {
      throw new Error('Constructor argument for PlaybackStateMachine is invalid')
    }

    // TODO: check if initialState is a valid state
    this.state_ = initialState || PlaybackStates.NULL
  }

  triggerStateTransition(eventReason) {
    const Events = PlaybackStateMachineEvents
    const possibleTransitions = this.findPossibleTransitions_(eventReason, false)

    if (possibleTransitions.length === 0) {
      throw new Error('No possible state transitions with event reason: ' + eventReason + ' from current state: ' + this.state)
    }

    if (possibleTransitions.length !== 1) {
      throw new Error('More than on possible state transition from current state with event reason:' + eventReason)
    }

    this.previousState_ = this.state_

    this.state_ = possibleTransitions[0][1]

    this.emit(Events.STATE_TRANSITION, eventReason)
  }

  findPossibleTransitions_(eventReason, backward) {
    const Transitions = PlaybackStateMachineTransitions
    const state = this.state

    return Transitions.filter((transition) => {
      return state === transition[backward ? 1 : 0]
    }).filter((transition) => {
      if (!eventReason) {
        return true
      }
      return eventReason === transition[2]
    })
  }

  notifyError_(err) {
    this.error_ = err
    this.emit(PlaybackStateMachineEvents.FAILURE, err)
  }

  getNextPossibleStates() {
    const possibleTransitions = this.findPossibleTransitions_(null, false)

    return possibleTransitions.map((transition) => {
      return transition[1]
    })
  }

  getPreviousPossibleStates() {
    const possibleTransitions = this.findPossibleTransitions_(null, true)

    return possibleTransitions.map((transition) => {
      return transition[0]
    })
  }

  emit(eventType, eventReason) {
    return super.emit(eventType, eventReason)
  }

  get state() {
    return this.state_
  }

  get previousState() {
    return this.previousState_
  }

  get error() {
    return this.error_
  }
}
