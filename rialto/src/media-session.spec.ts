import('jasmine')
import('chai')

import {MediaSession} from './media-session'
import {PlaybackStateMachine, PlaybackStates} from './playback-state-machine'

import MediaElementMock from './mocks/html5-media-element-mock'

describe('MediaSession', () => {

  let mediaSession, mediaEl
  let eventTranslationCallbackArgs
  let stateMachineTransitionCallbackArgs

  function onMediaElementEventTranslated(mediaSession, eventReason) {
    eventTranslationCallbackArgs.push({
      mediaSession,
      eventReason
    })
  }

  function onPlaybackStateMachineTransition(mediaSession) {
    stateMachineTransitionCallbackArgs.push(mediaSession)
  }

  beforeEach(() => {
    mediaEl = new MediaElementMock()
    mediaSession = new MediaSession(mediaEl,
      onMediaElementEventTranslated, onPlaybackStateMachineTransition)
    eventTranslationCallbackArgs = []
    stateMachineTransitionCallbackArgs = []
  })

  afterEach(() => {
    mediaEl = null
    mediaSession = null
    eventTranslationCallbackArgs = null
  })

  it('should initialize with a media element and callbacks', () => {
    mediaSession.mediaElement.should.equal(mediaEl)
  })

  it('should ensure media element events get translated by observer', () => {
    mediaSession.mediaElement.should.equal(mediaEl)

    mediaSession.mediaElement.dispatchEvent('readystatechange')

  })

  it('should ensure media element events get translated by observer even with no callbacks registered', () => {

    mediaSession = new MediaSession(mediaEl, null, null)

    mediaSession.mediaElement.should.equal(mediaEl)

    mediaSession.mediaElement.dispatchEvent('readystatechange')

    mediaSession.mediaPlaybackState.should.equal(PlaybackStates.READY)

  })

})
