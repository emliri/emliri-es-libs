import { AdaptiveMedia, AdaptiveMediaEngine, AdaptiveMediaSet } from "./adaptive-media";

export abstract class AdaptiveMediaClientPlugin implements AdaptiveMediaEngine {

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

