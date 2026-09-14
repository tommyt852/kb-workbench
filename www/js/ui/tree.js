(function (global) {
  const KB = (global.KB = global.KB || {});
  KB.ui = KB.ui || {};

  const tree = {
    selected: "__all__",
    onSelect: null,

    render(articles) {
      const el = document.getElementById("category-tree");
      if (!el) return;
      const cats = KB.categories;
      const root = cats.buildTree(articles);
      const flat = cats.flattenTree(root);
      const uncat = cats.uncategorizedCount(articles);
      const total = (articles || []).length;

      const items = [];
      items.push({ key: "__all__", label: "全部", count: total, depth: 0, cls: "" });
      items.push({ key: "__none__", label: "未分類", count: uncat, depth: 0, cls: "" });
      flat.forEach(function (n) {
        items.push({
          key: n.path,
          label: n.name,
          count: n.count,
          depth: n.depth,
          cls: n.depth === 0 ? "branch" : n.depth === 1 ? "child" : "child grandchild"
        });
      });

      el.innerHTML = "";
      items.forEach((item) => {
        const li = document.createElement("li");
        li.className = item.cls || "";
        if (item.key === this.selected) li.classList.add("active");
        li.style.paddingLeft = 10 + item.depth * 12 + "px";
        li.dataset.key = item.key;
        li.innerHTML =
          '<span class="tree-label"></span><span class="tree-count"></span>';
        li.querySelector(".tree-label").textContent = item.label;
        li.querySelector(".tree-count").textContent = String(item.count);
        li.addEventListener("click", () => {
          this.selected = item.key;
          this.render(articles);
          if (typeof this.onSelect === "function") this.onSelect(item.key);
        });
        el.appendChild(li);
      });
    },

    getSelected() {
      return this.selected;
    },

    setSelected(key) {
      this.selected = key || "__all__";
    }
  };

  KB.ui.tree = tree;
})(window);
