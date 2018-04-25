import { AdaptiveMedia, AdaptiveMediaEngine, AdaptiveMediaSet } from "./adaptive-media";

export abstract class MediaClientPlugin implements AdaptiveMediaEngine {

  private mediaEl: HTMLMediaElement;

  constructor(mediaElement: HTMLMediaElement) {
    this.mediaEl = mediaElement;
  }

  getMediaElement(): HTMLMediaElement {
    return this.mediaEl;
  }

  abstract setSourceURL(url: string, mimeType?: string);
  abstract activateMediaStream(stream: AdaptiveMedia): Promise<boolean>
  abstract enableMediaSet(set: AdaptiveMediaSet)
}

