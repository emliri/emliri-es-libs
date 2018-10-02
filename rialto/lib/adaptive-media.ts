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

/**
 * Essentially, a sequence of media segments that can be consumed as a stream.
 *
 * Represents what people refer to as rendition, quality level or representation, or media playlist.
 *
 * Contains an array of segments and the metadata in common about these.
 */
export class AdaptiveMedia extends CloneableScaffold<AdaptiveMedia> {

  private _segments: MediaSegment[] = [];

  constructor(mediaEngine: AdaptiveMediaEngine = null) {
    super()
    this.mediaEngine = mediaEngine
  }

  mediaEngine: AdaptiveMediaEngine
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

  getUrl(): string { return this.segmentIndexUri || null; }

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

  /**
   * Refresh/enrich media segments (e.g for external segment indices and for live)
   */
  refresh(): Promise<AdaptiveMedia> {
    if (!this.segmentIndexProvider) {
      return Promise.reject("No segment index provider set");
    }
    return this.segmentIndexProvider()
      .then((newSegments) => {
        Array.prototype.push.apply(this.segments, newSegments);
        return this;
      })
  }

  /**
   * Activates/enables a certain stream
   */
  activate() {
    if (this.mediaEngine) {
      return this.mediaEngine.activateMediaStream(this)
    }
    return false;
  }
}

/**
 * A set of segmented adaptive media stream representations with a given combination of content-types (see flags).
 *
 *
 */
export class AdaptiveMediaSet extends Set<AdaptiveMedia> implements MediaContainer {
  parent: AdaptiveMediaPeriod
  mediaContainerInfo: MediaContainerInfo = new MediaContainerInfo()
}

/**
 * A queriable collection of adaptive media sets.
 */
export class AdaptiveMediaPeriod {

  sets: AdaptiveMediaSet[] = [];

  /**
   * @returns The default media if advertised, or falls back on first media representation of the first set
   */
  getDefaultMedia(): AdaptiveMedia {
    if (this.sets[0].size === 0) {
      throw new Error('No default media found');
    }
    return this.sets[0].values().next().value;
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
