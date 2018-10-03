import { CloneableScaffold } from "./cloneable";

import {Set} from "../../objec-ts/lib/es6-set";

import {MediaSegment} from './media-segment'

import {
  VideoInfo,
  AudioInfo,
  TextInfo,
  MediaTypeFlag,
  MediaContainer,
  MediaContainerInfo,
  MediaTypeSet
} from './media-container-info'

import { ByteRange } from './byte-range';
import { AdaptiveMediaEngine } from './adaptive-media-client';
import { MediaClockTime } from "./media-locator";
import { TimeIntervalContainer, TimeInterval } from "./time-intervals";
import { getLogger } from "./logger";

const { log, error } = getLogger("adaptive-media-client");

/**
 * Essentially, a sequence of media segments that can be consumed as a stream.
 *
 * Represents what people refer to as rendition, quality level or representation, or media "variant" playlist.
 *
 * Contains an array of segments and the metadata in common about these.
 */
export class AdaptiveMedia extends CloneableScaffold<AdaptiveMedia> {

  private _segments: MediaSegment[] = [];
  private _timeRanges: TimeIntervalContainer = new TimeIntervalContainer();
  private _lastRefreshAt: number = 0;
  private _lastTimeRangesCreatedAt: number = 0;
  private _updateTimer: number;

  constructor(public mediaEngine: AdaptiveMediaEngine = null) {
    super();
  }

  parent: AdaptiveMediaSet

  mimeType: string
  codecs: string
  bandwidth: number
  videoInfo: VideoInfo
  audioInfo: AudioInfo
  textInfo: TextInfo

  /**
   * Some label indentifying the logical function for the user this media selection has. HLS uses `NAME`, DASH has `role(s)`.
   *
   * This SHOULD be identical for redundant selections/streams (carrying the same content but in different sets to allow
   * backup / fallback strategies).
   *
   * It SHOULD be different for streams with different function or "role" (as in DASH spec).
   *
   * Examples: Original-Audio vs Director-Comments or English-Subtitles vs Forced-CC etc.
   */
  label: string;

  /**
   * If the media segments come in a packetized format, indicate the ID within
   * the package stream that specifies the payload stream described here.
   */
  packageStreamId: number;

  /**
   * Uri/ByteRange of segment index i.e where to enrich our segment list
   */
  segmentIndexUri: string;
  segmentIndexRange: ByteRange;
  segmentIndexProvider: () => Promise<MediaSegment[]> = null;
  /**
   * If this is an alternate rendition media for example in HLS the group-ID,
   * it is what may be used to group various media together into a set
   * which is supposed to be rendered into coherent content
   * (eg various audio/text stream options timed against a video stream).
   */
  externalReferenceId: string;

  /**
   * Like sequence-no in HLS, or DASH template index
   */
  externalIndex: number;

  get segments(): MediaSegment[] {
    return this._segments;
  }

  get lastRefreshedAt(): number {
    return this._lastRefreshAt;
  }

  getUrl(): string { return this.segmentIndexUri || null; }

  getEarliestTimestamp(): MediaClockTime {
    if (!this._segments.length) {
      return NaN;
    }
    return this._segments[0].startTime;
  }

  getMeanSegmentDuration(): number {
    return this._segments.reduce((accu, segment) => {
      return accu + segment.duration;
    }, 0) / this._segments.length;
  }

  /**
   * @returns duration as sum of all segment durations. will be equal to window duration
   * if the media is gapless and has no time-plane discontinuities.
   */
  getCumulatedDuration(): MediaClockTime {
    return this.getSeekableTimeRanges().getCumulatedDuration();
  }

  /**
   * @returns duration as difference between last segment endTime and first segment startTime
   */
  getWindowDuration(): MediaClockTime {
    return this.getSeekableTimeRanges().getWindowDuration();
  }

