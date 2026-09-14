(function (global) {
  const KB = (global.KB = global.KB || {});
  KB.ui = KB.ui || {};

  const editor = {
    _bound: false,
    _instance: null,
    _onChange: null,
    _suppressChange: false,

    bind(opts) {
      this._onChange = (opts && opts.onChange) || null;
      this._bound = true;
    },

    /**
     * Create Toast UI Editor once; reuse across article switches.
     * Call after #editor-panel is visible so height layout is correct.
     */
    ensure() {
      if (this._instance) return this._instance;
      const el = document.getElementById("toastui-editor");
      if (!el) return null;
      const EditorCtor =
        (global.toastui && global.toastui.Editor) ||
        (global.toastui && global.toastui.default && global.toastui.default.Editor);
      if (!EditorCtor) {
        console.error("Toast UI Editor not loaded (toastui.Editor missing)");
        return null;
      }
      const self = this;
      this._instance = new EditorCtor({
        el: el,
        height: "100%",
        initialEditType: "wysiwyg",
        previewStyle: "vertical",
        hideModeSwitch: false,
        usageStatistics: false,
        theme: "dark",
        autofocus: false,
        toolbarItems: [
          ["heading", "bold", "italic", "strike"],
          ["hr", "quote"],
          ["ul", "ol", "task", "indent", "outdent"],
          ["table", "image", "link"],
          ["code", "codeblock"]
        ],
        events: {
          change: function () {
            if (self._suppressChange) return;
            if (typeof self._onChange === "function") self._onChange();
          }
        }
      });
      return this._instance;
    },

    destroy() {
      if (this._instance) {
        try {
          this._instance.destroy();
        } catch (e) {
          /* ignore */
        }
        this._instance = null;
      }
      const el = document.getElementById("toastui-editor");
      if (el) el.innerHTML = "";
    },

    setMarkdown(md) {
      const inst = this.ensure();
      if (!inst) return;
      this._suppressChange = true;
      try {
        inst.setMarkdown(md == null ? "" : String(md), false);
      } finally {
        // defer clear so Toast UI internal sync doesn't fire dirty
        const self = this;
        setTimeout(function () {
          self._suppressChange = false;
        }, 0);
      }
    },

    getMarkdown() {
      if (!this._instance) return "";
      try {
        return this._instance.getMarkdown() || "";
      } catch (e) {
        return "";
      }
    },

    /** @deprecated alias — prefer setMarkdown */
    setBody(md) {
      this.setMarkdown(md);
    },

    /** @deprecated alias — prefer getMarkdown */
    getBody() {
      return this.getMarkdown();
    },

    /** No separate preview pane in M8 WYSIWYG. */
    updatePreview() {},

    focus() {
      const title = document.getElementById("field-title");
      if (title) title.focus();
    },

    focusEditor() {
      const inst = this.ensure();
      if (inst && typeof inst.focus === "function") {
        try {
          inst.focus();
        } catch (e) {
          /* ignore */
        }
      }
    }
  };

  KB.ui.editor = editor;
})(window);
