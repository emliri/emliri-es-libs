import { AdaptiveMedia, AdaptiveMediaSet } from "./adaptive-media";
import { MediaSegment } from "./media-segment";
import { TimeIntervalContainer, TimeInterval } from './time-intervals';
//import { Scheduler } from "../../objec-ts/lib/scheduler";
import { getLogger } from "./logger";

const { log, error } = getLogger("adaptive-media-client");

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

export class AdaptiveMediaStreamConsumer {

  private _fetchTargetRanges: TimeIntervalContainer = new TimeIntervalContainer();
  private _bufferedRanges: TimeIntervalContainer = new TimeIntervalContainer();

  constructor(
    private _adaptiveMedia: AdaptiveMedia,
    private _onSegmentBufferedCb: (segment: MediaSegment) => void) {
  }

  getFetchTargetRanges(): TimeIntervalContainer {
    return this._fetchTargetRanges;
  }

  /**
   *
   * @param range pass `null` to just reset to clear range container
   */
  setFetchTargetRange(range: TimeInterval) {
    this._fetchTargetRanges.clear();
    if (range) {
      this.addFetchTargetRange(range);
    }
  }

  addFetchTargetRange(range: TimeInterval) {
    this._fetchTargetRanges.add(range);
    this._fetchTargetRanges = this._fetchTargetRanges.flatten();
    this._onFetchTargetRangeChanged();
  }

  private _onFetchTargetRangeChanged() {
    const mediaSeekableRange: TimeIntervalContainer = this._adaptiveMedia.getSeekableTimeRanges();
    const fetchTargetRanges = this.getFetchTargetRanges();

    log('fetch-target ranges window duration:', fetchTargetRanges.getWindowDuration())

    if (!mediaSeekableRange.hasOverlappingRangesWith(fetchTargetRanges)) {
      error('fetch target range does not overlap with media seekable range');
      return;
    }

    this._fetchAllSegmentsInTargetRange();
  }

  private _fetchAllSegmentsInTargetRange() {
    const fetchTargetRanges = this.getFetchTargetRanges();
    fetchTargetRanges.ranges.forEach((range) => {
      const mediaSegments: MediaSegment[] = this._adaptiveMedia.findSegmentsForTimeRange(range, true);

      mediaSegments.forEach((segment) => {
        if (segment.isFetching || segment.hasData) {
          return;
        }
        segment.fetch().then(() => {

          const segmentInterval = segment.getTimeInterval();

          log('adding time-interval to buffered range:', segmentInterval)

          this._bufferedRanges.add(segmentInterval).flatten(true);
        })
      });
    });
  }

}


