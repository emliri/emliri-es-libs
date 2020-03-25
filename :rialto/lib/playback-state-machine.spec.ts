import('chai')
import('jasmine')

import {
  PlaybackStateMachine,
  PlaybackState,
  PlaybackStateMachineTransitionReasons,
  PlaybackStateMachineTransitions
} from './playback-state-machine'

const States = PlaybackState
const EventReasons = PlaybackStateMachineTransitionReasons

const prettyPrintedTransitionsArrayInspected = JSON.stringify(
  PlaybackStateMachine.mapInspectTransitionsArray(PlaybackStateMachineTransitions),
  null, 2
)

const expectedTransitionsArrayInspected = JSON.stringify([
  {
    'from': 'null',
    'to': 'ready',
    'reason': 'media-engine-init'
  },
  {
    'from': 'ready',
    'to': 'metadata-loading',
    'reason': 'media-loading-progress'
  },
  {
    'from': 'metadata-loading',
    'to': 'paused',
    'reason': 'media-loading-progress'
  },
  {
    'from': 'metadata-loading',
    'to': 'error',
    'reason': 'media-error'
  },
  {
    'from': 'paused',
    'to': 'paused',
    'reason': 'media-loading-progress'
  },
  {
    'from': 'paused',
    'to': 'playing',
    'reason': 'media-autoplay'
  },
  {
    'from': 'paused',
    'to': 'playing',
    'reason': 'media-manual-play'
  },
  {
    'from': 'playing',
    'to': 'paused',
    'reason': 'media-pause'
  },
  {
    'from': 'playing',
    'to': 'paused',
    'reason': 'media-buffer-underrun'
  },
  {
    'from': 'playing',
    'to': 'paused',
    'reason': 'media-seek'
  },
  {
    'from': 'playing',
    'to': 'paused',
    'reason': 'media-error'
  },
  {
    'from': 'playing',
    'to': 'ended',
    'reason': 'media-end'
  },
  {
    'from': 'ended',
    'to': 'paused',
    'reason': 'media-seek'
  },
  {
    'from': 'ended',
    'to': 'paused',
    'reason': 'media-manual-play'
  },
  {
    'from': 'paused',
    'to': 'error',
    'reason': 'media-error'
  },
  {
    'from': 'error',
    'to': 'paused',
    'reason': 'media-recover'
  }
],
null, 2
)

describe('PlaybackStateMachine', function() {

  let psm

  beforeEach(function() {
    psm = new PlaybackStateMachine(null)
  })

  afterEach(function() {
    psm = null
  })

  it('should be constructed with NULL as default initial state', function() {
    psm.state.should.equal(States.NULL)
  })

  it('should be constructable with the parametered initial state', function() {
    psm = new PlaybackStateMachine(States.ENDED)

    psm.state.should.equal(States.ENDED)
    psm.state.should.not.equal(undefined)
  })

  it('should be constructable with a media element', function() {
    psm = new PlaybackStateMachine({
      error: null,
      ended: true,
      readyState: 4
    })

    psm.state.should.equal(States.ENDED)
    psm.state.should.not.equal(undefined)
  })

  it('should have the proper transitions setup and they should be inspectable', function() {

    //expectedTransitionsArrayInspected.should.be.equal(prettyPrintedTransitionsArrayInspected);
  })

  describe('PlaybackStateMachine.prototype.findPossibleTransitions_', function() {

    it('should return possible transitions from current state for any (null) reasons', function() {

      psm.state.should.equal(States.NULL)

      const possibleTransitions = psm.findPossibleTransitions_(null, false)

      possibleTransitions.length.should.equal(1)

      possibleTransitions[0][0].should.equal(States.NULL)
      possibleTransitions[0][1].should.equal(States.READY)
    })

    it('should return possible transitions from current state for any (null) reasons from other initial states', function() {

      psm = new PlaybackStateMachine(States.PAUSED)

      psm.state.should.equal(States.PAUSED)

      const possibleTransitions = psm.findPossibleTransitions_(null, false)

      possibleTransitions.length.should.equal(4)

      possibleTransitions[0][0].should.equal(States.PAUSED)
      possibleTransitions[0][1].should.equal(States.PAUSED)
    })

    it('should return possible previous transitions (backward param) from current state for any (null) reasons from other initial states', function() {

      psm = new PlaybackStateMachine(States.PAUSED)

      psm.state.should.equal(States.PAUSED)

      const possibleTransitions = psm.findPossibleTransitions_(null, true)

      possibleTransitions.length.should.equal(10)

      possibleTransitions.forEach((transition) => {
        transition[1].should.equal(States.PAUSED)
      })
    })

    it('should return possible transitions from current state for existing reasons', function() {

      psm.state.should.equal(States.NULL)

      const possibleTransitions = psm.findPossibleTransitions_(EventReasons.MEDIA_ENGINE_INIT, false)

      possibleTransitions.length.should.equal(1)

      possibleTransitions[0][0].should.equal(States.NULL)
      possibleTransitions[0][1].should.equal(States.READY)
    })
  })

  describe('PlaybackStateMachine.prototype.triggerStateTransition', function() {

    it('should throw an error when there are no possible state transition for given reason', function() {

      psm.triggerStateTransition.bind(psm, EventReasons.MEDIA_END).should.throw(Error)
    })

    it('should throw an error when there is more than one possible state transition for given reason', function() {

      psm = new PlaybackStateMachine(States.PAUSED)
      psm.triggerStateTransition.bind(psm, null).should.throw(Error)
    })

    it('should trigger state transition for valid reason', function(done) {

      let stateTransitionEventCnt = 0
      psm = new PlaybackStateMachine(States.PAUSED)
      psm.on(PlaybackStateMachine.Events.STATE_TRANSITION, () => {
        stateTransitionEventCnt++
        stateTransitionEventCnt.should.be.equal(1)
        psm.state.should.be.equal(States.PLAYING)
        done()
      })
      psm.state.should.be.equal(States.PAUSED)
      psm.triggerStateTransition(EventReasons.MEDIA_LOADING_PROGRESS)

    })

  })
})
