(function (global) {
  const KB = (global.KB = global.KB || {});
  KB.ui = KB.ui || {};

  function getTextarea() {
    return document.getElementById("field-body");
  }

  function notifyChange(editor) {
    editor.updatePreview();
    if (typeof editor._onChange === "function") editor._onChange();
  }

  /** Replace selection (or insert at caret) and restore focus/selection. */
  function replaceSelection(ta, before, after, placeholder, opts) {
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = ta.value;
    const selected = value.slice(start, end);
    const usePlaceholder = !selected && placeholder != null;
    const inner = usePlaceholder ? placeholder : selected;
    const insert = before + inner + after;
    ta.value = value.slice(0, start) + insert + value.slice(end);

    let selStart;
    let selEnd;
    if (opts && opts.selectAllInserted) {
      selStart = start;
      selEnd = start + insert.length;
    } else if (!selected && placeholder != null) {
      selStart = start + before.length;
      selEnd = selStart + placeholder.length;
    } else if (selected) {
      selStart = start + before.length;
      selEnd = selStart + selected.length;
    } else {
      selStart = start + before.length;
      selEnd = selStart;
    }
    ta.focus();
    ta.setSelectionRange(selStart, selEnd);
  }

  /** Expand selection to cover full lines of the current selection. */
  function lineRange(ta) {
    const value = ta.value;
    let start = ta.selectionStart;
    let end = ta.selectionEnd;
    while (start > 0 && value.charAt(start - 1) !== "\n") start--;
    if (end > start && value.charAt(end - 1) === "\n") {
      /* keep trailing newline outside */
    } else {
      while (end < value.length && value.charAt(end) !== "\n") end++;
    }
    return { start: start, end: end, text: value.slice(start, end) };
  }

  function setLineBlock(ta, start, end, newText) {
    const value = ta.value;
    ta.value = value.slice(0, start) + newText + value.slice(end);
    ta.focus();
    ta.setSelectionRange(start, start + newText.length);
  }

  function wrapInline(editor, before, after, placeholder) {
    const ta = getTextarea();
    if (!ta) return;
    replaceSelection(ta, before, after, placeholder || "");
    notifyChange(editor);
  }

  function prefixLines(editor, makePrefix, stripRe) {
    const ta = getTextarea();
    if (!ta) return;
    const range = lineRange(ta);
    const lines = range.text.split("\n");
    const allPrefixed =
      lines.length > 0 &&
      lines.every(function (line) {
        return !line.length || stripRe.test(line);
      });
    const next = lines
      .map(function (line, i) {
        if (!line.length && lines.length > 1 && i === lines.length - 1) return line;
        if (allPrefixed) return line.replace(stripRe, "");
        return makePrefix(i) + line.replace(stripRe, "");
      })
      .join("\n");
    setLineBlock(ta, range.start, range.end, next);
    notifyChange(editor);
  }

  function cycleHeading(editor) {
    const ta = getTextarea();
    if (!ta) return;
    const range = lineRange(ta);
    const lines = range.text.split("\n");
    const next = lines
      .map(function (line) {
        const m = /^(#{1,6})\s+(.*)$/.exec(line);
        if (m) {
          const level = m[1].length;
          const body = m[2];
          if (level >= 3) return body; // H3 → plain
          return "#".repeat(level + 1) + " " + body;
        }
        if (/^#{1,6}\s*$/.test(line)) return line.replace(/^#+/, "") || "";
        // plain → H1, then H2, H3, then back to plain
        const plain = line.replace(/^#{1,6}\s+/, "");
        return "# " + plain;
      })
      .join("\n");
    setLineBlock(ta, range.start, range.end, next);
    notifyChange(editor);
  }

  function insertLink(editor) {
    const ta = getTextarea();
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(start, end);
    let url = "https://";
    try {
      const answered = window.prompt("連結 URL", url);
      if (answered == null) return; // cancelled
      url = String(answered).trim() || "https://";
    } catch (e) {
      /* prompt unavailable — keep default */
    }
    const label = selected || "link text";
    replaceSelection(ta, "[", "](" + url + ")", label);
    notifyChange(editor);
  }

  function insertHr(editor) {
    const ta = getTextarea();
    if (!ta) return;
    const start = ta.selectionStart;
    const value = ta.value;
    const beforeChar = start > 0 ? value.charAt(start - 1) : "\n";
    const afterChar = start < value.length ? value.charAt(start) : "\n";
    let insert = "---";
    if (beforeChar !== "\n") insert = "\n\n" + insert;
    else if (start > 1 && value.charAt(start - 2) !== "\n") insert = "\n" + insert;
    if (afterChar !== "\n") insert = insert + "\n\n";
    else insert = insert + "\n";
    ta.value = value.slice(0, start) + insert + value.slice(ta.selectionEnd);
    const caret = start + insert.length;
    ta.focus();
    ta.setSelectionRange(caret, caret);
    notifyChange(editor);
  }

  function insertCodeBlock(editor) {
    const ta = getTextarea();
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(start, end);
    const fence = "```";
    let inner = selected;
    let placeholder = false;
    if (!inner) {
      inner = "code";
      placeholder = true;
    }
    // Prefer block fences on their own lines
    const before =
      (start > 0 && ta.value.charAt(start - 1) !== "\n" ? "\n" : "") + fence + "\n";
    const after =
      "\n" +
      fence +
      (end < ta.value.length && ta.value.charAt(end) !== "\n" ? "\n" : "");
    replaceSelection(ta, before, after, placeholder ? "code" : null);
    // If had selection, re-select the inner content
    if (selected) {
      const newStart = start + before.length;
      ta.setSelectionRange(newStart, newStart + selected.length);
    }
    notifyChange(editor);
  }

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
      const body = getTextarea();
      if (body) {
        body.addEventListener("input", function () {
          self.updatePreview();
          if (typeof self._onChange === "function") self._onChange();
        });
        body.addEventListener("keydown", function (e) {
          if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
          const k = e.key.toLowerCase();
          if (k === "b") {
            e.preventDefault();
            self.applyFormat("bold");
          } else if (k === "i") {
            e.preventDefault();
            self.applyFormat("italic");
          } else if (k === "k") {
            e.preventDefault();
            self.applyFormat("link");
          }
        });
      }
      const toolbar = document.getElementById("md-toolbar");
      if (toolbar) {
        toolbar.addEventListener("mousedown", function (e) {
          // Keep textarea selection when clicking toolbar
          const btn = e.target.closest(".md-btn");
          if (btn) e.preventDefault();
        });
        toolbar.addEventListener("click", function (e) {
          const btn = e.target.closest(".md-btn");
          if (!btn) return;
          const action = btn.getAttribute("data-md");
          if (action) self.applyFormat(action);
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

    applyFormat(action) {
      switch (action) {
        case "bold":
          wrapInline(this, "**", "**", "bold text");
          break;
        case "italic":
          wrapInline(this, "*", "*", "italic text");
          break;
        case "heading":
          cycleHeading(this);
          break;
        case "ul":
          prefixLines(
            this,
            function () {
              return "- ";
            },
            /^\s*[-*+]\s+/
          );
          break;
        case "ol":
          prefixLines(
            this,
            function (i) {
              return i + 1 + ". ";
            },
            /^\s*\d+\.\s+/
          );
          break;
        case "quote":
          prefixLines(
            this,
            function () {
              return "> ";
            },
            /^\s*>\s?/
          );
          break;
        case "code":
          wrapInline(this, "`", "`", "code");
          break;
        case "codeblock":
          insertCodeBlock(this);
          break;
        case "link":
          insertLink(this);
          break;
        case "hr":
          insertHr(this);
          break;
        default:
          break;
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
        const body = getTextarea();
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
      const body = getTextarea();
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
      const body = getTextarea();
      if (body) body.value = md == null ? "" : String(md);
      this.updatePreview();
    },

    getBody() {
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
      const body = getTextarea();
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
