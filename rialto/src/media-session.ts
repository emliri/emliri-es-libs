import PlaybackStateMachine from './playback-state-machine';
import MediaElementObserver from './media-element-observer';

export default class MediaSession {

    static get Subclasses() {
        return {
            AUDIO: 'audio',
            VIDEO: 'video'
        };
    }

    static createDOMMediaElement(subclass) {
        if (!window || !window.document) {
            throw new Error('Can not create DOM element when no window/document exist in scope');
        }

        if (subclass !== 'audio' 
            || subclass !== 'video') {
            throw new Error('Invalid subclass value for DOM media element:', subclass);
        }

        return window.document.createElement(subclass);
    }

    constructor(iHtml5MediaElement, onMediaElementEventTranslatedCb, 
                                        onPlaybackStateMachineTransitionCb) {

        this.html5MediaElement_ = iHtml5MediaElement;
        this.onMediaElementEventTranslatedCb_ = onMediaElementEventTranslatedCb;
        this.onPlaybackStateMachineTransitionCb_ = onPlaybackStateMachineTransitionCb;

        this.mediaElObserver_ = new MediaElementObserver(this.onMediaElementEventTranslated_.bind(this));
        this.mediaElObserver_.attachMedia(this.mediaElement);

        this.playbackStateMachine_ = new PlaybackStateMachine(
            PlaybackStateMachine.lookupStateOfMediaElement(this.mediaElement)
        );  

        this.playbackStateMachine_.on(
            PlaybackStateMachine.Events.STATE_TRANSITION,
            this.onPlaybackStateMachineTransition_.bind(this)
        );

        // fatal error
        this.playbackStateMachine_.on(
            PlaybackStateMachine.Events.FAILURE,
            this.onPlaybackStateMachineFailure_.bind(this)
        );
    }

    dispose() {
        this.html5MediaElement_ = null;
        this.html5MediaElementApi_ = null;

        this.mediaElObserver_.detachMedia(this.mediaElement);
        this.mediaElObserver_ = null;

        this.playbackStateMachine_ = null;

        this.onMediaElementEventTranslatedCb_ = null;
        this.onPlaybackStateMachineTransitionCb_ = null;
    }

    get mediaElement() {
        return this.html5MediaElement_;
    }

    get mediaPlaybackState() {
        if (!this.playbackStateMachine_) {
            throw new Error('PlaybackStateMachine not initialized');
        }
        return this.playbackStateMachine_.state;
    }

    onMediaElementEventTranslated_(eventReason) {

        if(this.onMediaElementEventTranslatedCb_) {
            this.onMediaElementEventTranslatedCb_(this, eventReason);
        }

        try {
            this.playbackStateMachine_.triggerStateTransition(eventReason);      
        } catch(e) {
            console.log('PlaybackStateMachine transition attempt error:', e.message);
        }
    }

    onPlaybackStateMachineTransition_() {

        if (this.onPlaybackStateMachineTransitionCb_) {
            this.onPlaybackStateMachineTransitionCb_(this);
        }
    }

    onPlaybackStateMachineFailure_() {
        throw new Error('PlaybackStateMachine had a fatal error');
    }
};