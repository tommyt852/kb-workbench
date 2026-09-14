(function () {
  const KB = (window.KB = window.KB || {});

  function $(id) {
    return document.getElementById(id);
  }

  const state = {
    currentId: null,
    draft: null,
    slugManual: false,
    snapshot: null
  };

  function statusLabel(store) {
    switch (store.status) {
      case "loading":
        return "載入中…";
      case "saving":
        return "儲存中…";
      case "dirty":
        return "未儲存";
      case "saved":
        return "已儲存";
      case "error":
        return "錯誤";
      default:
        return "—";
    }
  }

  function toast(msg, kind) {
    const host = $("toast-host");
    if (!host) {
      console.log(msg);
      return;
    }
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 3200);
  }

  function updateSaveUI() {
    const store = KB.store;
    const badge = $("save-status");
    const btn = $("btn-save");
    if (badge) {
      badge.textContent = statusLabel(store);
      badge.dataset.status = store.status;
    }
    if (btn) btn.disabled = store.status === "saving" || store.status === "loading";
  }

  function categoryLabel(key) {
    if (!key || key === "__all__") return "全部";
    if (key === "__none__") return "未分類";
    return key;
  }

  function getFilteredArticles() {
    let articles = KB.store.getArticles();
    const cat = KB.ui.tree.getSelected();
    articles = KB.categories.filterByCategory(articles, cat);
    const q = ($("search-input") && $("search-input").value) || "";
    articles = KB.search.filter(articles, q);
    return articles;
  }

  function refreshTreeAndList() {
    const all = KB.store.getArticles();
    KB.ui.tree.render(all);
    const filtered = getFilteredArticles();
    KB.ui.list.setSelected(state.currentId);
    const hint = categoryLabel(KB.ui.tree.getSelected());
    const q = ($("search-input") && $("search-input").value) || "";
    const titleHint = String(q).trim() ? hint + " · 搜尋" : hint;
    KB.ui.list.render(filtered, titleHint);
    updateEmptyStates(filtered);
  }

  function updateEmptyStates(filtered) {
    const listEl = $("article-list");
    if (listEl && (!filtered || !filtered.length)) {
      // list.js already shows 沒有文章; enrich if search active
      const q = ($("search-input") && $("search-input").value) || "";
      const empty = listEl.querySelector(".empty-hint");
      if (empty) {
        empty.textContent = String(q).trim()
          ? "冇符合搜尋嘅文章"
          : KB.store.getArticles().length
            ? "呢個分類冇文章"
            : "尚未有文章 — 按「＋ 新建」開始";
      }
    }
    if (!state.currentId) {
      const empty = $("editor-empty");
      if (empty && !empty.classList.contains("hidden")) {
        empty.textContent = KB.store.getArticles().length
          ? "選擇或新建一篇文章"
          : "知識庫係空嘅 — 按右上角「＋ 新建」新增第一篇";
      }
    }
  }

  function showEditor(show) {
    const empty = $("editor-empty");
    const panel = $("editor-panel");
    if (!empty || !panel) return;
    if (show) {
      empty.classList.add("hidden");
      panel.classList.remove("hidden");
      panel.style.display = "flex";
    } else {
      empty.classList.remove("hidden");
      panel.classList.add("hidden");
      panel.style.display = "none";
      updateEmptyStates(getFilteredArticles());
    }
  }

  function renderPreview() {
    if (KB.ui.editor) KB.ui.editor.updatePreview();
    else {
      const body = ($("field-body") && $("field-body").value) || "";
      const el = $("preview");
      if (!el) return;
      if (KB.markdown) el.innerHTML = KB.markdown.render(body);
      else el.textContent = body;
    }
  }

  function getEditorMarkdown() {
    if (KB.ui.editor && typeof KB.ui.editor.getBody === "function") {
      return KB.ui.editor.getBody();
    }
    return ($("field-body") && $("field-body").value) || "";
  }

  function setEditorMarkdown(md) {
    if (KB.ui.editor && typeof KB.ui.editor.setBody === "function") {
      KB.ui.editor.setBody(md == null ? "" : String(md));
    } else if ($("field-body")) {
      $("field-body").value = md == null ? "" : String(md);
      renderPreview();
    }
  }

  function setViewMode(mode) {
    if (KB.ui.editor && typeof KB.ui.editor.setMode === "function") {
      KB.ui.editor.setMode(mode);
    }
  }

  function fillEditor(article) {
    if (!article) {
      state.currentId = null;
      state.draft = null;
      state.snapshot = null;
      state.slugManual = false;
      showEditor(false);
      return;
    }
    state.currentId = article.id;
    state.draft = Object.assign({}, article);
    state.snapshot = JSON.parse(JSON.stringify(article));
    state.slugManual = !!article.slug;
    showEditor(true);
    $("field-title").value = article.title || "";
    $("field-slug").value = article.slug || "";
    $("field-category").value = article.category || "";
    $("field-tags").value = (article.tags || []).join(", ");
    setEditorMarkdown(article.body || "");
    setViewMode("preview");
  }

  function fieldsEqual(a, b) {
    return (
      String(a.title || "") === String(b.title || "") &&
      String(a.slug || "") === String(b.slug || "") &&
      String(a.category || "") === String(b.category || "") &&
      String(a.body || "") === String(b.body || "") &&
      JSON.stringify(a.tags || []) === JSON.stringify(b.tags || [])
    );
  }

  function applyDraftToStore() {
    if (!state.currentId) return;
    const articles = KB.store.getArticles();
    const idx = articles.findIndex(function (a) {
      return a.id === state.currentId;
    });
    if (idx < 0) return;
    const tags = String($("field-tags").value || "")
      .split(/[,，]/)
      .map(function (t) {
        return t.trim();
      })
      .filter(Boolean);
    const prev = articles[idx];
    const nextFields = {
      title: $("field-title").value,
      slug: $("field-slug").value.trim(),
      category: String($("field-category").value || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\/+|\/+$/g, ""),
      tags: tags,
      body: getEditorMarkdown()
    };
    if (fieldsEqual(prev, nextFields)) {
      state.draft = Object.assign({}, prev);
      return;
    }
    const updated = Object.assign({}, prev, nextFields, {
      updatedAt: new Date().toISOString()
    });
    articles[idx] = updated;
    state.draft = updated;
    KB.store.data.articles = articles;
    KB.store.markDirty();
  }

  function discardCurrentEdits() {
    if (!state.currentId || !state.snapshot) {
      if (state.currentId) {
        KB.store.data.articles = KB.store.getArticles().filter(function (a) {
          return a.id !== state.currentId;
        });
      }
      KB.store.dirty = false;
      KB.store.status = "saved";
      KB.store._emit();
      fillEditor(null);
      return;
    }
    const articles = KB.store.getArticles();
    const idx = articles.findIndex(function (a) {
      return a.id === state.currentId;
    });
    if (idx >= 0) {
      articles[idx] = JSON.parse(JSON.stringify(state.snapshot));
      KB.store.data.articles = articles;
    }
    KB.store.dirty = false;
    KB.store.status = "saved";
    KB.store._emit();
    fillEditor(state.snapshot);
  }

  async function guardDirty() {
    applyDraftToStore();
    if (!KB.store.dirty) return true;
    const choice = await KB.dialogs.unsavedGuard({
      title: "有未儲存變更",
      message: "而家有未儲存嘅修改。想點處理？"
    });
    if (choice === "cancel") return false;
    if (choice === "discard") {
      discardCurrentEdits();
      return true;
    }
    if (choice === "save") {
      try {
        await onSave(true);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  function onFieldInput(e) {
    if (!state.currentId) return;
    if (e && e.target && e.target.id === "field-title" && !state.slugManual) {
      const base = KB.slug.slugify($("field-title").value);
      $("field-slug").value = KB.slug.uniqueSlug(
        KB.store.getArticles(),
        base,
        state.currentId
      );
    }
    if (e && e.target && e.target.id === "field-slug") {
      state.slugManual = true;
    }
    applyDraftToStore();
    if (e && e.target && e.target.id === "field-body") renderPreview();
    if (
      e &&
      e.target &&
      (e.target.id === "field-category" ||
        e.target.id === "field-title" ||
        e.target.id === "field-tags" ||
        e.target.id === "field-slug")
    ) {
      refreshTreeAndList();
    }
  }

  async function onSave(silent) {
    applyDraftToStore();
    try {
      await KB.store.save();
      refreshTreeAndList();
      if (state.currentId) {
        const a = KB.store.getArticles().find(function (x) {
          return x.id === state.currentId;
        });
        if (a) fillEditor(a);
      }
      setViewMode("preview");
      if (!silent) toast("已儲存", "ok");
    } catch (err) {
      console.error(err);
      toast(err && err.message ? err.message : "儲存失敗", "error");
      throw err;
    }
  }

  async function selectArticle(id) {
    if (id === state.currentId) return;
    const ok = await guardDirty();
    if (!ok) {
      refreshTreeAndList();
      return;
    }
    const a = KB.store.getArticles().find(function (x) {
      return x.id === id;
    });
    KB.ui.list.setSelected(id);
    fillEditor(a || null);
    refreshTreeAndList();
  }

  async function onDelete() {
    if (!state.currentId) return;
    const a = KB.store.getArticles().find(function (x) {
      return x.id === state.currentId;
    });
    const title = (a && a.title) || "呢篇";
    const ok = await KB.dialogs.confirm({
      title: "刪除文章",
      message: "確定刪除「" + title + "」？刪除後記得按儲存先至寫入伺服器。",
      okLabel: "刪除",
      cancelLabel: "取消",
      danger: true
    });
    if (!ok) return;
    KB.store.data.articles = KB.store.getArticles().filter(function (x) {
      return x.id !== state.currentId;
    });
    KB.store.markDirty();
    state.currentId = null;
    state.draft = null;
    state.snapshot = null;
    showEditor(false);
    refreshTreeAndList();
    toast("已刪除（尚未儲存到伺服器）");
  }

  async function onNew() {
    const ok = await guardDirty();
    if (!ok) return;

    let category = "";
    const sel = KB.ui.tree.getSelected();
    if (sel && sel !== "__all__" && sel !== "__none__") category = sel;

    const article = KB.schema.createArticle({
      title: "未命名文章",
      category: category,
      body: "",
      tags: []
    });
    article.slug = KB.slug.uniqueSlug(
      KB.store.getArticles(),
      article.slug || article.title,
      article.id
    );

    KB.store.data.articles = KB.store.getArticles().concat([article]);
    KB.store.markDirty();
    state.currentId = article.id;
    state.draft = Object.assign({}, article);
    state.snapshot = null;
    state.slugManual = false;
    showEditor(true);
    $("field-title").value = article.title;
    $("field-slug").value = article.slug;
    $("field-category").value = article.category || "";
    $("field-tags").value = "";
    setEditorMarkdown("");
    setViewMode("edit");
    refreshTreeAndList();
    if (KB.ui.editor) KB.ui.editor.focus();
    else $("field-title").focus();
    $("field-title").select();
  }

  function downloadExport() {
    applyDraftToStore();
    const payload = Object.assign({}, KB.store.data, {
      updatedAt: new Date().toISOString(),
      app: "kb",
      version: KB.store.data.version || 1
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = URL.createObjectURL(blob);
    a.download = "kb-" + stamp + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
    toast("已匯出 JSON", "ok");
  }

  async function importFromObject(parsed) {
    let doc;
    try {
      doc = KB.schema.normalizeDoc(parsed);
    } catch (e) {
      throw new Error("匯入失敗：格式不正確");
    }
    const ok = await KB.dialogs.confirm({
      title: "匯入並覆寫",
      message:
        "匯入會覆寫而家記憶體入面嘅知識庫（" +
        KB.store.getArticles().length +
        " 篇 → " +
        doc.articles.length +
        " 篇）。未儲存變更會丟棄。確定繼續？",
      okLabel: "覆寫匯入",
      cancelLabel: "取消",
      danger: true
    });
    if (!ok) {
      toast("已取消匯入");
      return;
    }
    KB.store.setData(doc);
    KB.store.markDirty();
    state.currentId = null;
    fillEditor(null);
    refreshTreeAndList();
    const first = getFilteredArticles()[0];
    if (first) {
      KB.ui.list.setSelected(first.id);
      fillEditor(first);
      refreshTreeAndList();
    }
    toast("已匯入 " + doc.articles.length + " 篇文章（尚未儲存到伺服器）", "ok");
  }

  function onImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = function () {
      toast("無法讀取檔案", "error");
    };
    reader.onload = function () {
      try {
        const text = String(reader.result || "").replace(/^\uFEFF/, "");
        const parsed = JSON.parse(text);
        importFromObject(parsed).catch(function (err) {
          toast(err && err.message ? err.message : "匯入失敗", "error");
        });
      } catch (e) {
        toast("匯入失敗：唔係有效 JSON", "error");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  async function boot() {
    KB.ui.layout.init();
    if (KB.ui.editor) {
      KB.ui.editor.bind({
        onChange: function () {
          if (!state.currentId) return;
          applyDraftToStore();
        }
      });
    }

    KB.store.onChange(function () {
      updateSaveUI();
    });
    updateSaveUI();

    KB.ui.tree.onSelect = function () {
      refreshTreeAndList();
    };
    KB.ui.list.onSelect = function (id) {
      selectArticle(id);
    };

    $("btn-save").addEventListener("click", function () {
      onSave(false).catch(function () {});
    });
    $("btn-new").addEventListener("click", function () {
      onNew().catch(function () {});
    });
    const del = $("btn-delete");
    if (del) del.addEventListener("click", onDelete);

    const btnEdit = $("btn-edit");
    if (btnEdit) {
      btnEdit.addEventListener("click", function () {
        setViewMode("edit");
      });
    }
    const btnDone = $("btn-done");
    if (btnDone) {
      btnDone.addEventListener("click", function () {
        applyDraftToStore();
        renderPreview();
        setViewMode("preview");
      });
    }

    $("btn-export").addEventListener("click", downloadExport);
    $("btn-import").addEventListener("click", function () {
      $("import-file").click();
    });
    $("import-file").addEventListener("change", function (e) {
      const file = e.target.files && e.target.files[0];
      onImportFile(file);
      e.target.value = "";
    });

    const search = $("search-input");
    if (search) {
      search.addEventListener("input", function () {
        refreshTreeAndList();
      });
    }

    ["field-title", "field-slug", "field-category", "field-tags", "field-body"].forEach(function (id) {
      const el = $(id);
      if (el) el.addEventListener("input", onFieldInput);
    });

    // Ctrl+S / Cmd+S → save
    document.addEventListener("keydown", function (e) {
      const key = e.key || e.code;
      if ((e.ctrlKey || e.metaKey) && (key === "s" || key === "S" || e.code === "KeyS")) {
        e.preventDefault();
        onSave(false).catch(function () {});
      }
    });

    window.addEventListener("beforeunload", function (e) {
      applyDraftToStore();
      if (KB.store.dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    });

    try {
      await KB.store.load();
      refreshTreeAndList();
      const first = getFilteredArticles()[0];
      if (first) {
        KB.ui.list.setSelected(first.id);
        fillEditor(first);
        refreshTreeAndList();
      } else showEditor(false);
      toast("已載入知識庫", "ok");
    } catch (err) {
      console.error(err);
      toast(err && err.message ? err.message : "載入失敗", "error");
    }
  }

  KB.app = {
    state: state,
    refreshTreeAndList: refreshTreeAndList,
    selectArticle: selectArticle,
    fillEditor: fillEditor,
    applyDraftToStore: applyDraftToStore,
    renderPreview: renderPreview,
    setViewMode: setViewMode,
    getFilteredArticles: getFilteredArticles,
    toast: toast,
    onSave: onSave,
    showEditor: showEditor,
    guardDirty: guardDirty,
    onDelete: onDelete,
    onNew: onNew,
    discardCurrentEdits: discardCurrentEdits,
    downloadExport: downloadExport,
    importFromObject: importFromObject
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
