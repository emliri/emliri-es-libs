import { AdaptiveMedia, AdaptiveMediaSet } from "./adaptive-media";
import { MediaSegment } from "./media-segment";
import { Scheduler } from "../../objec-ts/lib/scheduler";
import { getLogger } from "./logger";

const { log } = getLogger("adaptive-media-client");

export abstract class AdaptiveMediaClient implements AdaptiveMediaEngine {

  private mediaEl: HTMLMediaElement;

  constructor(mediaElement: HTMLMediaElement) {
    this.mediaEl = mediaElement;
  }

  get mediaElement(): HTMLMediaElement {
    return this.mediaEl;
  }

  protected setMediaSource(source: MediaSource) {
    this.mediaEl.src = URL.createObjectURL(source);
  }

  abstract setSourceURL(url: string, mimeType?: string);
  abstract activateMediaStream(stream: AdaptiveMedia): Promise<boolean>
  abstract enableMediaSet(set: AdaptiveMediaSet);
}

export interface AdaptiveMediaEngine {
  enableMediaSet(set: AdaptiveMediaSet)
  activateMediaStream(stream: AdaptiveMedia): Promise<boolean>
}

const SCHEDULER_FRAMERATE: number = 1;
const MAX_CONCURRENT_FETCH_INIT: number = 4;


export class AdaptiveMediaStreamConsumer {

  // TODO: use MediaSegmentQueue ?

  private _adaptiveMedia: AdaptiveMedia = null;
  private _scheduler: Scheduler = null;
  private _fetchTarget: number = 0;
  private _maxConcurrentFetchInit: number = MAX_CONCURRENT_FETCH_INIT;
  private _onSegmentBufferedCb: (segment: MediaSegment) => void;

  constructor(adaptiveMedia: AdaptiveMedia,
            scheduler: Scheduler, onSegmentBuffered: (segment: MediaSegment) => void) {

    this._adaptiveMedia = adaptiveMedia;
    this._scheduler = scheduler;
    this._onSegmentBufferedCb = onSegmentBuffered;
  }

  updateFetchTarget(seconds: number) {
    this._fetchTarget = seconds;

    this._onFetchTargetUpdated();
  }

  get maxConcurrentFetchInit(): number { return this._maxConcurrentFetchInit };
  set maxConcurrentFetchInit(n: number) { this._maxConcurrentFetchInit = n }

  private _onFetchTargetUpdated() {

    log('_onFetchTargetUpdated:', this._fetchTarget);

    const fetchTarget = this._fetchTarget;
    const maxConcurrentFetch = this._maxConcurrentFetchInit;

    let fetchInitCount: number = 0;
    let abort = false;

    this._adaptiveMedia.segments.forEach((segment) => {

      if (abort) { return }

      if (fetchInitCount >= maxConcurrentFetch) {
        return;
      }
      if (isNaN(segment.endTime)) {
        console.error("Segment endTime is NaN");
        abort = true;
        return;
      }
      if (segment.startTime > fetchTarget) {
        return;
      }
      if (!segment.hasBuffer && !segment.isFetching) {
        log(`init fetch for segment in time-range: [${segment.startTime}, ${segment.endTime}]s, uri:`, segment.uri);

        segment.fetch()
          .then(() => {
            this._onSegmentBufferedCb(segment);
          })
        fetchInitCount++;
      }
    });
  }

}