  /**
   * Refresh/enrich media segments (e.g for external segment indices and for live)
   */
  refresh(autoReschedule: boolean = false): Promise<AdaptiveMedia> {
    if (!this.segmentIndexProvider) {
      return Promise.reject("No segment index provider set");
    }
    this._lastRefreshAt = Date.now();

    const reschedule = () => {
      this.scheduleUpdate(this.getMeanSegmentDuration(), () => {
        reschedule();
      })
    }

    log('going to refresh media index:', this.getUrl());

    return this.segmentIndexProvider()
      .then((newSegments) => {

        // only call this once we have new segments so
        // we can actually calculate average segment duration
        // this will be called once on the initial call to refresh
        // while scheduleUpdate doesn't set to true the autoReschedule flag
        // but we call reschedule via the reentrant closure in the callback here.
        if (autoReschedule) {
          reschedule();
        }

        Array.prototype.push.apply(this._segments, newSegments);
        return this;
      })
  }

  scheduleUpdate(timeSeconds: number, onRefresh: (refresh: Promise<AdaptiveMedia>) => void = null) {
    log('scheduling update of adaptive media index in:', timeSeconds);
    window.clearTimeout(this._updateTimer);
    this._updateTimer = window.setTimeout(() => {
      const refreshResult = this.refresh();
      if (onRefresh) { onRefresh(refreshResult); }
    }, timeSeconds * 1000);
  }

  /**
   * Activates/enables this media with the attached engine
   */
  activate(): Promise<boolean> {
    if (this.mediaEngine) {
      return this.mediaEngine.activateMediaStream(this)
    }
    return Promise.reject(false);
  }

  getSeekableTimeRanges(): TimeIntervalContainer {
    if (this._lastRefreshAt > this._lastTimeRangesCreatedAt) {
      this._updateTimeRanges();
    }
    return this._timeRanges;
  }

  /**
   *
   * @param range
   * @param partial
   * @returns segments array which are fully contained inside `range` (or only overlap when `partial` is true)
   */
  findSegmentsForTimeRange(range: TimeInterval, partial: boolean = false): MediaSegment[] {
    if (!partial) {
      return this._segments.filter((segment) => range.contains(segment.getTimeInterval()));
    } else {
      return this._segments.filter((segment) => range.overlapsWith(segment.getTimeInterval()));
    }
  }

  private _updateTimeRanges() {
    this._timeRanges = new TimeIntervalContainer();
    this._segments.forEach((segment) => {
      this._timeRanges.add(new TimeInterval(segment.startTime, segment.endTime));
    });
    this._lastTimeRangesCreatedAt = Date.now();
  }
}

/**
 * A set of segmented adaptive media stream representations with a given combination of content-types (see flags).
 *
 * This might be a valid playable combination of tracks (of which some might be optional).
 */
export class AdaptiveMediaSet extends Set<AdaptiveMedia> implements MediaContainer {
  parent: AdaptiveMediaPeriod
  mediaContainerInfo: MediaContainerInfo = new MediaContainerInfo()

  /**
   * @returns The default media if advertised,
   * or falls back on first media representation of the first set
   */
  getDefaultMedia(): AdaptiveMedia {
    return Array.from(this.values())[0];
  }
}

/**
 * A queriable collection of adaptive media sets. For example, each set might be an adaptation state.
 */
export class AdaptiveMediaPeriod {

  sets: AdaptiveMediaSet[] = [];

  /**
   * @returns The default adaptive-media-set if advertised,
   * or falls back on first media representation of the first set
   */
  getDefaultSet(): AdaptiveMediaSet {
    if (this.sets[0].size === 0) {
      throw new Error('No default media set found');
    }
    return this.sets[0];
  }

  getMediaListFromSet(index: number): AdaptiveMedia[] {
    return Array.from(this.sets[index]);
  }

  addSet(set: AdaptiveMediaSet) {
    if (set.parent) {
      throw new Error('Set already has a parent period');
    }
    set.parent = this;
    this.sets.push(set);
  }

  filterByContainedMediaTypes(mediaTypeFlags: MediaTypeSet, identical = false): AdaptiveMediaSet[] {
    return this.sets.filter((mediaSet) =>
      mediaSet.mediaContainerInfo.intersectsMediaTypeSet(mediaTypeFlags, identical)
    )
  }
}
