import { XHRCallbackFunction, XHRMethod, XHRResponseType, XHRHeaders, XHRData, XHR, XHRState } from "./xhr";
import { ByteRange } from "./byte-range";

export interface IResourceRequest {
  abort();
  wasSuccessful(): boolean;

  readonly xhrState: XHRState;
  readonly responseData: XHRData;

  readonly responseHeaders: object;

  readonly loadedBytes: number;
  readonly totalBytes: number;

  readonly hasBeenAborted: boolean;
  readonly hasErrored: boolean;
  readonly error: Error;

  readonly secondsUntilLoading: number;
  readonly secondsUntilDone: number;
  readonly secondsUntilHeaders: number;
}

export type RequestCallbackFunction = (req: IResourceRequest, isProgressUpdate: boolean) => void;

export type ResourceRequestOptions = Partial<{
  requestCallback: RequestCallbackFunction,
  method: XHRMethod,
  responseType: XHRResponseType,
  byteRange: ByteRange,
  headers: XHRHeaders,
  data: XHRData,
  withCredentials: boolean,
  timeout: number,
  forceXMLMimeType: boolean
}>

export type ResourceRequestMaker = (url: string, opts: ResourceRequestOptions) => IResourceRequest;

export const makeDefaultRequest: ResourceRequestMaker
  = (url, opts) => new XHR(url,
    opts.requestCallback,
    opts.method,
    opts.responseType,
    opts.byteRange,
    opts.headers,
    opts.data,
    opts.withCredentials,
    opts.timeout,
    opts.forceXMLMimeType
  );

