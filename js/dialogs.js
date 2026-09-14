(function (global) {
  const KB = (global.KB = global.KB || {});

  function ensureHost() {
    let host = document.getElementById("modal-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "modal-host";
      document.body.appendChild(host);
    }
    return host;
  }

  function closeModal() {
    const host = ensureHost();
    host.innerHTML = "";
  }

  /**
   * Confirm dialog.
   * @returns {Promise<boolean>}
   */
  function confirm(opts) {
    const o = opts || {};
    return new Promise(function (resolve) {
      closeModal();
      const host = ensureHost();
      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop";
      backdrop.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true">' +
        "<h2></h2><p></p>" +
        '<div class="modal-actions">' +
        '<button type="button" class="btn ghost" data-act="cancel"></button>' +
        '<button type="button" class="btn" data-act="ok"></button>' +
        "</div></div>";
      backdrop.querySelector("h2").textContent = o.title || "確認";
      backdrop.querySelector("p").textContent = o.message || "";
      const btnCancel = backdrop.querySelector('[data-act="cancel"]');
      const btnOk = backdrop.querySelector('[data-act="ok"]');
      btnCancel.textContent = o.cancelLabel || "取消";
      btnOk.textContent = o.okLabel || "確定";
      if (o.danger) btnOk.classList.add("danger");

      function finish(val) {
        closeModal();
        resolve(val);
      }
      btnCancel.addEventListener("click", function () {
        finish(false);
      });
      btnOk.addEventListener("click", function () {
        finish(true);
      });
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop) finish(false);
      });
      host.appendChild(backdrop);
      btnOk.focus();
    });
  }

  /**
   * Dirty navigation: 儲存並繼續 / 丟棄 / 取消
   * @returns {Promise<'save'|'discard'|'cancel'>}
   */
  function unsavedGuard(opts) {
    const o = opts || {};
    return new Promise(function (resolve) {
      closeModal();
      const host = ensureHost();
      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop";
      backdrop.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true">' +
        "<h2></h2><p></p>" +
        '<div class="modal-actions">' +
        '<button type="button" class="btn ghost" data-act="cancel"></button>' +
        '<button type="button" class="btn ghost" data-act="discard"></button>' +
        '<button type="button" class="btn" data-act="save"></button>' +
        "</div></div>";
      backdrop.querySelector("h2").textContent = o.title || "有未儲存變更";
      backdrop.querySelector("p").textContent =
        o.message || "而家有未儲存嘅修改。想點處理？";
      backdrop.querySelector('[data-act="cancel"]').textContent = "取消";
      backdrop.querySelector('[data-act="discard"]').textContent = "丟棄";
      backdrop.querySelector('[data-act="save"]').textContent = "儲存並繼續";

      function finish(val) {
        closeModal();
        resolve(val);
      }
      backdrop.querySelector('[data-act="cancel"]').addEventListener("click", function () {
        finish("cancel");
      });
      backdrop.querySelector('[data-act="discard"]').addEventListener("click", function () {
        finish("discard");
      });
      backdrop.querySelector('[data-act="save"]').addEventListener("click", function () {
        finish("save");
      });
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop) finish("cancel");
      });
      host.appendChild(backdrop);
      backdrop.querySelector('[data-act="save"]').focus();
    });
  }

  KB.dialogs = {
    confirm: confirm,
    unsavedGuard: unsavedGuard,
    close: closeModal
  };
})(window);
