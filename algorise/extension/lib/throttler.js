export class Throttler {
  constructor({ minimumDelayMs = 2500, jitterMs = 500, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
    this.minimumDelayMs = minimumDelayMs;
    this.jitterMs = jitterMs;
    this.sleep = sleep;
    this.lastRequestAt = 0;
  }

  async wait() {
    const jitter = Math.floor(Math.random() * this.jitterMs);
    const remaining = this.minimumDelayMs + jitter - (Date.now() - this.lastRequestAt);
    if (remaining > 0) await this.sleep(remaining);
    this.lastRequestAt = Date.now();
  }

  async run(task) {
    await this.wait();
    return task();
  }
}
