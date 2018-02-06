import {Resource, DecryptableResource, ParseableResource} from './resource'

import {mediaCacheInstance} from './media-cache'
import {MediaLocator} from './media-locator'

import {
  VideoInfo,
  AudioInfo,
  TextInfo,
  MediaTypeFlag,
  MediaContainer,
  MediaContainerInfo
} from './media-container-info'

import {getLogger} from './logger'

const {
  log
} = getLogger('media-segment')

/**
 *
 * Represents a time-bound segment of a media
 *
 * @fires fetch:aborted
 * @fires fetch:progress
 * @fires fetch:errored
 * @fires fetch:succeeded
 *
 * @fires buffer:set
 * @fires buffer:clear
 */
export class MediaSegment extends Resource implements MediaContainer, DecryptableResource {

  public cached: boolean;

  private locator_: MediaLocator;

  mediaContainerInfo: MediaContainerInfo = new MediaContainerInfo()

  constructor(locator: MediaLocator, mimeType: string = null, cached = false) {
    super(locator.uri, locator.byteRange, mimeType)

    this.cached = cached
    this.locator_ = locator
  }

  hasBeenParsed() { return false }

  parse() { return Promise.resolve(this) }

  decrypt() {
    return null
  }

  get startTime(): number {
    return this.locator_.startTime
  }

  get endTime(): number {
    return this.locator_.endTime
  }
}
