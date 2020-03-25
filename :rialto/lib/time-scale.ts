export class TimeScale {
  constructor(private _base: number = 1) {}

  get scale(): number {
    return 1 / this._base;
  }

  get base(): number {
    return this._base;
  }

  normalize(value): number {
    return value * this._base;
  }

  denormalize(normalValue: number) {
    return normalValue / this._base;
  }
}

export function toNormalizedFromTimebase(value: number, base: number) {
  return value * base;
}

export function toTimebaseFromNormal(value: number, base: number) {
  return value / base;
}

export function toNormalizedFromTimescale(value: number, scale: number) {
  return toNormalizedFromTimebase(value, 1 / scale);
}

export function toTimescaleFromNormal(value: number, scale: number) {
  return toTimebaseFromNormal(value, 1 / scale);
}

export function toSecondsFromMillis(millis) {
  return toNormalizedFromTimebase(millis, 1/1000)
}

export function toMillsFromSeconds(seconds) {
  return toTimebaseFromNormal(seconds, 1/1000);
}

export function toSecondsFromMicros(millis) {
  return toNormalizedFromTimebase(millis, 1/1000000)
}

export function toSecondsFromNanos(millis) {
  return toNormalizedFromTimebase(millis, 1/1000000000)
}


