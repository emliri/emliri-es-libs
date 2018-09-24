import {getLogger} from './logger'

import {
  MediaSession
} from './media-session'

import {
  PlaybackStateMachineTransitionReasons, PlaybackState
} from './playback-state-machine'

const {
  log
} = getLogger('media-element-player')


export enum MediaPlayerAction {
  SEEK = 'seek',
  PLAY = 'play',
  PAUSE = 'pause',
  SET_SOURCE = 'set:source',
  SET_MUTED = 'set:muted',
  SET_VOLUME = 'set:volume'
}

export type MediaPlayerActionValue = (string | boolean | number)

export type MediaPlayerActionQueueItem = {
  action: MediaPlayerAction;
  value: MediaPlayerActionValue;
  timeoutMs?: number;
  callback: (ok: boolean, error?: Error) => void;
}

export class MediaElementController {
  private _mediaEl: HTMLMediaElement;
  private _actionQueue: Array<MediaPlayerActionQueueItem> = []
  private _execTimer = null;

  constructor(mediaEl: HTMLMediaElement) {
    this._mediaEl = mediaEl;
  }

  private _execSeek(item: MediaPlayerActionQueueItem) {
    const seekTarget = <number> item.value;

    if (typeof seekTarget !== 'number') {
      item.callback(false, new Error('Seek action needs number type value'));
    }
    const eventHandler = () => {
      if (this._mediaEl.currentTime === seekTarget) {
        this._mediaEl.removeEventListener('seeked', eventHandler)
        item.callback(true);
      }
    }
    this._mediaEl.addEventListener('seeked', eventHandler)
    this._mediaEl.currentTime = seekTarget;
  }

  private _execPause(item: MediaPlayerActionQueueItem) {
    this._mediaEl.pause();
    item.callback(true);
  }

  private _execPlay(item: MediaPlayerActionQueueItem) {
    this._mediaEl.play().then(() => {
      //console.log('play promise resolved')
      item.callback(true);
    }).catch((err) => {
      item.callback(false, err);
    });
  }

  private _execSetSource(item: MediaPlayerActionQueueItem) {
    if (typeof item.value !== 'string') {
      item.callback(false, new Error('Set-source action needs string type (URI) as value'));
      return;
    }
    this._mediaEl.src = <string> item.value;
    item.callback(true)
  }

  private _execSetVolume(item: MediaPlayerActionQueueItem) {
    if (typeof item.value !== 'number') {
      item.callback(false, new Error('Set-volume action needs string type (URI) as value'));
      return;
    }
    this._mediaEl.volume = item.value
    item.callback(true)
  }

  execOneAction(): boolean {
    const item: MediaPlayerActionQueueItem = this._actionQueue.shift();
    if (!item) {
      return false;
    }

    switch(item.action) {
    case MediaPlayerAction.SEEK:
      this._execSeek(item);
      break;
    case MediaPlayerAction.PLAY:
      this._execPlay(item);
      break;
    case MediaPlayerAction.PAUSE:
      this._execPause(item);
      break;
    case MediaPlayerAction.SET_SOURCE:
      this._execSetSource(item);
      break;
    case MediaPlayerAction.SET_VOLUME:
      this._execSetVolume(item);
      break;
    default:
      throw new Error('Action not implemented: ' + item.action)
    }
    return true;
  }

  scheduleNextActionExec() {
    this.cancelNextActionExec();
    this._execTimer = setTimeout(() => {
      if (this.execOneAction()) {
        this.scheduleNextActionExec();
      }
    }, 0)
  }

  cancelNextActionExec() {
    if (this._execTimer) {
      clearTimeout(this._execTimer)
    }
  }

  enqueueAction(cmd: MediaPlayerActionQueueItem, unshift: boolean = false) {
    if (unshift) {
      this._actionQueue.unshift(cmd)
    } else {
      this._actionQueue.push(cmd)
    }
    this.scheduleNextActionExec();
  }

  flushAllActions() {
    this.cancelNextActionExec();
    this._actionQueue = []
  }

  flushActions(action: MediaPlayerAction) {
    this.cancelNextActionExec();
    const actionQSwap = this._actionQueue
    this._actionQueue = []
    actionQSwap.forEach((item) => {
      if (item.action === action) {
        this._actionQueue.push(item)
      }
    })
  }

