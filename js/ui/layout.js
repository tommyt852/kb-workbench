(function (global) {
  const KB = (global.KB = global.KB || {});
  KB.ui = KB.ui || {};

  const LS_KEY = "kb-workbench:layout";

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return { treeCollapsed: false, listCollapsed: false };
      const parsed = JSON.parse(raw);
      return {
        treeCollapsed: !!parsed.treeCollapsed,
        listCollapsed: !!parsed.listCollapsed
      };
    } catch (e) {
      return { treeCollapsed: false, listCollapsed: false };
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
      const btnTree = document.getElementById("btn-toggle-tree");
      const btnList = document.getElementById("btn-toggle-list");
      if (btnTree) btnTree.setAttribute("aria-pressed", this.state.treeCollapsed ? "true" : "false");
      if (btnList) btnList.setAttribute("aria-pressed", this.state.listCollapsed ? "true" : "false");
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

    init() {
      const btnTree = document.getElementById("btn-toggle-tree");
      const btnList = document.getElementById("btn-toggle-list");
      if (btnTree) btnTree.addEventListener("click", () => this.toggleTree());
      if (btnList) btnList.addEventListener("click", () => this.toggleList());
      this.apply();
    }
  };

  KB.ui.layout = layout;
})(window);
