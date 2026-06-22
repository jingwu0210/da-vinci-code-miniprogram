/**
 * countdown —— 倒计时组件。
 * Props:  seconds, autoStart
 * Events: timeout → {}
 */
Component({
  properties: {
    seconds:    { type: Number, value: 60 },
    autoStart:  { type: Boolean, value: false },
  },
  data: {
    remaining: 0,
    running: false,
  },
  lifetimes: {
    attached() {
      if (this.properties.autoStart) this.start();
    },
    detached() {
      this.stop();
    },
  },
  methods: {
    start() {
      if (this.data.running) return;
      this.setData({ remaining: this.properties.seconds, running: true });
      this._timer = setInterval(() => {
        const r = this.data.remaining - 1;
        this.setData({ remaining: r });
        if (r <= 0) {
          this.stop();
          this.triggerEvent('timeout');
        }
      }, 1000);
    },
    stop() {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      this.setData({ running: false });
    },
  },
});
