import EventEmitter3 from 'eventemitter3';

import MediaCache from './media-cache';

export default class MediaSegment extends EventEmitter3 {

    constructor(locator, cached = false) {
        this.cached = cached;
        this.locator_ = locator;
        this.mimeType_ = null;
        this.fetchPromise_ = null;
        this.abortCtrl_ = null;
        this.ab_ = null;

        this.abortedCnt_ = 0;
        this.fetchAttemptCnt_ = 0;
    }

    getUrl() {
        return this.uri;
    }

    setArrayBuffer(ab) {
        this.ab_ = ab;
        this.emit('setarraybuffer');
    }

    clearArrayBuffer(ab) {
        this.ab_ = null;
        this.emit('cleararraybuffer');
    }

    hasArrayBuffer(ab) {
        this.ab_ !== null;
    }

    decrypt() {
        //
    }

    fetch(retries, retryDelayMs) {

        this.fetchAttemptCnt_++;

        var headers = new Headers();
        var abortCtrl = new AbortController();

        if (this.byteRange) {
            headers.append('Byte-Range', this.byteRange.from +  '-' + this.byteRange.to);
        }

        var initOptions = {
            method: 'GET',
            headers,
            mode: 'cors',
            cache: 'default',
            signal: abortCtrl.signal
        };

        this.abortCtrl_  = abortCtrl;
        this.fetchPromise_ = fetch(this.getUrl(), initOptions).then((response) => {

            if(!response.ok) {
                throw new Error('Response status not OK: ' + response.status);                
            }

            return response.arrayBuffer();

        }).then((ab) => {
            this.setArrayBuffer(ab);
            this.emit('fetchsuccess');
        }).catch((error) => {
            if (retries > 0) {
                setTimeout(() => {
                    this.fetch(--retries, retryDelayMs);
                }, retryDelayMs);
            } else {
                this.emit('fetcherror', error);
            }
        });
    }

    abort() {
        if (!this.abortCtrl_) {
            throw new Error('can not abort, no fetch seems to be happening or already aborted');
        }
        this.abortedCnt_++;
        this.abortCtrl_.abort();
        this.abortCtrl_ = null;
        this.fetchPromise_ = null;
        this.emit('abort');
    }

    get arrayBuffer() {
        return this.ab_;
    }

    get timesAborted() {
        return this.abortedCnt_;
    }

    get timesFetchAttempted() {
        return this.fetchAttemptCnt_++;
    }

    get isFetching() {
        return !!this.fetchPromise_;
    }

    get mimeType() {
        return this.mimeType_;
    }

    get byteRange() {
        return this.locator_.byteRange;
    }

    get uri() {
        return this.locator_.uri;
    }
    
    get startTime() {
        return this.locator_.startTime;
    }

    get endTime() {
        return this.locator_.endTime;
    }
}