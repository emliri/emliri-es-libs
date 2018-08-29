import * as m3u8Parser from 'm3u8-parser';

import {Resource, ResourceEvents, ParseableResource} from './resource'

import {ByteRange} from './byte-range'

import {AdaptiveMediaPeriod, AdaptiveMediaSet, AdaptiveMedia} from './adaptive-media'

import {getLogger, LoggerLevels} from './logger'
import { MediaSegment, MediaLocator } from '..';

const {
  log,
  warn
} = getLogger('hls-m3u8', LoggerLevels.ON)

export enum HlsM3u8FileType {
  MASTER = 'master',
  MEDIA = 'media'
}

export enum HlsM3u8MediaPlaylistType {
  LIVE = 'live',
  VOD = 'vod'
}

export class HlsM3u8File extends Resource implements ParseableResource<AdaptiveMediaPeriod[]>  {

  private _m3u8ParserResult: any; // this comes from the plain JS m3u8-parser module

  private _parsed: boolean = false;
  private _periods: AdaptiveMediaPeriod[] = [new AdaptiveMediaPeriod()];
  private _fileType: HlsM3u8FileType = null;

  private _adaptiveMediaSet: AdaptiveMediaSet = new AdaptiveMediaSet();
  private _hlsMediaPlaylists: HlsM3u8MediaPlaylist[] = [];

  constructor(uri, fileType: HlsM3u8FileType = null, baseUri?: string) {
    super(uri, null, baseUri);

    this._fileType = fileType;

    this._periods[0].sets.push(this._adaptiveMediaSet);
  }

  hasBeenParsed() {
    return this._parsed
  }

  parse(): Promise<AdaptiveMediaPeriod[]> {
    const buf = this.buffer
    if (!buf) {
      throw new Error('No data to parse')
    }

    if (this._parsed) {
      return Promise.resolve(this._periods);
    }

    const text = String.fromCharCode.apply(null, new Uint8Array(buf));

    const parser: any = new m3u8Parser.Parser();

    parser.push(text);
    parser.end();

    console.log(parser.manifest);

    const manifest = this._m3u8ParserResult = parser.manifest;

    if (manifest.playlists && manifest.playlists.length) {
      this._fileType = HlsM3u8FileType.MASTER;
      this._processMasterPlaylist();
    } else if(manifest.segments && manifest.segments.length) {
      this._fileType = HlsM3u8FileType.MEDIA;
      this._processMediaPlaylist();
    } else {
      throw new Error('Could not determine type of HLS playlist');
    }

    this._parsed = true;
    return Promise.resolve(this._periods);
  }

  private _processMasterPlaylist() {
    this._m3u8ParserResult.playlists.forEach((playlist) => {

      const media: AdaptiveMedia = new AdaptiveMedia();

      const a = playlist.attributes;

      media.bandwidth = a.BANDWIDTH; // || a.['AVERAGE-BANDWIDTH'];
      media.codecs = a.CODECS;
      media.videoInfo = {
        width: a.RESOLUTION.width,
        height: a.RESOLUTION.height
      }
      media.label = a.NAME;

      media.segmentIndexUri = playlist.uri;
      media.segmentIndexRange = null;

      log(media)

      this._adaptiveMediaSet.add(media);

      const hlsMediPlaylistFile =
        new HlsM3u8File(media.segmentIndexUri, HlsM3u8FileType.MEDIA, this.getUrl());

      const hlsMediaPlaylist = new HlsM3u8MediaPlaylist(
        hlsMediPlaylistFile
      );

      this._hlsMediaPlaylists.push(hlsMediaPlaylist);

      media.segmentIndexProvider = () => {
        return hlsMediaPlaylist.fetch()
          .then(() =>  hlsMediaPlaylist.parse())
          .then((adaptiveMedia: AdaptiveMedia) => adaptiveMedia.segments)
      }

    });
  }

  private _processMediaPlaylist() {
    log('parsing media playlist');

    const media: AdaptiveMedia = new AdaptiveMedia();

    let startTime: number = 0;

    this._m3u8ParserResult.segments.forEach((segment: any) => {
      console.log(segment);

      const endTime = startTime + segment.duration;

      const mediaSegment = new MediaSegment(
        new MediaLocator(segment.uri, null, startTime, endTime)
      );

      media.segments.push(mediaSegment);

      startTime = endTime;
    });

    this._adaptiveMediaSet.add(media);
  }

  fetch(): Promise<Resource> {
    return super.fetch().then((r: Resource) => {
      log('data loaded, parsing M3U8')
      return this.parse()
    }).then(() => {
      return this;
    })
  }

  getM3u8FileType(): HlsM3u8FileType {
    return this._fileType;
  }

  getM3u8ParserResult(): any {
    return this._m3u8ParserResult;
  }
}

export class HlsM3u8MediaPlaylist extends Resource implements ParseableResource<AdaptiveMedia> {
  private _file: HlsM3u8File;

  private _playlistType: HlsM3u8MediaPlaylistType;

  constructor(m3u8File: HlsM3u8File) {
    // automatically resolve the inner resource if it has a base URI
    super(m3u8File.getUrl());

    if (m3u8File.hasBeenParsed()) {
      if (m3u8File.getM3u8FileType() !== HlsM3u8FileType.MEDIA) {
        throw new Error('File is not a media playlist');
      }
    }

    this._file = m3u8File;
  }

  hasBeenParsed() {
    return this._file.hasBeenParsed();
  }

  parse(): Promise<AdaptiveMedia> {
    return this._file.parse()
      .then((adaptiveMediaPeriods) => {

        console.log(adaptiveMediaPeriods)

        // We assume that the embedded file object
        // only parsed exactly one adaptive-media list
        // and has one period (usually the case with HLS :))
        return adaptiveMediaPeriods[0].getDefaultMedia();
      })
  }

  fetch(): Promise<Resource> {
    return super.fetch().then((r: Resource) => {
      log('data loaded, parsing M3U8')

      this._file.setBuffer(r.buffer);

      return this.parse()
    }).then(() => {
      return this;
    })
  }
}