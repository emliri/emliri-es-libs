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

  // TODO: use MediaSegmentQueue !!!

  private _adaptiveMedia: AdaptiveMedia;
  private _scheduler: Scheduler;
  private _fetchTarget: number;
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

  private _onFetchTargetUpdated() {

    log('_onFetchTargetUpdated');

    const fetchTarget = this._fetchTarget;
    const maxConcurrentFetch = this._maxConcurrentFetchInit;

    let fetchInitCount: number = 0;

    this._adaptiveMedia.segments.forEach((segment) => {

      if (fetchInitCount >= maxConcurrentFetch) {
        return;
      }
      if (segment.endTime > fetchTarget) {
        return;
      }
      if (!segment.hasBuffer) {
        log('init fetch for segment:', segment.uri);
        segment.fetch()
          .then(() => {
            this._onSegmentBufferedCb(segment);
          })
        fetchInitCount++;
      }
    });
  }

}


