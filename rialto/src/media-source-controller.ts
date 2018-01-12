import EventEmitter3 from 'eventemitter3';

import SourceBufferQueue from './source-buffer-queue';

export default class MediaSourceController extends EventEmitter3 {

	static get Events() {
		return {
			MEDIA_CLOCK_UPDATED: 'media-clock-updated',
			MEDIA_DURATION_CHANGED: 'media-duration-changed',
			MEDIA_STALLED: 'media-stalling'
		}
	}

	constructor(mediaSource) {
		super();

		if (!window.MediaSource || !mediaSource) {
			throw new Error('Need MediaSource in constructor');
		}

		if (!mediaSource) {
			mediaSource = new window.MediaSouce();
		}

		this.mediaSource_ = mediaSource;
		this.sourceBufferQueues_ = [];
		this.mediaDuration_ = null;
		this.mediaClockTime_ = null;
		this.mediaClockLastUpdateTime_ = null;
	}

	get mediaDuration() {
		return this.mediaDuration_;
	}

	get mediaClockTime() {
		return this.mediaClockTime_;
	}

	get mediaSource() {
		return this.mediaSource_;
	}

	get sourceBufferQueues() {
		return this.sourceBufferQueues_;
	}

	addSourceBufferQueue(mimeType) {
		if (!MediaSource.isTypeSupported(mimeType)) {
			console.error('MediaSource not supporting:', mimeType);
			return false;
		}
		try {
			this.sourceBufferQueues_.push(
				new SourceBufferQueue(this, mimeType, null, (sbQueue, eventData) => {
					this.onSourceBufferQueueUpdateCb_(sbQueue, eventData);
				})
			);			
		} catch(err) {
			console.error(err);
			return false;
		}
		return true;
	}

	getSourceBufferQueuesByMimeType(mimeType) {
		return this.sourceBufferQueues_.filter((sbQ) => {
			return sbQ.mimeType === mimeType;
		});
	}

	getBufferedTimeRanges(mediaOffset) {
		return this.sourceBufferQueues_.map((sbQ) => {
			return sbQ.getBufferedTimeranges(mediaOffset);
		});
	}

	getBufferedTimeRangesFromMediaPosition() {
		return this.sourceBufferQueues_.map((sbQ) => {
			return sbQ.getBufferedTimeranges(this.mediaClockTime);
		});
	}

	updateMediaClockTime(clockTime) {
		const {Events} = MediaSourceController;
		const now = Date.now();
		const wallClockDelta = now - this.mediaClockLastUpdateTime_;
		const mediaTimeDelta = clockTime - this.mediaClockTime_;
		const isForwardProgress = mediaTimeDelta > 0;
		if (this.mediaClockTime_ !== clockTime) {
			this.mediaClockTime_ = clockTime;
			this.mediaClockLastUpdateTime_ = now;
			this.emit(Events.MEDIA_CLOCK_UPDATED, clockTime);

			// detect discontinuities/jitter in playback here

		} else {
			this.emit(Events.MEDIA_STALLED, clockTime);	
		}
	}

	setMediaDuration(duration) {
		const {Events} = MediaSourceController;
		if (this.mediaDuration_ !== duration) {
			this.mediaDuration_ = duration;
			this.emit(Events.MEDIA_DURATION_CHANGED, duration);
		}
	}

	onSourceBufferQueueUpdateCb_() {}

}