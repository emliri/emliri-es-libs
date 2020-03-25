export type SchedulerTaskFunction = () => void;

export type SchedulerTask = {
  function: SchedulerTaskFunction;
  priority: number;
  repeat: number;
  sleep?: boolean;
}

export enum SchedulerState {
  STOPPED = 0,
  STARTED = 1
}

export class Scheduler {

  private _tasks: Array<SchedulerTask> = new Array();
  private _intervalTimer: number = null;
  private _immediateTimer: number = null;
  private _accuracyTimer: number = null;
  private _runTasksBound: () => void = null;
  private _periodMs: number;
  private _enablePrio: boolean;
  private _enableAccurate: boolean;
  private _state: SchedulerState;
  private _nextTaskIndex: number;

  /**
   * @param {number} frameRate frames per second (fps)
   */
  constructor(frameRate: number) {
    this._runTasksBound = this._runTasks.bind(this);
    this._periodMs = (1 / frameRate) * 1000;
    this._enablePrio = true;
    this._enableAccurate = true;
    this._nextTaskIndex = null;
  }

  set prioritize(b: boolean) {
    this._enablePrio = b;
  }

  get prioritize(): boolean {
    return this._enablePrio;
  }

  set accurate(b: boolean) {
    if (this._state === SchedulerState.STARTED) {
      throw new Error('Can not set scheduler accuracy mode in STARTED state');
    }
    this._enableAccurate = b;
  }

  get accurate(): boolean {
    return this._enableAccurate;
  }

  get state(): SchedulerState {
    return this._state;
  }

  run(task: SchedulerTask): Scheduler {
    this._tasks.push(task);
    if (this._enablePrio) {
      // TODO we could probably optimize this sorting method
      //      by assuming the array already sorted upon next insertion
      this._tasks = this._tasks.sort((a, b) => {
        return a.priority - b.priority;
      })
    }
    return this;
  }

  runOnce(f: SchedulerTaskFunction, priority: number = 0): SchedulerTask {
    const task = {
      function: f,
      repeat: 1,
      priority
    };
    this.run(task);
    return task;
  }

  runSeveralTimes(f: SchedulerTaskFunction, times: number, priority: number = 0): SchedulerTask {
    const task = {
      function: f,
      repeat: times,
      priority
    };
    this.run(task);
    return task;
  }

  runAlways(f: SchedulerTaskFunction, priority: number = 0): SchedulerTask {
    const task = {
      function: f,
      repeat: -1,
      priority
    };
    this.run(task);
    return task;
  }

  close(task: SchedulerTask): boolean {
    const index = this._tasks.findIndex((t) => t === task);
    if (index > 0) {
      this._tasks.splice(index, 1);
      return true;
    } else {
      return false;
    }
  }

  start(): Scheduler {
    if (this._intervalTimer !== null) {
      throw new Error('Scheduler already running');
    } else {
      this._state = SchedulerState.STARTED;
      if (!this._enableAccurate) { // when not in accurate mode just set an interval
        this._scheduleNextImmediate();
        this._intervalTimer = window.setInterval(this._runTasksBound, this._periodMs);
      } else {
        this._scheduleNextImmediate();
        this._scheduleNextAccurately(this._periodMs);
      }
    }
    return this;
  }

  stop(): Scheduler {
    if (this._intervalTimer === null) {
      throw new Error('Scheduler already stopped');
    } else {
      this._state = SchedulerState.STOPPED;
      window.clearInterval(this._intervalTimer);
      window.clearTimeout(this._accuracyTimer);
      window.clearTimeout(this._immediateTimer);
      this._intervalTimer = null;
    }
    return this;
  }

  private _scheduleNextImmediate() {
    this._immediateTimer = window.setTimeout(this._runTasksBound, 0);
  }

  private _scheduleNextAccurately(timeOffsetMs: number) {
    this._accuracyTimer = window.setTimeout(this._runTasksBound,
      Math.max(this._periodMs - timeOffsetMs, 0));
  }

  private _runTasks() {
    const beginTime = new Date();

    this._nextTaskIndex = this._tasks.length;
    while(this._nextTaskIndex > 0) {
      const task: SchedulerTask = this._runNextTask();
      if (task.repeat > 0) {
        task.repeat--;
      }
      if (task.repeat === 0) {
        this._tasks.pop();
      }
      this._nextTaskIndex--;
    }

    const finishTime = new Date();
    const timeMs: number = finishTime.getTime() - beginTime.getTime();

    if (timeMs > this._periodMs) {
      console.warn('Tasks execution took longer than one scheduling frame duration');
    }
  }

  private _runNextTask(): SchedulerTask {
    const task: SchedulerTask = this._tasks[this._nextTaskIndex];
    task.function();
    return task;
  }
}
