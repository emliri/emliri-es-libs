import {MediaSegment} from './media-segment'

export type VideoInfo = {
 width: number
 height: number
}

export type AudioInfo = {
  language: string
  channels: number
}

export type TextInfo = {
  language: string
}

export enum MediaTypeFlag {
  AUDIO = 0b001,
  VIDEO = 0b010,
  TEXT = 0b100
}

/**
 * Human-readable `MediaTypeFlag`
 * @param type
 */
export function getMediaTypeFlagName(type: MediaTypeFlag): string {
  switch(type) {
  case MediaTypeFlag.AUDIO: return 'audio'
  case MediaTypeFlag.VIDEO: return 'video'
  case MediaTypeFlag.TEXT: return 'text'
  default: return null
  }
}

/**
 * Represents what people refer to as rendition, quality level or representation, or media playlist
 *
 * Contains an array of segments and the metadata in common about these.
 */
export class AdaptiveMedia {

  constructor(mediaEngine: AdaptiveMediaEngine = null) {
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
export class AdaptiveMediaSet extends Set<AdaptiveMedia> {
  parent: AdaptiveMediaPeriod
  containedTypes: Set<MediaTypeFlag> = new Set()

  containsMediaType(type: MediaTypeFlag): boolean {
    return this.containedTypes.has(type)
  }
}

/**
 * A queriable collection of sets
 */
export class AdaptiveMediaPeriod {

  sets: AdaptiveMediaSet[] = []

  filterByContainedMediaTypes(mediaTypeFlags: Set<MediaTypeFlag>,
    combined = false): AdaptiveMediaSet[] {

    return this.sets.filter((mediaSet) => {
      let hasOne = false
      let hasAll = true

      mediaTypeFlags.forEach((mediaTypeFlag) => {

        hasOne = mediaSet.containedTypes.has(mediaTypeFlag)

        if (!hasOne && hasAll) {
          hasAll = false
        }
      })

      return combined ? hasAll : hasOne
    })
  }
}

export interface AdaptiveMediaEngine {

  enableMediaSet(set: AdaptiveMediaSet)

  activateMediaStream(stream: AdaptiveMedia): Promise<boolean>
}
