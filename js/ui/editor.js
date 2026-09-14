(function (global) {
  const KB = (global.KB = global.KB || {});
  KB.ui = KB.ui || {};

  const editor = {
    _bound: false,

    bind(opts) {
      if (this._bound) return;
      this._bound = true;
      const onChange = opts && opts.onChange;
      const body = document.getElementById("field-body");
      if (body) {
        body.addEventListener("input", function () {
          editor.updatePreview();
          if (typeof onChange === "function") onChange();
        });
        body.addEventListener("scroll", function () {
          /* optional sync later */
        });
      }
    },

    updatePreview() {
      const body = document.getElementById("field-body");
      const preview = document.getElementById("preview");
      if (!preview) return;
      const md = body ? body.value : "";
      if (KB.markdown && typeof KB.markdown.render === "function") {
        preview.innerHTML = KB.markdown.render(md);
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

    focus() {
      const title = document.getElementById("field-title");
      if (title) title.focus();
    }
  };

  KB.ui.editor = editor;
})(window);
