(function (global) {
  const KB = (global.KB = global.KB || {});
  KB.ui = KB.ui || {};

  const editor = {
    _bound: false,
    _mode: "preview", // "preview" | "edit"
    _onChange: null,
    _onModeChange: null,

    bind(opts) {
      if (this._bound) return;
      this._bound = true;
      this._onChange = (opts && opts.onChange) || null;
      this._onModeChange = (opts && opts.onModeChange) || null;
      const self = this;
      const body = document.getElementById("field-body");
      if (body) {
        body.addEventListener("input", function () {
          self.updatePreview();
          if (typeof self._onChange === "function") self._onChange();
        });
      }
      const preview = document.getElementById("preview");
      if (preview) {
        preview.addEventListener("dblclick", function () {
          if (self._mode === "preview") self.setMode("edit");
        });
      }
      this.applyMode();
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
        heading.textContent = this._mode === "preview" ? "Preview" : "Preview";
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
        const body = document.getElementById("field-body");
        if (body) {
          try {
            body.focus();
          } catch (e) {
            /* ignore */
          }
        }
      }
    },

    updatePreview() {
      const body = document.getElementById("field-body");
      const preview = document.getElementById("preview");
      if (!preview) return;
      const md = body ? body.value : "";
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
      const body = document.getElementById("field-body");
      if (body) body.value = md == null ? "" : String(md);
      this.updatePreview();
    },

    getBody() {
      const body = document.getElementById("field-body");
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
      const body = document.getElementById("field-body");
      if (body) {
        try {
          body.focus();
        } catch (e) {
          /* ignore */
        }
      }
    }
  };

  KB.ui.editor = editor;
})(window);
