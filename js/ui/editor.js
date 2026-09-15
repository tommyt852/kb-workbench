(function (global) {
  const KB = (global.KB = global.KB || {});
  KB.ui = KB.ui || {};

  function getTextarea() {
    return document.getElementById("field-body");
  }


  /**
   * Shrink CodeMirror selection so trailing newlines (and an optional leading
   * newline) are not part of the wrapped/toggled region.
   * Double-click line selection often includes the trailing `\n`, which made
   * EasyMDE emit `**text\n**` (closing marks on the next line) or put list /
   * heading markers on the following empty line.
   *
   * @param {CodeMirror} cm
   * @param {"inline"|"line"} mode
   */
  function trimSelectionEdges(cm, mode) {
    if (!cm || typeof cm.getCursor !== "function") return;
    const from = cm.getCursor("from");
    const to = cm.getCursor("to");
    if (from.line === to.line && from.ch === to.ch) return;

    let start = { line: from.line, ch: from.ch };
    let end = { line: to.line, ch: to.ch };

    if (mode === "line") {
      // Exclusive end at ch 0 of the next line → only the prior line's newline
      while (end.line > start.line && end.ch === 0) {
        const prev = end.line - 1;
        end = { line: prev, ch: (cm.getLine(prev) || "").length };
      }
    } else {
      // inline: drop trailing \r?\n from the selected text; optionally one leading newline
      const text = cm.getRange(start, end);
      let startIdx = 0;
      let endIdx = text.length;
      while (
        endIdx > startIdx &&
        (text.charAt(endIdx - 1) === "\n" || text.charAt(endIdx - 1) === "\r")
      ) {
        endIdx--;
      }
      if (endIdx > startIdx) {
        if (text.charAt(startIdx) === "\r" && text.charAt(startIdx + 1) === "\n") {
          startIdx += 2;
        } else if (text.charAt(startIdx) === "\n") {
          startIdx += 1;
        }
      }
      if (startIdx !== 0 || endIdx !== text.length) {
        if (typeof cm.indexFromPos === "function" && typeof cm.posFromIndex === "function") {
          const base = cm.indexFromPos(start);
          start = cm.posFromIndex(base + startIdx);
          end = cm.posFromIndex(base + endIdx);
        } else {
          // Fallback without index helpers: handle common whole-line case
          while (end.line > start.line && end.ch === 0) {
            const prev = end.line - 1;
            end = { line: prev, ch: (cm.getLine(prev) || "").length };
          }
        }
      }
    }

    if (
      start.line !== from.line ||
      start.ch !== from.ch ||
      end.line !== to.line ||
      end.ch !== to.ch
    ) {
      cm.setSelection(start, end);
    }
  }

  /** Wrap an EasyMDE toolbar/shortcut action to trim selection first. */
  function withTrimmedSelection(action, mode) {
    return function (editor) {
      const cm = editor && editor.codemirror;
      if (cm) trimSelectionEdges(cm, mode || "inline");
      return action(editor);
    };
  }

  function buildToolbar() {
    if (typeof EasyMDE === "undefined") return false;
    return [
      {
        name: "bold",
        action: withTrimmedSelection(EasyMDE.toggleBold, "inline"),
        text: "B",
        title: "粗體 (Ctrl-B)",
        className: "kb-md-btn kb-md-bold"
      },
      {
        name: "italic",
        action: withTrimmedSelection(EasyMDE.toggleItalic, "inline"),
        text: "I",
        title: "斜體 (Ctrl-I)",
        className: "kb-md-btn kb-md-italic"
      },
      "|",
      {
        name: "heading-1",
        action: withTrimmedSelection(EasyMDE.toggleHeading1, "line"),
        text: "H1",
        title: "標題 1",
        className: "kb-md-btn"
      },
      {
        name: "heading-2",
        action: withTrimmedSelection(EasyMDE.toggleHeading2, "line"),
        text: "H2",
        title: "標題 2",
        className: "kb-md-btn"
      },
      {
        name: "heading-3",
        action: withTrimmedSelection(EasyMDE.toggleHeading3, "line"),
        text: "H3",
        title: "標題 3",
        className: "kb-md-btn"
      },
      "|",
      {
        name: "unordered-list",
        action: withTrimmedSelection(EasyMDE.toggleUnorderedList, "line"),
        text: "• List",
        title: "項目符號列表",
        className: "kb-md-btn"
      },
      {
        name: "ordered-list",
        action: withTrimmedSelection(EasyMDE.toggleOrderedList, "line"),
        text: "1. List",
        title: "編號列表",
        className: "kb-md-btn"
      },
      {
        name: "quote",
        action: withTrimmedSelection(EasyMDE.toggleBlockquote, "line"),
        text: "❝",
        title: "引用",
        className: "kb-md-btn"
      },
      "|",
      {
        name: "code",
        action: withTrimmedSelection(EasyMDE.toggleCodeBlock, "inline"),
        text: "</>",
        title: "程式碼",
        className: "kb-md-btn"
      },
      {
        name: "link",
        action: withTrimmedSelection(EasyMDE.drawLink, "inline"),
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
        this._rebindFormatShortcuts(this._mde);
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


    /**
     * EasyMDE binds Cmd/Ctrl-B/I/K etc. to its stock actions via `bindings`,
     * which our toolbar wrappers do not replace. Re-point those keys at the
     * same trimmed wrappers so keyboard shortcuts match the toolbar.
     */
    _rebindFormatShortcuts(mde) {
      if (!mde || !mde.codemirror) return;
      const cm = mde.codemirror;
      const isMac = /Mac/.test(navigator.platform || "");
      const mod = isMac ? "Cmd" : "Ctrl";
      const extra = Object.assign({}, cm.getOption("extraKeys") || {});

      function bind(key, action, mode) {
        if (!action) return;
        const wrapped = withTrimmedSelection(action, mode);
        extra[key] = function () {
          wrapped(mde);
        };
      }

      bind(mod + "-B", EasyMDE.toggleBold, "inline");
      bind(mod + "-I", EasyMDE.toggleItalic, "inline");
      bind(mod + "-K", EasyMDE.drawLink, "inline");
      bind(mod + "-L", EasyMDE.toggleUnorderedList, "line");
      bind(mod + "-Alt-L", EasyMDE.toggleOrderedList, "line");
      bind(mod + "-'", EasyMDE.toggleBlockquote, "line");
      bind(mod + "-Alt-C", EasyMDE.toggleCodeBlock, "inline");
      bind("Ctrl-Alt-1", EasyMDE.toggleHeading1, "line");
      bind("Ctrl-Alt-2", EasyMDE.toggleHeading2, "line");
      bind("Ctrl-Alt-3", EasyMDE.toggleHeading3, "line");

      cm.setOption("extraKeys", extra);
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
