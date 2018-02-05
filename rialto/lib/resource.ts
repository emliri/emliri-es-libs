import {EventEmitter} from 'eventemitter3'

import {
  resolveUri,
  URLObject
} from './url'

import {
  XHR,
  XHRMethod,
  XHRResponseType,
  XHRState,
  XHRStatusCategory,
  ByteRange
} from './xhr'

export enum ResourceEvents {
  BUFFER_SET = 'buffer:set',
  BUFFER_CLEAR = 'buffer:clear',
  FETCH_PROGRESS = 'fetch:progres',
  FETCH_ABORTED = 'fetch:aborted',
  FETCH_ERRORED = 'fetch:errored',
  FETCH_SUCCEEDED = 'fetch:succeeded'
}

export interface ParseableResource<ParsingResultType> extends Resource {
  hasBeenParsed(): boolean

  parse(): Promise<ParsingResultType>
}

export interface SegmentableResource<SegmentType> extends Resource {

  getSegments(): Promise<SegmentType[]>
}

export interface DecryptableResource extends Resource {
  decrypt(): Promise<DecryptableResource>
}

export class Resource extends EventEmitter {

  private uri_: string;
  private baseUri_: string;
  private byteRange_: ByteRange;
  private ab_: ArrayBuffer;
  private abortedCnt_: number;
  private fetchAttemptCnt_: number;
  private xhr_: XHR = null;
  private mimeType_: string // TODO: set this from response headers;

  private fetchLatency_: number = NaN;
  private fetchResolve_: (ms: Resource) => void = null
  private fetchReject_: (e: Error) => void = null

  /**
   *
   * @param uri may be relative or absolute
   * @param byteRange
   * @param baseUri
   * @param mimeType
   */
  constructor(uri: string, byteRange: ByteRange = null, baseUri: string = null, mimeType: string = null) {
    super()

    this.uri_ = uri
    this.baseUri_ = baseUri
    this.byteRange_ = byteRange
    this.mimeType_ = mimeType

    this.ab_ = null

    this.abortedCnt_ = 0
    this.fetchAttemptCnt_ = 0

    this.xhr_ = null
  }

  get uri(): string {
    return this.uri_
  }

  get baseUri(): string {
    return this.baseUri
  }

  get byteRange(): ByteRange {
    return this.byteRange_
  }

  get mimeType(): string {
    return this.mimeType_
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

  /**
   * Tries to resolve the resource's URI to an absolute URL,
   * with the given `baseUri` at construction or the optional argument
   * (which overrides the base of this instance for this resolution, but does not overwrite it).
   * Create a new resource object to do that.
   */
  getUrl(base?: string): string {
    // TODO: resolve here
    return resolveUri(this.uri, base ? base : this.baseUri_)
  }

  getURLObject(): URLObject {
    return new URLObject(this.getUrl())
  }

  setBuffer(ab): void {
    this.ab_ = ab
    this.emit(ResourceEvents.BUFFER_SET)
  }

  clearBuffer(ab): void {
    this.ab_ = null
    this.emit(ResourceEvents.BUFFER_CLEAR)
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
      XHRResponseType.ARRAY_BUFFER,
      this.byteRange
    )

    return fetchPromise
  }

  abort() {
    this.abortedCnt_++
    this.xhr_.abort()
  }

  private onXHRCallback_(xhr: XHR, isProgressUpdate: boolean) {

    if (isProgressUpdate) {
      this.emit(ResourceEvents.FETCH_PROGRESS)
      return
    }

    if (xhr.hasBeenAborted) {
      this.emit(ResourceEvents.FETCH_ABORTED)

      this.fetchReject_(new Error('Fetching media segment was aborted'))
    }

    if (xhr.hasErrored) {
      this.emit(ResourceEvents.FETCH_ERRORED)

      this.fetchReject_(xhr.error)
    }

    if (xhr.xhrState === XHRState.DONE) {
      if (xhr.getStatusCategory() === XHRStatusCategory.SUCCESS) {
        this.setBuffer(xhr.responseData)
        this.fetchResolve_(this)
        this.emit(ResourceEvents.FETCH_SUCCEEDED)
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

}
