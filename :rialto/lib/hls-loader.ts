import { HlsM3u8File } from "./hls-m3u8";
import { AdaptiveMedia, AdaptiveMediaPeriod } from "./adaptive-media";
import { AdaptiveMediaStreamConsumer } from "./adaptive-stream-consumer";
import { MediaSegment } from "./media-segment";

export class HlsLoader {

  private _media: AdaptiveMedia = null;
  private _streamConsumer: AdaptiveMediaStreamConsumer = null;

  constructor(url: string) {

    const m3u8 = new HlsM3u8File(url);
    m3u8.fetch().then(() => {
      m3u8.parse().then((adaptiveMediaPeriods: AdaptiveMediaPeriod[]) => {
        this._onM3u8Parsed(adaptiveMediaPeriods);
      });
    });

  }

  private _onM3u8Parsed(adaptiveMediaPeriods: AdaptiveMediaPeriod[]) {

    const streams = [];

    const media: AdaptiveMedia = adaptiveMediaPeriods[0].getDefaultSet().getDefaultMedia();
    media.refresh().then((media: AdaptiveMedia) => {

      const consumer: AdaptiveMediaStreamConsumer =
        new AdaptiveMediaStreamConsumer(media, (segment: MediaSegment) => {

          //

          console.log('loaded:', segment.uri);

        });

      this._streamConsumer = consumer;

      streams.push(consumer);

    });

    this._media = media;
  }


}
