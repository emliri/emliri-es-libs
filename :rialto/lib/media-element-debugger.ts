/**
 * @author Marton Salomvary
 * @see https://salomvary.com
 */

/**
 * All the HTMLMediaElement events
 */
const events: string[] = [
  'abort',
  'canplay',
  'canplaythrough',
  'durationchange',
  'emptied',
  'encrypted',
  'ended',
  'error',
  'interruptbegin',
  'interruptend',
  'loadeddata',
  'loadedmetadata',
  'loadstart',
  'pause',
  'play',
  'playing',
  'progress',
  'ratechange',
  'seeked',
  'seeking',
  'stalled',
  'suspend',
  'timeupdate',
  'volumechange',
  'waiting'
]

/**
 *
 * @param {HTMLMediaElement} element
 */
export function attach (element: HTMLMediaElement) {
  events.forEach(_ => element.addEventListener(_, log))
}

export function detach (element: HTMLMediaElement) {
  events.forEach(_ => element.removeEventListener(_, log))
}

const padLength = Math.max(...events.map(_ => _.length))

function log (event: Event) {
  console.log(format(event))
}

function format (event: Event) {
  const el = <HTMLMediaElement>event.target
  return `[${event.type['padEnd'](padLength)}] s: ${el.readyState} t: ${formatTime(el.currentTime)}/${formatTime(el.duration)}`
}

function formatTime (time: number) {
  // 2 digits in decimal notation
  return Math.round(time * 100) / 100
}
