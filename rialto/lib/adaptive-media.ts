import {MediaSegment} from './media-segment'

import { CloneableScaffold } from "./cloneable";

import {
  VideoInfo,
  AudioInfo,
  TextInfo,
  MediaTypeFlag,
  MediaContainer,
  MediaContainerInfo,
  MediaTypeSet
} from './media-container-info'

/**
 * Represents what people refer to as rendition, quality level or representation, or media playlist
 *
 * Contains an array of segments and the metadata in common about these.
 */
export class AdaptiveMedia extends CloneableScaffold<AdaptiveMedia> {

  constructor(mediaEngine: AdaptiveMediaEngine = null) {
    super()
    this.mediaEngine = mediaEngine
  }

  mediaEngine: AdaptiveMediaEngine
  parent: AdaptiveMediaSet
  segments: MediaSegment[] = []
  mimeType: string
  codecs: string
  bandwidth: number
  videoInfo: VideoInfo
  audioInfo: AudioInfo
  textInfo: TextInfo

  /**
   * Activates/enables a certain stream
   */
  activate() {
    if (this.mediaEngine) {
      return this.mediaEngine.activateMediaStream(this)
    }
  }
}

/**
 * A set of media representations with a given combination of content-types (see flags)
 */
export class AdaptiveMediaSet extends Set<AdaptiveMedia> implements MediaContainer {
  parent: AdaptiveMediaPeriod
  mediaContainerInfo: MediaContainerInfo  = new MediaContainerInfo()
}

/**
 * A queriable collection of sets
 */
export class AdaptiveMediaPeriod {

  sets: AdaptiveMediaSet[] = []

  filterByContainedMediaTypes(mediaTypeFlags: MediaTypeSet, identical = false): AdaptiveMediaSet[] {
    return this.sets.filter((mediaSet) =>
      mediaSet.mediaContainerInfo.intersectsMediaTypeSet(mediaTypeFlags, identical)
    )
  }
}

export interface AdaptiveMediaEngine {

  enableMediaSet(set: AdaptiveMediaSet)

  activateMediaStream(stream: AdaptiveMedia): Promise<boolean>
}
