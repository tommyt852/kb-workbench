(function (global) {
  const KB = (global.KB = global.KB || {});
  KB.ui = KB.ui || {};

  function getTextarea() {
    return document.getElementById("field-body");
  }

  function buildToolbar() {
    if (typeof EasyMDE === "undefined") return false;
    return [
      {
        name: "bold",
        action: EasyMDE.toggleBold,
        text: "B",
        title: "粗體 (Ctrl-B)",
        className: "kb-md-btn kb-md-bold"
      },
      {
        name: "italic",
        action: EasyMDE.toggleItalic,
        text: "I",
        title: "斜體 (Ctrl-I)",
        className: "kb-md-btn kb-md-italic"
      },
      "|",
      {
        name: "heading-1",
        action: EasyMDE.toggleHeading1,
        text: "H1",
        title: "標題 1",
        className: "kb-md-btn"
      },
      {
        name: "heading-2",
        action: EasyMDE.toggleHeading2,
        text: "H2",
        title: "標題 2",
        className: "kb-md-btn"
      },
      {
        name: "heading-3",
        action: EasyMDE.toggleHeading3,
        text: "H3",
        title: "標題 3",
        className: "kb-md-btn"
      },
      "|",
      {
        name: "unordered-list",
        action: EasyMDE.toggleUnorderedList,
        text: "• List",
        title: "項目符號列表",
        className: "kb-md-btn"
      },
      {
        name: "ordered-list",
        action: EasyMDE.toggleOrderedList,
        text: "1. List",
        title: "編號列表",
        className: "kb-md-btn"
      },
      {
        name: "quote",
        action: EasyMDE.toggleBlockquote,
        text: "❝",
        title: "引用",
        className: "kb-md-btn"
      },
      "|",
      {
        name: "code",
        action: EasyMDE.toggleCodeBlock,
        text: "</>",
        title: "程式碼",
        className: "kb-md-btn"
      },
      {
        name: "link",
        action: EasyMDE.drawLink,
        text: "🔗 Link",
        title: "連結 (Ctrl-K)",
        className: "kb-md-btn"
      },
      {
        name: "horizontal-rule",
        action: EasyMDE.drawHorizontalRule,
        text: "―",
        title: "水平線",
        className: "kb-md-btn"
      },
      "|",
      {
        name: "undo",
        action: EasyMDE.undo,
        text: "↶",
        title: "復原",
        className: "kb-md-btn"
      },
      {
        name: "redo",
        action: EasyMDE.redo,
        text: "↷",
        title: "重做",
        className: "kb-md-btn"
      }
    ];
  }

  const editor = {
    _bound: false,
    _mode: "preview", // "preview" | "edit"
    _onChange: null,
    _onModeChange: null,
    _mde: null,
    _resizeObserver: null,

    bind(opts) {
      if (this._bound) return;
      this._bound = true;
      this._onChange = (opts && opts.onChange) || null;
      this._onModeChange = (opts && opts.onModeChange) || null;
      const self = this;

      // Prefer EasyMDE; fall back silently if library missing
      this._ensureMde();

      const preview = document.getElementById("preview");
      if (preview) {
        preview.addEventListener("dblclick", function () {
          if (self._mode === "preview") self.setMode("edit");
        });
      }

      // Keep CodeMirror sized when the editor pane resizes
      const col = document.querySelector(".col-md");
      if (col && typeof ResizeObserver !== "undefined") {
        this._resizeObserver = new ResizeObserver(function () {
          if (self._mode === "edit") self._fitEditor();
        });
        this._resizeObserver.observe(col);
      }
      window.addEventListener("resize", function () {
        if (self._mode === "edit") self._fitEditor();
      });

      this.applyMode();
    },

    _ensureMde() {
      if (this._mde) return this._mde;
      if (typeof EasyMDE === "undefined") return null;
      const ta = getTextarea();
      if (!ta) return null;
      const self = this;
      const toolbar = buildToolbar();
      try {
        this._mde = new EasyMDE({
          element: ta,
          autoDownloadFontAwesome: false,
          autofocus: false,
          spellChecker: false,
          status: false,
          forceSync: true,
          autoRefresh: { delay: 250 },
          minHeight: "120px",
          indentWithTabs: false,
          tabSize: 2,
          lineWrapping: true,
          unorderedListStyle: "-",
          promptURLs: true,
          toolbar: toolbar,
          toolbarTips: true,
          // Native EasyMDE preview / side-by-side / fullscreen omitted from toolbar
          sideBySideFullscreen: false
        });
        this._mde.codemirror.on("change", function () {
          self.updatePreview();
          if (typeof self._onChange === "function") self._onChange();
        });
      } catch (err) {
        console.error("EasyMDE init failed", err);
        this._mde = null;
      }
      return this._mde;
    },

    _fitEditor() {
      const mde = this._mde;
      if (!mde || !mde.codemirror) return;
      const col = document.querySelector(".col-md");
      if (!col || col.offsetParent === null) return;
      const toolbar = col.querySelector(".editor-toolbar");
      const heading = col.querySelector(".col-h");
      const status = col.querySelector(".editor-statusbar");
      let used = 0;
      if (heading) used += heading.offsetHeight;
      if (toolbar) used += toolbar.offsetHeight;
      if (status) used += status.offsetHeight;
      const avail = Math.max(120, col.clientHeight - used);
      try {
        mde.codemirror.setSize(null, avail);
        mde.codemirror.refresh();
      } catch (e) {
        /* ignore */
      }
    },

    getMode() {
      return this._mode;
    },

    setMode(mode) {
      const next = mode === "edit" ? "edit" : "preview";
      if (this._mode === next) {
        this.applyMode();
        return;
      }
      this._mode = next;
      this.applyMode();
      if (typeof this._onModeChange === "function") this._onModeChange(this._mode);
    },

    applyMode() {
      const view = document.getElementById("article-view");
      const btnEdit = document.getElementById("btn-edit");
      const btnDone = document.getElementById("btn-done");
      const heading = document.getElementById("preview-heading");
      const metaInputs = ["field-title", "field-slug"];

      if (view) {
        view.classList.toggle("mode-preview", this._mode === "preview");
        view.classList.toggle("mode-edit", this._mode === "edit");
      }
      if (btnEdit) btnEdit.classList.toggle("hidden", this._mode === "edit");
      if (btnDone) btnDone.classList.toggle("hidden", this._mode === "preview");
      if (heading) {
        heading.textContent = "Preview";
      }

      const editable = this._mode === "edit";
      metaInputs.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.readOnly = !editable;
      });
      if (KB.ui.meta && typeof KB.ui.meta.setEditable === "function") {
        KB.ui.meta.setEditable(editable);
      }

      this.updatePreview();

      if (this._mode === "edit") {
        this._ensureMde();
        const self = this;
        // Defer refresh until the left pane is visible
        requestAnimationFrame(function () {
          self._fitEditor();
          try {
            if (self._mde && self._mde.codemirror) {
              self._mde.codemirror.refresh();
              self._mde.codemirror.focus();
            } else {
              const body = getTextarea();
              if (body) body.focus();
            }
          } catch (e) {
            /* ignore */
          }
        });
      }
    },

    updatePreview() {
      const preview = document.getElementById("preview");
      if (!preview) return;
      const md = this.getBody();
      if (KB.markdown && typeof KB.markdown.render === "function") {
        const html = KB.markdown.render(md);
        preview.innerHTML =
          html && String(html).trim()
            ? html
            : '<p class="preview-empty">（空內容）</p>';
      } else {
        preview.textContent = md;
      }
    },

    setBody(md) {
      const value = md == null ? "" : String(md);
      const mde = this._ensureMde();
      if (mde) {
        const cur = mde.value();
        if (cur !== value) mde.value(value);
      } else {
        const body = getTextarea();
        if (body) body.value = value;
      }
      this.updatePreview();
      if (this._mode === "edit") this._fitEditor();
    },

    getBody() {
      if (this._mde) return this._mde.value();
      const body = getTextarea();
      return body ? body.value : "";
    },

    setMarkdown(md) {
      this.setBody(md);
    },

    getMarkdown() {
      return this.getBody();
    },

    focus() {
      const title = document.getElementById("field-title");
      if (title) title.focus();
    },

    focusEditor() {
      if (this._mode !== "edit") this.setMode("edit");
      try {
        if (this._mde && this._mde.codemirror) {
          this._mde.codemirror.focus();
        } else {
          const body = getTextarea();
          if (body) body.focus();
        }
      } catch (e) {
        /* ignore */
      }
    }
  };

  KB.ui.editor = editor;
})(window);
