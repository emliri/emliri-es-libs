import { AdaptiveMediaClient, AdaptiveMediaStreamConsumer } from "./adaptive-media-client";
import { AdaptiveMedia, AdaptiveMediaSet, AdaptiveMediaPeriod } from "./adaptive-media";

import { Scheduler } from '../../objec-ts/lib/scheduler';
import { HlsM3u8File } from "./hls-m3u8";
import { MediaSourceController } from "./media-source-controller";

import { getLogger } from './logger';
import { MediaSegment } from "./media-segment";

const { log } = getLogger("x-media-client");

const SCHEDULER_FRAMERATE: number = 1;

export class XMediaClient extends AdaptiveMediaClient {

  scheduler: Scheduler = new Scheduler(SCHEDULER_FRAMERATE);

  streams: AdaptiveMediaStreamConsumer[] = [];

  mediaSourceController: MediaSourceController;
  mediaSource: MediaSource;

  constructor(mediaElement: HTMLMediaElement) {
    super(mediaElement);
  }

  setSourceURL(url: string, mimeType?: string) {

    // TODO check mimeType

    if (this.mediaSourceController) {
      throw new Error('Media-source controller is not null');
    }

    this.mediaSourceController = new MediaSourceController();

    this.setMediaSource(this.mediaSourceController.mediaSource);

    const m3u8 = new HlsM3u8File(url);
    m3u8.fetch().then(() => {
      m3u8.parse().then((adaptiveMediaPeriods: AdaptiveMediaPeriod[]) => {
        const media: AdaptiveMedia = adaptiveMediaPeriods[0].getDefaultMedia();

        media.refresh().then((media: AdaptiveMedia) => {

          //console.log(media.segments);

          const consumer: AdaptiveMediaStreamConsumer =
            new AdaptiveMediaStreamConsumer(media, this.scheduler, (segment: MediaSegment) => {
              this._onSegmentBuffered(segment);
            });

          this.streams.push(consumer);

          this.mediaSourceController.addSourceBufferQueue('video/mp4; codecs="avc1.4dc032,mp4a.40.2"'); // TODO

          consumer.updateFetchTarget(5);
        });

      });
    });
  }

  activateMediaStream(stream: AdaptiveMedia): Promise<boolean> {
    return Promise.resolve(true);
  }

  enableMediaSet(set: AdaptiveMediaSet) {}

  private _onSegmentBuffered(segment: MediaSegment) {

    log('segment buffered:', segment.uri);

    this.mediaSourceController.sourceBufferQueues[0].appendMediaSegment(segment);
  }

}

