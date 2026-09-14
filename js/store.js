(function (global) {
  const KB = (global.KB = global.KB || {});

  function getServerConfig() {
    const raw = global.KB_SERVER || {};
    const host = String(raw.host != null ? raw.host : "localhost").trim() || "localhost";
    const portNum = Number(raw.port);
    const port = Number.isFinite(portNum) && portNum > 0 ? portNum : 8085;
    let getPath = String(raw.getPath || "/data/kb.json").trim() || "/data/kb.json";
    let postPath = String(raw.postPath || "/api/data").trim() || "/api/data";
    if (!getPath.startsWith("/")) getPath = "/" + getPath;
    if (!postPath.startsWith("/")) postPath = "/" + postPath;
    return { host, port, getPath, postPath };
  }

  function getOrigin() {
    const { host, port } = getServerConfig();
    return "http://" + host + ":" + port;
  }

  function isOnConfiguredLocalServer() {
    try {
      const configured = new URL(getOrigin());
      const herePort = global.location.port || (global.location.protocol === "https:" ? "443" : "80");
      const cfgPort = configured.port || (configured.protocol === "https:" ? "443" : "80");
      return (
        global.location.protocol === configured.protocol &&
        global.location.hostname === configured.hostname &&
        herePort === cfgPort
      );
    } catch (e) {
      return false;
    }
  }

  /**
   * Local server (KB_SERVER host:port): absolute paths (/data/kb.json, /api/data).
   * Elsewhere (e.g. GitHub Pages): same-origin relative paths so they resolve
   * under the project base (e.g. /kb-workbench/data/kb.json). Never rewrite to localhost.
   */
  function requestUrl(path) {
    if (isOnConfiguredLocalServer()) {
      return path;
    }
    return String(path || "").replace(/^\//, "");
  }

  async function parseJsonBody(res) {
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let text;
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      text = new TextDecoder("utf-8").decode(buf);
    } else {
      text = new TextDecoder("utf-8").decode(buf);
    }
    text = String(text || "").replace(/^\uFEFF/, "");
    return JSON.parse(text);
  }

  function emptyDoc() {
    return {
      version: 1,
      app: "kb",
      updatedAt: new Date().toISOString(),
      meta: {},
      articles: []
    };
  }

  const store = {
    data: emptyDoc(),
    dirty: false,
    loaded: false,
    status: "idle", // idle | loading | saving | saved | error | dirty
    _listeners: [],

    onChange(fn) {
      this._listeners.push(fn);
      return () => {
        this._listeners = this._listeners.filter((f) => f !== fn);
      };
    },

    _emit() {
      this._listeners.forEach((fn) => {
        try {
          fn(this);
        } catch (e) {
          console.error(e);
        }
      });
    },

    markDirty() {
      if (!this.dirty) {
        this.dirty = true;
        this.status = "dirty";
        this._emit();
      } else {
        this.status = "dirty";
        this._emit();
      }
    },

    markClean() {
      this.dirty = false;
      this.status = "saved";
      this._emit();
    },

    setData(doc, opts) {
      this.data = doc && typeof doc === "object" ? doc : emptyDoc();
      if (!(opts && opts.keepDirty)) {
        this.dirty = false;
        this.status = this.loaded ? "saved" : "idle";
      }
      this._emit();
    },

    getArticles() {
      return Array.isArray(this.data.articles) ? this.data.articles : [];
    },

    getGetUrl() {
      return requestUrl(getServerConfig().getPath);
    },

    getPostUrl() {
      return requestUrl(getServerConfig().postPath);
    },

    async load() {
      this.status = "loading";
      this._emit();
      const url = this.getGetUrl();
      let res;
      try {
        res = await fetch(url, {
          method: "GET",
          mode: "cors",
          credentials: "omit",
          headers: { Accept: "application/json;charset=utf-8" },
          cache: "no-store"
        });
      } catch (err) {
        console.error(err);
        this.status = "error";
        this._emit();
        throw new Error("連接失敗：無法載入 " + url);
      }
      if (!res.ok) {
        this.status = "error";
        this._emit();
        throw new Error("載入失敗（" + res.status + "）");
      }
      let parsed;
      try {
        parsed = await parseJsonBody(res);
      } catch (e) {
        this.status = "error";
        this._emit();
        throw new Error("載入失敗：回傳不是有效 JSON");
      }
      if (KB.schema && typeof KB.schema.normalizeDoc === "function") {
        parsed = KB.schema.normalizeDoc(parsed);
      }
      this.loaded = true;
      this.setData(parsed);
      this.status = "saved";
      this.dirty = false;
      this._emit();
      return this.data;
    },

    async save() {
      if (KB.schema && typeof KB.schema.validateBeforeSave === "function") {
        const err = KB.schema.validateBeforeSave(this.data);
        if (err) throw new Error(err);
      }
      if (KB.slug && typeof KB.slug.findCollisions === "function") {
        const collisions = KB.slug.findCollisions(this.getArticles());
        if (collisions.length) {
          throw new Error("Slug 撞名，禁止儲存：" + collisions.map((c) => c.slug).join(", "));
        }
      }
      this.status = "saving";
      this._emit();
      const payload = Object.assign({}, this.data, {
        updatedAt: new Date().toISOString(),
        app: this.data.app || "kb",
        version: this.data.version || 1
      });
      this.data = payload;
      const url = this.getPostUrl();
      let res;
      try {
        res = await fetch(url, {
          method: "POST",
          mode: "cors",
          credentials: "omit",
          headers: { "Content-Type": "application/json;charset=utf-8" },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error(err);
        this.status = "error";
        this._emit();
        throw new Error("連接失敗：無法儲存到 " + url);
      }
      let body = null;
      try {
        body = await parseJsonBody(res.clone());
      } catch (e) {
        /* non-json */
      }
      if (!res.ok || (body && body.status && String(body.status).toLowerCase() === "error")) {
        this.status = "error";
        this._emit();
        const msg = body && (body.message || body.error) ? String(body.message || body.error) : "";
        throw new Error("儲存失敗（" + res.status + "）" + (msg ? "：" + msg : ""));
      }
      // After successful save: POST then GET reload
      await this.load();
      this.dirty = false;
      this.status = "saved";
      this._emit();
      return this.data;
    }
  };

  KB.store = store;
})(window);
