const cacheGuard = {
  appname: 'CACHEGUARD',
  loaded: false,
  dummyElement: {},
  loadTime: {},
  max_wait: 5000,
  max_lastreqdelay: 30000,
  session: {
    allowedReferer: [self.location.hostname],
    u: {},
    k: {},
    profile: {},
  },
  resetProfile() {
    this.session.profile = {};
  },
  msgLabel: ['cacheguard'],
  msgHandler(label, msg) {
    if (msg === 'reset') this.resetProfile();
  },
  async load() {
    this.session = (await swappInst.storage.get('cacheGuard')) || this.session;
    this.dummyElement = {};
    this.loadTime = {};
    this.loaded = true;
  },
  save() {
    console.log('Current average network delay:', this.session.u);
    swappInst.storage.set('cacheGuard', this.session);
  },
  async onswactivate() {
    await this.load();
  },
  setAllowedReferer(lst) {
    this.session.allowedReferer.push(...lst);
    this.save();
  },
  async sleep(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  },
  async reqMatch(fObj) {
    if (!this.loaded) await this.load();
    const url = new URL(fObj.getMetadata().url);
    const origin = url.origin;

    this.loadTime[url.href] = performance.now();

    if (!this.session.u[origin]) this.session.u[origin] = 0;
    if (!this.session.k[origin]) this.session.k[origin] = 0;

    if (fObj.getDecision() === 'cache') return true;

    const path = url.pathname;
    if (this.dummyElement[path]) return true;

    return false;
  },
  async reqAction(fObj) {
    const url = new URL(fObj.getMetadata().url);
    const path = url.pathname;
    const origin = url.origin;

    if (this.dummyElement[path]) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.session.u[origin])
      );
      fObj.setBody('');
      fObj.setDecision('cache');
    }

    const r = fObj.getMetadata().referrer;
    if (r) {
      const referer = new URL(r).host;
      if (!this.session.allowedReferer.includes(referer)) {
        fObj.setDecision('drop');
      }
    }

    return fObj;
  },
  async respMatch(fObj) {
    const id = fObj.getMetadata().url;
    const url = new URL(fObj.getMetadata().url);
    const path = url.pathname;
    const origin = url.origin;

    if (this.dummyElement[path]) {
      delete this.dummyElement[path];
      return false;
    }

    if (this.loadTime.hasOwnProperty(id)) {
      const currLoad = performance.now() - this.loadTime[id];
      delete this.loadTime[id];

      if (fObj.getDecision() !== 'cache') {
        this.session.k[origin]++;
        this.session.u[origin] =
          this.session.u[origin] +
          (currLoad - this.session.u[origin]) / this.session.k[origin];
        this.save();
      }

      if (Object.keys(this.loadTime).length > 20) this.loadTime = {};

      if (
        this.session.u[origin] > this.max_wait ||
        this.session.k[origin] > 150 ||
        this.session.u[origin] < 0
      ) {
        this.session.u[origin] = 0;
        this.session.k[origin] = 0;
        this.loadTime = {};
        this.save();
      }
    }

    if (swappInst.isWebpage(fObj.getMetadata().headers.get('Content-Type'))) {
      this.lastDocumentRequest = {
        url: fObj.getMetadata().url,
        time: performance.now(),
      };
      return true;
    }

    if (
      this.lastDocumentRequest &&
      performance.now() - this.lastDocumentRequest.time < this.max_lastreqdelay
    ) {
      const p = this.session.profile[this.lastDocumentRequest.url];
      if (p && p.includes(fObj.getMetadata().url)) return false;

      if (!p) this.session.profile[this.lastDocumentRequest.url] = [];
      this.session.profile[this.lastDocumentRequest.url].push(
        fObj.getMetadata().url
      );
      this.save();
      return true;
    }

    return true;
  },
  respAction(fObj) {
    const randomelem = this.genrandomid();
    fObj.setBody(
      swappInst.writeAfterMatch(
        fObj.getBody(),
        `\n\t<script src="${randomelem}" async></script>`,
        '<head>'
      )
    );
    this.dummyElement[randomelem] = performance.now();
    return fObj;
  },
  genrandomid() {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    const length = 10;
    const result = [];
    for (let i = 0; i < length; i++) {
      result.push(
        characters.charAt(Math.floor(Math.random() * charactersLength))
      );
    }
    return '/' + result.join('');
  },
  tcbMatch: true,
  tcbAction: `
      document.addEventListener("resetCacheGuard", () => {
        sendMsg(["cacheguard"], "reset");
      });
    `,
};

console.log('[C]ache[G]uard activated');
swappInst.addApp(cacheGuard);
