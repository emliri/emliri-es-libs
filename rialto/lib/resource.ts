import {EventEmitter} from 'eventemitter3'

import {XHR, XHRMethod, XHRResponseType, XHRState, XHRStatusCategory, ByteRange} from './xhr'

export class Resource extends EventEmitter {

  private uri_: string;
  private byteRange_: ByteRange;
  private ab_: ArrayBuffer;
  private abortedCnt_: number;
  private fetchAttemptCnt_: number;
  private xhr_: XHR = null;
  private mimeType_: string // TODO: set this from response headers;

  private fetchLatency_: number = NaN;
  private fetchResolve_: (ms: Resource) => void = null
  private fetchReject_: (e: Error) => void = null

  constructor(uri: string, byteRange: ByteRange) {
    super()

    this.uri_ = uri
    this.byteRange_ = byteRange

    this.xhr_ = null

    this.ab_ = null

    this.abortedCnt_ = 0
    this.fetchAttemptCnt_ = 0
    this.mimeType_ = null
  }

  get uri(): string {
    return this.uri_
  }

  get mimeType(): string {
    return this.mimeType_
  }

  get byteRange(): ByteRange {
    return this.byteRange_
  }

  getUrl(): string {
    // TODO: resolve here
    return this.uri_
  }

  setBuffer(ab): void {
    this.ab_ = ab
    this.emit('buffer:set')
  }

  clearBuffer(ab): void {
    this.ab_ = null
    this.emit('buffer:clear')
  }

  private onXHRCallback_(xhr: XHR, isProgressUpdate: boolean) {

    if (isProgressUpdate) {
      this.emit('fetch:progress', xhr)
      return
    }

    if (xhr.hasBeenAborted) {
      this.emit('fetch:aborted', xhr)

      this.fetchReject_(new Error('Fetching media segment was aborted'))
    }

    if (xhr.hasErrored) {
      this.emit('fetch:errored', xhr)

      this.fetchReject_(xhr.error)
    }

    if (xhr.xhrState === XHRState.DONE) {
      if (xhr.getStatusCategory() === XHRStatusCategory.SUCCESS) {
        this.setBuffer(xhr.responseData)
        this.fetchResolve_(this)
        this.emit('fetch:succeeded', xhr)
      }

      this.fetchLatency_ = xhr.secondsUntilDone

      // reset fetch promise hooks
      this.fetchReject_ = null
      this.fetchResolve_ = null

      // XHR object is done and over, let's get rid of it
      this.xhr_ = null

    } else if (xhr.xhrState === XHRState.LOADING) {
      this.fetchLatency_ = xhr.secondsUntilLoading
    } else if (xhr.xhrState === XHRState.HEADERS_RECEIVED) {
      this.fetchLatency_ = xhr.secondsUntilHeaders
    } else if (xhr.xhrState === XHRState.OPENED) {
      //
    }
  }

  fetch(): Promise<Resource> {
    this.fetchAttemptCnt_++

    const fetchPromise = new Promise<Resource>((resolve, reject) => {
      this.fetchResolve_ = resolve
      this.fetchReject_ = reject
    })

    const xhr = this.xhr_ = new XHR(
      this.getUrl(),
      this.onXHRCallback_.bind(this),
      XHRMethod.GET,
      XHRResponseType.ARRAY_BUFFER
    )

    return fetchPromise
  }

  abort() {
    this.abortedCnt_++
    this.xhr_.abort()
  }

  get hasBuffer(): boolean {
    return this.ab_ !== null
  }

  get buffer(): ArrayBuffer {
    return this.ab_
  }

  get timesAborted(): number {
    return this.abortedCnt_
  }

  get timesFetchAttempted(): number {
    return this.fetchAttemptCnt_
  }

  get isFetching(): boolean {
    return !! this.xhr_
  }

  get fetchLatency(): number {
    return this.fetchLatency_
  }
}
