(function () {
  const KB = (window.KB = window.KB || {});

  function $(sel) {
    return document.querySelector(sel);
  }

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

  function updateSaveUI() {
    const store = KB.store;
    const badge = $("#save-status");
    const btn = $("#btn-save");
    if (badge) {
      badge.textContent = statusLabel(store);
      badge.dataset.status = store.status;
    }
    if (btn) btn.disabled = store.status === "saving" || store.status === "loading";
  }

  async function onSave() {
    try {
      await KB.store.save();
    } catch (err) {
      console.error(err);
      alert(err && err.message ? err.message : "儲存失敗");
    }
  }

  async function boot() {
    const store = KB.store;
    store.onChange(updateSaveUI);
    updateSaveUI();
    const btn = $("#btn-save");
    if (btn) btn.addEventListener("click", onSave);
    try {
      await store.load();
    } catch (err) {
      console.error(err);
      alert(err && err.message ? err.message : "載入失敗");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
