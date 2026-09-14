(function () {
  const KB = (window.KB = window.KB || {});

  function $(id) {
    return document.getElementById(id);
  }

  const state = {
    currentId: null,
    draft: null,
    slugManual: false,
    snapshot: null // last clean article copy for discard
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
    if (KB.search && typeof KB.search.filter === "function") {
      articles = KB.search.filter(articles, q);
    } else if (String(q).trim()) {
      const needle = String(q).trim().toLowerCase();
      articles = articles.filter(function (a) {
        const hay = [a.title, a.body, a.slug, a.category, (a.tags || []).join(" ")]
          .join("\n")
          .toLowerCase();
        return hay.indexOf(needle) !== -1;
      });
    }
    return articles;
  }

  function refreshTreeAndList() {
    const all = KB.store.getArticles();
    KB.ui.tree.render(all);
    const filtered = getFilteredArticles();
    KB.ui.list.setSelected(state.currentId);
    KB.ui.list.render(filtered, categoryLabel(KB.ui.tree.getSelected()));
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
    state.slugManual = true;
    showEditor(true);
    $("field-title").value = article.title || "";
    $("field-slug").value = article.slug || "";
    $("field-category").value = article.category || "";
    $("field-tags").value = (article.tags || []).join(", ");
    $("field-body").value = article.body || "";
    renderPreview();
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
    const updated = Object.assign({}, articles[idx], {
      title: $("field-title").value,
      slug: $("field-slug").value.trim(),
      category: String($("field-category").value || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\/+|\/+$/g, ""),
      tags: tags,
      body: $("field-body").value,
      updatedAt: new Date().toISOString()
    });
    articles[idx] = updated;
    state.draft = updated;
    KB.store.data.articles = articles;
    KB.store.markDirty();
  }

  function discardCurrentEdits() {
    if (!state.currentId || !state.snapshot) return;
    const articles = KB.store.getArticles();
    const idx = articles.findIndex(function (a) {
      return a.id === state.currentId;
    });
    if (idx >= 0) {
      articles[idx] = JSON.parse(JSON.stringify(state.snapshot));
      KB.store.data.articles = articles;
    }
    // If the only dirty was this article and store was dirty solely from it,
    // we re-check: compare whole doc is hard; mark clean only if user saved before.
    // Safer: leave dirty flag if other changes exist — for single-editor UX, clear dirty.
    KB.store.dirty = false;
    KB.store.status = "saved";
    KB.store._emit();
    fillEditor(state.snapshot);
  }

  /**
   * Run before navigating away from current article when dirty.
   * @returns {Promise<boolean>} true if allowed to continue
   */
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
      $("field-slug").value = KB.slug.slugify($("field-title").value);
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
        if (a) {
          fillEditor(a);
        }
      }
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
      message: "確定刪除「" + title + "」？此操作會標為未儲存，儲存後先至寫入伺服器。",
      okLabel: "刪除",
      cancelLabel: "取消",
      danger: true
    });
    if (!ok) return;
    const articles = KB.store.getArticles().filter(function (x) {
      return x.id !== state.currentId;
    });
    KB.store.data.articles = articles;
    KB.store.markDirty();
    state.currentId = null;
    state.draft = null;
    state.snapshot = null;
    showEditor(false);
    refreshTreeAndList();
    toast("已刪除（尚未儲存到伺服器）");
  }

  async function boot() {
    KB.ui.layout.init();
    if (KB.ui.editor) {
      KB.ui.editor.bind({});
    }
    KB.store.onChange(function () {
      updateSaveUI();
      refreshTreeAndList();
    });
    updateSaveUI();

    KB.ui.tree.onSelect = async function () {
      refreshTreeAndList();
    };
    KB.ui.list.onSelect = function (id) {
      selectArticle(id);
    };

    $("btn-save").addEventListener("click", function () {
      onSave(false);
    });
    const del = $("btn-delete");
    if (del) del.addEventListener("click", onDelete);

    ["field-title", "field-slug", "field-category", "field-tags", "field-body"].forEach(function (id) {
      const el = $(id);
      if (el) el.addEventListener("input", onFieldInput);
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
    getFilteredArticles: getFilteredArticles,
    toast: toast,
    onSave: onSave,
    showEditor: showEditor,
    guardDirty: guardDirty,
    onDelete: onDelete,
    discardCurrentEdits: discardCurrentEdits
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
