export default class SourceBufferQueue {

	constructor(mediaSource, mimeType, trackDefaults, onUpdate) {
		this.mimeType_ = mimeType;
		this.updateStartedTime_ = null;
		this.queue_ = [];
		this.bufferMap_ = [];
		this.bufferedBytesCount_ = 0;
		this.sourceBuffer_ = mediaSource.addSourceBuffer(mimeType);
		this.initialMode_ = this.sourceBuffer_.mode;
		if (trackDefaults) {
			this.sourceBuffer.trackDefaults = trackDefaults;
		}
		this.onUpdate_ = onUpdate;
		this.sourceBuffer_.addEventListener('updatestart', this.onUpdateStart_.bind(this));
		this.sourceBuffer_.addEventListener('updateend', this.onUpdateEnd_.bind(this));
	}

	get mimeType() {
		return this.mimeType_;
	}

	get bufferedBytesCount() {
		return this.bufferedBytesCount_;
	}

	/*

		The mode property of the SourceBuffer interface controls whether media segments can be appended to the SourceBuffer in any order, or in a strict sequence.

		The two available values are:

		segments: The media segment timestamps determine the order in which the segments are played. The segments can be appended to the SourceBuffer in any order.
		sequence: The order in which the segments are appended to the SourceBuffer determines the order in which they are played. Segment timestamps are generated automatically for the segments that observe this order.
		The mode value is initially set when the SourceBuffer is created using MediaSource.addSourceBuffer(). If timestamps already exist for the media segments, then the value will be set to segments; if they don't, then the value will be set to sequence.

		If you try to set the mode property value to segments when the initial value is sequence, an error will be thrown. The existing segment order must be maintained in sequence mode. You can, however, change the value from segments to sequence. It just means the play order will be fixed, and new timestamps generated to reflect this.

		This property cannot be changed during while the sourceBuffer is processing either an appendBuffer() or remove() call.

	*/

	isInitialModeSequential() {
		return this.initialMode_ === 'sequence';
	}

	getMode() {
		return this.sourceBuffer_.mode;
	}

	setModeSequential(sequentialModeEnable) {
		if (isUpdating()) {
			throw new Error('Can not set mode when updating');
		}
		if (!sequentialModeEnable) {
			if (this.isInitialModeSequential()) {
				throw new Error('Can not disable sequential model');
			} else {
				this.sourceBuffer_.mode = 'segments';
			}
		} else {
			this.sourceBuffer_.mode = 'sequence';
		}
	}

	isUpdating() {
		return this.sourceBuffer_.updating;
	}

	getBufferedTimeranges(mediaTimeOffset /* TODO: implement offset */) {
		return this.sourceBuffer_.buffered;
	}

	getTotalBytesQueued() {
		return this.queue_.filter((item) => {
			return item.method === 'appendBuffer';
		}).reduce((accu, item) => {
			return accu + item.arrayBuffer.byteLength;
		}, 0);
	}

	getTotalBytes() {
		return this.bufferedBytesCount + this.getTotalBytesQueued();
	}

	getItemsQueuedCount(filterMethod) {
		return this.queue_.filter((item) => {
			if (!filterMethod) {
				return true;
			}
			return filterMethod === item.method;
		}).length;
	}

	appendBuffer(arrayBuffer, timestampOffset) {
		this.queue_.push({method: 'appendBuffer', arrayBuffer, timestampOffset});

		this.tryRunQueueOnce_();
	}

	appendMediaSegment(segment) {
		const start = segment.startTime;
		const end = segment.endTime;
		const arrayBuffer = segment.arrayBuffer;

		this.queue_.push({method: 'appendBuffer', start, end, arrayBuffer, timestampOffset});
		
		this.tryRunQueueOnce_();
	}

	remove(start, end) {
		this.queue_.push({method: 'remove', start, end});

		this.tryRunQueueOnce_();
	}

	dropAsync() {
		this.queue_.push({method: 'drop', start, end});

		this.tryRunQueueOnce_();
	}

	incrBufferedBytesCnt_(bytes) {
		this.buffereddBytesCount_ += bytes;
	}

	decBufferedBytesCnt_(bytes) {
		this.buffereddBytesCount_ -= bytes;
	}

	tryRunQueueOnce_() {
		if (this.isUpdating()) {
			return;
		}
		const {method, arrayBuffer, timestampOffset, start, end} = this.queue_.shift();
		this.sourceBuffer_.timestampOffset = timestampOffset;

		switch(method) {
		case 'appendBuffer':
			this.sourceBuffer_[method](arrayBuffer);
			//this.incrBufferedBytesCnt_(arrayBuffer.bytesLength);
			// TODO: we need to parse the MP4 here to know what size it is
			break;
		case 'remove':
			this.sourceBuffer_[method](start, end);
			break;
		case 'drop':
			this.drop(false);
			break;
		}
	}

	onUpdateEnd_() {
		const updateTimeMs = Date.now() - this.updateStartedTime_;
		const callbackData = {
			updateTimeMs
		};
		this.updateStartedTime_ = null;
		this.onUpdate_(this, callbackData);

		this.tryRunQueueOnce_();
	}

	onUpdateStart_() {
		if (this.updateStartedTime_ !== null) {
			throw new Error('updateStartedTime_ should be null');
		}
		this.updateStartedTime_ = Date.now();
	}

	drop(immediateAbort) {
		if (immediateAbort && this.isUpdating()) {
			this.sourceBuffer_.abort();			
		}
		this.queue_ = [];
	}

	flush() {
		this.remove(0, Infinity);
	}

	dropAndFlush() {
		this.drop(true);
		this.flush();
	}
}