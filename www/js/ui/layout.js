(function (global) {
  const KB = (global.KB = global.KB || {});
  KB.ui = KB.ui || {};

  const LS_KEY = "kb-workbench:layout";

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return { treeCollapsed: false, listCollapsed: false, metaCollapsed: false };
      const parsed = JSON.parse(raw);
      return {
        treeCollapsed: !!parsed.treeCollapsed,
        listCollapsed: !!parsed.listCollapsed,
        metaCollapsed: !!parsed.metaCollapsed
      };
    } catch (e) {
      return { treeCollapsed: false, listCollapsed: false, metaCollapsed: false };
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
  }

  const layout = {
    state: loadState(),

    apply() {
      const app = document.getElementById("app");
      if (!app) return;
      app.classList.toggle("tree-collapsed", !!this.state.treeCollapsed);
      app.classList.toggle("list-collapsed", !!this.state.listCollapsed);
      app.classList.toggle("meta-collapsed", !!this.state.metaCollapsed);
      const btnTree = document.getElementById("btn-toggle-tree");
      const btnList = document.getElementById("btn-toggle-list");
      const btnMeta = document.getElementById("btn-toggle-meta");
      if (btnTree) btnTree.setAttribute("aria-pressed", this.state.treeCollapsed ? "true" : "false");
      if (btnList) btnList.setAttribute("aria-pressed", this.state.listCollapsed ? "true" : "false");
      if (btnMeta) {
        btnMeta.setAttribute("aria-pressed", this.state.metaCollapsed ? "true" : "false");
        btnMeta.title = this.state.metaCollapsed ? "展開元資料" : "摺疊元資料";
        btnMeta.textContent = this.state.metaCollapsed ? "⌄" : "⌃";
      }
    },

    toggleTree() {
      this.state.treeCollapsed = !this.state.treeCollapsed;
      saveState(this.state);
      this.apply();
    },

    toggleList() {
      this.state.listCollapsed = !this.state.listCollapsed;
      saveState(this.state);
      this.apply();
    },

    toggleMeta() {
      this.state.metaCollapsed = !this.state.metaCollapsed;
      saveState(this.state);
      this.apply();
    },

    init() {
      const btnTree = document.getElementById("btn-toggle-tree");
      const btnList = document.getElementById("btn-toggle-list");
      const btnMeta = document.getElementById("btn-toggle-meta");
      if (btnTree) btnTree.addEventListener("click", () => this.toggleTree());
      if (btnList) btnList.addEventListener("click", () => this.toggleList());
      if (btnMeta) btnMeta.addEventListener("click", () => this.toggleMeta());
      this.apply();
    }
  };

  KB.ui.layout = layout;
})(window);
