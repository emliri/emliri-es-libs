// TODO: Move to Objec-TS long-term

const PREFIX_ROOT = 'R14lt0'

// Disables all logs when false, overrides all local settings
// When true, logging levels are applied as expected per category
const GLOBAL_LOG_ENABLE = true;

export type LoggerFunc = (...args: any[]) => void

export type Logger = {
  info: LoggerFunc,
  log: LoggerFunc
  debug: LoggerFunc
  warn: LoggerFunc
  error: LoggerFunc
}

const noop = () => {};

const getPrefix = function(type: string, category: string): string {
    const prefix = `[${PREFIX_ROOT}]:[${type}]:[${category}]>`
    return prefix;
};

export enum LoggerLevels {
    ON = Infinity,
    LOG = 5,
    INFO = 4,
    DEBUG = 3,
    WARN = 2,
    ERROR = 1,
    OFF = 0
}

export const getLogger = function(category: string, level: number = LoggerLevels.ON): Logger {

    if (!GLOBAL_LOG_ENABLE) {
        level = LoggerLevels.OFF
    }

    return {
        info: level >= LoggerLevels.INFO ? console.info.bind(console, getPrefix('i', category)) : noop,
        log: level >= LoggerLevels.LOG ? console.log.bind(console, getPrefix('l', category)) : noop,
        debug: level >= LoggerLevels.DEBUG ? console.debug.bind(console, getPrefix('d', category)) : noop,
        warn: level >= LoggerLevels.WARN ? console.warn.bind(console, getPrefix('w', category)) : noop,
        error: level >= LoggerLevels.ERROR ? console.error.bind(console, getPrefix('e', category)) : noop
    }
};

