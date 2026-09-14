(function (global) {
  const KB = (global.KB = global.KB || {});
  KB.ui = KB.ui || {};

  function uniqueSorted(values) {
    const seen = Object.create(null);
    const out = [];
    (values || []).forEach(function (v) {
      const s = String(v == null ? "" : v).trim();
      if (!s) return;
      if (seen[s]) return;
      seen[s] = true;
      out.push(s);
    });
    out.sort(function (a, b) {
      return a.localeCompare(b, "zh-Hant");
    });
    return out;
  }

  function collectCategories(articles) {
    return uniqueSorted(
      (articles || []).map(function (a) {
        return a && a.category;
      })
    );
  }

  function collectTags(articles) {
    const all = [];
    (articles || []).forEach(function (a) {
      (a && a.tags ? a.tags : []).forEach(function (t) {
        all.push(t);
      });
    });
    return uniqueSorted(all);
  }

  function collectField(articles, key) {
    return uniqueSorted(
      (articles || []).map(function (a) {
        return a && a[key];
      })
    );
  }

  function fillDatalist(id, values) {
    const list = document.getElementById(id);
    if (!list) return;
    list.innerHTML = "";
    (values || []).forEach(function (v) {
      const opt = document.createElement("option");
      opt.value = v;
      list.appendChild(opt);
    });
  }

  function normalizeTag(t) {
    return String(t == null ? "" : t).trim();
  }

  const tagsWidget = {
    _tags: [],
    _onChange: null,
    _editable: true,
    _bound: false,

    bind(opts) {
      if (this._bound) return;
      this._bound = true;
      this._onChange = (opts && opts.onChange) || null;
      const self = this;
      const input = document.getElementById("field-tag-input");
      const suggest = document.getElementById("tag-suggest");
      if (input) {
        input.addEventListener("input", function () {
          self._renderSuggest(input.value);
        });
        input.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            self.addFromInput();
          } else if (e.key === "Backspace" && !input.value && self._tags.length) {
            self.removeAt(self._tags.length - 1);
          } else if (e.key === "Escape") {
            self._hideSuggest();
          } else if (e.key === "ArrowDown") {
            const first = suggest && suggest.querySelector(".tag-suggest-item");
            if (first) {
              e.preventDefault();
              first.focus();
            }
          }
        });
        input.addEventListener("blur", function () {
          setTimeout(function () {
            self._hideSuggest();
          }, 150);
        });
        input.addEventListener("focus", function () {
          if (self._editable) self._renderSuggest(input.value);
        });
      }
      if (suggest) {
        suggest.addEventListener("mousedown", function (e) {
          e.preventDefault();
        });
        suggest.addEventListener("click", function (e) {
          const item = e.target.closest(".tag-suggest-item");
          if (!item) return;
          self.add(item.dataset.tag || item.textContent);
          if (input) {
            input.value = "";
            input.focus();
          }
          self._hideSuggest();
        });
      }
      this.render();
    },

    setEditable(editable) {
      this._editable = !!editable;
      const input = document.getElementById("field-tag-input");
      const wrap = document.getElementById("tags-widget");
      if (input) {
        input.readOnly = !this._editable;
        input.tabIndex = this._editable ? 0 : -1;
        input.placeholder = this._editable ? "輸入 tag，Enter 新增" : "";
      }
      if (wrap) wrap.classList.toggle("readonly", !this._editable);
      this.render();
      this._hideSuggest();
    },

    getTags() {
      return this._tags.slice();
    },

    setTags(tags) {
      const next = [];
      const seen = Object.create(null);
      (tags || []).forEach(function (t) {
        const n = normalizeTag(t);
        if (!n || seen[n]) return;
        seen[n] = true;
        next.push(n);
      });
      this._tags = next;
      this.render();
      const input = document.getElementById("field-tag-input");
      if (input) input.value = "";
      this._hideSuggest();
    },

    add(tag) {
      if (!this._editable) return false;
      const n = normalizeTag(tag);
      if (!n) return false;
      if (this._tags.indexOf(n) >= 0) return false;
      this._tags.push(n);
      this.render();
      this._emit();
      return true;
    },

    addFromInput() {
      const input = document.getElementById("field-tag-input");
      if (!input) return;
      const raw = input.value || "";
      raw.split(/[,，]/).forEach(function (part) {
        tagsWidget.add(part);
      });
      input.value = "";
      this._hideSuggest();
    },

    removeAt(index) {
      if (!this._editable) return;
      if (index < 0 || index >= this._tags.length) return;
      this._tags.splice(index, 1);
      this.render();
      this._emit();
    },

    render() {
      const host = document.getElementById("tag-chips");
      if (!host) return;
      host.innerHTML = "";
      const self = this;
      this._tags.forEach(function (t, i) {
        const chip = document.createElement("span");
        chip.className = "tag-chip";
        const label = document.createElement("span");
        label.className = "tag-chip-label";
        label.textContent = t;
        chip.appendChild(label);
        if (self._editable) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "tag-chip-x";
          btn.setAttribute("aria-label", "移除 " + t);
          btn.textContent = "×";
          btn.addEventListener("click", function (e) {
            e.preventDefault();
            self.removeAt(i);
          });
          chip.appendChild(btn);
        }
        host.appendChild(chip);
      });
    },

    refreshSuggestions(articles) {
      this._allTags = collectTags(articles);
      const input = document.getElementById("field-tag-input");
      if (input && document.activeElement === input) {
        this._renderSuggest(input.value);
      }
    },

    _renderSuggest(query) {
      const suggest = document.getElementById("tag-suggest");
      if (!suggest || !this._editable) {
        this._hideSuggest();
        return;
      }
      const q = normalizeTag(query).toLowerCase();
      const selected = Object.create(null);
      this._tags.forEach(function (t) {
        selected[t] = true;
      });
      const matches = (this._allTags || []).filter(function (t) {
        if (selected[t]) return false;
        if (!q) return true;
        return t.toLowerCase().indexOf(q) >= 0;
      });
      suggest.innerHTML = "";
      if (!matches.length) {
        suggest.classList.add("hidden");
        return;
      }
      matches.slice(0, 12).forEach(function (t) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "tag-suggest-item";
        item.dataset.tag = t;
        item.textContent = t;
        suggest.appendChild(item);
      });
      suggest.classList.remove("hidden");
    },

    _hideSuggest() {
      const suggest = document.getElementById("tag-suggest");
      if (suggest) {
        suggest.classList.add("hidden");
        suggest.innerHTML = "";
      }
    },

    _emit() {
      if (typeof this._onChange === "function") this._onChange(this.getTags());
    }
  };

  const meta = {
    _bound: false,
    _onChange: null,
    _authorLocked: false,

    bind(opts) {
      if (this._bound) return;
      this._bound = true;
      this._onChange = (opts && opts.onChange) || null;
      tagsWidget.bind({
        onChange: function () {
          if (typeof meta._onChange === "function") meta._onChange();
        }
      });
    },

    refreshFromArticles(articles) {
      fillDatalist("category-datalist", collectCategories(articles));
      fillDatalist("author-datalist", collectField(articles, "author"));
      fillDatalist("editedby-datalist", collectField(articles, "editedBy"));
      tagsWidget.refreshSuggestions(articles);
    },

    setEditable(editable) {
      const edit = !!editable;
      const ids = ["field-category", "field-editedBy"];
      ids.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.readOnly = !edit;
      });
      // Author: editable only when in edit mode AND not locked
      const author = document.getElementById("field-author");
      if (author) {
        const authorEditable = edit && !this._authorLocked;
        author.readOnly = !authorEditable;
        author.classList.toggle("field-locked", this._authorLocked);
        const wrap = document.getElementById("author-field-wrap");
        if (wrap) wrap.classList.toggle("locked", this._authorLocked);
      }
      tagsWidget.setEditable(edit);
    },

    /** Lock author when non-empty (existing or once saved). */
    setAuthorLocked(locked) {
      this._authorLocked = !!locked;
      const author = document.getElementById("field-author");
      const wrap = document.getElementById("author-field-wrap");
      if (author) {
        // Re-apply based on current editor mode via setEditable caller
        author.classList.toggle("field-locked", this._authorLocked);
        if (this._authorLocked) author.readOnly = true;
      }
      if (wrap) wrap.classList.toggle("locked", this._authorLocked);
    },

    isAuthorLocked() {
      return this._authorLocked;
    },

    /** Decide lock from article state: non-empty author => locked. */
    syncAuthorLockFromArticle(article) {
      const author = article && String(article.author || "").trim();
      this.setAuthorLocked(!!author);
    },

    getTags() {
      return tagsWidget.getTags();
    },

    setTags(tags) {
      tagsWidget.setTags(tags);
    },

    getAuthor() {
      const el = document.getElementById("field-author");
      return el ? String(el.value || "").trim() : "";
    },

    setAuthor(value) {
      const el = document.getElementById("field-author");
      if (el) el.value = value == null ? "" : String(value);
    },

    getEditedBy() {
      const el = document.getElementById("field-editedBy");
      return el ? String(el.value || "").trim() : "";
    },

    setEditedBy(value) {
      const el = document.getElementById("field-editedBy");
      if (el) el.value = value == null ? "" : String(value);
    },

    getCategory() {
      const el = document.getElementById("field-category");
      return el
        ? String(el.value || "")
            .trim()
            .replace(/\\/g, "/")
            .replace(/^\/+|\/+$/g, "")
        : "";
    },

    setCategory(value) {
      const el = document.getElementById("field-category");
      if (el) el.value = value == null ? "" : String(value);
    },

    tagsWidget: tagsWidget,
    collectCategories: collectCategories,
    collectTags: collectTags
  };

  KB.ui.meta = meta;
})(window);