  do(action: MediaPlayerAction, value: MediaPlayerActionValue = null, async: boolean = true, timeoutMs: number = 0) {
    return new Promise<MediaPlayerActionQueueItem>((resolve, reject) => {
      const actionObj: MediaPlayerActionQueueItem = {
        action,
        value,
        callback: (ok: boolean, error?: Error) => {
          if (ok) {
            resolve(actionObj);
          } else {
            reject(error);
          }
        }
      }
      if (timeoutMs > 0) {
        const timeoutId = setTimeout(() => {
          // TODO ...
        }, timeoutMs)
      }

      this.enqueueAction(actionObj, async)
      if (!async) {
        this.execOneAction()
      }

    })
  }
}

type MediaPlayerActionResult = MediaPlayerActionQueueItem

export class MediaPlayer {

  private _mediaElement: HTMLMediaElement = null;
  private _mediaSession: MediaSession = null;
  private _mediaElementController: MediaElementController = null;
  private _onStateChange: () => void;

  constructor(mediaElement: HTMLMediaElement, onStateChange?: () => void) {

    if (!mediaElement) {
      throw new Error('Need a media element to start with');
    }

    this.takeMediaElement_(mediaElement);

    const mediaSession = new MediaSession(mediaElement,
      this.onMediaElementEventTranslatedCb_.bind(this),
      this.onPlaybackStateMachineTransitionCb_.bind(this));

    this._onStateChange = onStateChange;
    this._mediaSession = mediaSession;
    this._mediaElementController = new MediaElementController(mediaElement);
  }

  get state(): PlaybackState {
    return this._mediaSession.mediaPlaybackState
  }

  get time(): number {
    return this._mediaSession.clock.time
  }

  get duration(): number {
    return this._mediaSession.mediaDuration
  }

  setSource(url: string): Promise<MediaPlayerActionResult> {
    return this._mediaElementController.do(MediaPlayerAction.SET_SOURCE, url)
  }

  setVolume(vol: number): Promise<MediaPlayerActionResult> {
    return this._mediaElementController.do(MediaPlayerAction.SET_VOLUME, vol);
  }

  play(): Promise<MediaPlayerActionResult> {
    return this._mediaElementController.do(MediaPlayerAction.PLAY)
  }

  pause(): Promise<MediaPlayerActionResult> {
    return this._mediaElementController.do(MediaPlayerAction.PAUSE)
  }

  seek(target: number, relative: boolean = false): Promise<MediaPlayerActionResult> {
    if (typeof target !== 'number') {
      throw new Error('Seek target should be a number');
    }

    // Resolve to absolute if relative
    if (relative) {
      target = this.time + target;
    }

    // Cap to media range
    if (target < 0) {
      target = 0
    }

    if (target > this.duration) {
      target = this.duration
    }

    this._mediaElementController.flushActions(MediaPlayerAction.SEEK)

    // Optional: Round to make sure the number is finite
    // target = Math.round(target * 1000) / 1000

    this._mediaSession.setSeeking(true)

    // verify post-seek condition: all possible pre-seeking states can only collapse to playing or paused
    const postSeekingState = (this.state !== PlaybackState.PLAYING) ? PlaybackState.PAUSED : PlaybackState.PLAYING

    //console.log('expected post-seek state', postSeekingState)

    const actionPromise = this._mediaElementController.do(MediaPlayerAction.SEEK, target)
    return actionPromise.then(() => {

      this._mediaSession.setSeeking(false)

      const currentState = this.state

      //console.log('seeked and state is', currentState)

      if (postSeekingState !== currentState) {
        const err = `Wrong state after seek. Expected "${postSeekingState}" but am in "${this.state}"`
        console.warn(err)
        throw new Error(err)
      }

      return actionPromise
    })
  }

  private onPlaybackStateMachineTransitionCb_(mediaSession: MediaSession,
      reason: PlaybackStateMachineTransitionReasons) {

    if (this._onStateChange) {
      this._onStateChange()
    }
    //
  }

  private onMediaElementEventTranslatedCb_(mediaSession, eventReason) {
    //console.log(eventReason)
  }

  private takeMediaElement_(mediaElement: HTMLMediaElement) {
    this._mediaElement = mediaElement;
  }

  /**
   * Reset a media element for re-usal
   */
  private resetMediaElement_() {
    this._mediaElement.controls = false;
    this._mediaElement.innerHTML = '<p>Your user agent does not support the HTML5 Video element.</p>';
    this._mediaElement.preload = 'none';
    this._mediaElement.src = null;
    //this._mediaElement.
    // FIXME: this._mediaElement.poster = ... // should wipe poster if any

  }

}
