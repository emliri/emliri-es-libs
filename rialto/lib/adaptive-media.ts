import {MediaSegment} from './media-segment'

export type VideoInfo = {
 width: number
 height: number
}

export type AudioInfo = {
  language: string
}

export type TextInfo = {
  language: string
}

export enum MediaTypeFlag {
  AUDIO = 0b001,
  VIDEO = 0b010,
  TEXT = 0b100
}

export function getMediaTypeFlagName(type: MediaTypeFlag): string {
  switch(type) {
  case MediaTypeFlag.AUDIO: return 'audio'
  case MediaTypeFlag.VIDEO: return 'video'
  case MediaTypeFlag.TEXT: return 'text'
  default: return null
  }
}

export class MediaStream {

  constructor(mediaEngine: AdaptiveMediaEngine = null) {
    this.mediaEngine = mediaEngine
  }

  mediaEngine: AdaptiveMediaEngine
  parent: AdaptiveMediaSet
  segments: MediaSegment[]
  mimeType: string
  codecs: string
  bandwidth: number
  videoInfo: VideoInfo
  audioInfo: AudioInfo
  textInfo: TextInfo

  activate() {
    if (this.mediaEngine) {
      return this.mediaEngine.activateMediaStream(this)
    }
  }
}

export class AdaptiveMediaSet {
  parent: AdaptiveMediaPeriod
  containedTypes: Set<MediaTypeFlag>
  representations: MediaStream[]
}

export class AdaptiveMediaPeriod {
  adaptiveMediaSets: AdaptiveMediaSet[]

  filterByContainedMediaTypes(mediaTypeFlags: Set<MediaTypeFlag>,
    combined = false): AdaptiveMediaSet[] {

    return this.adaptiveMediaSets.filter((mediaSet) => {
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

  activateMediaStream(stream: MediaStream): Promise<boolean>
}
