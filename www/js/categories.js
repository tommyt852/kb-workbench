(function (global) {
  const KB = (global.KB = global.KB || {});

  function splitPath(category) {
    const raw = String(category || "")
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "")
      .trim();
    if (!raw) return [];
    return raw.split("/").map((p) => p.trim()).filter(Boolean);
  }

  function joinPath(parts) {
    return (parts || []).filter(Boolean).join("/");
  }

  /** Build nested tree from article categories */
  function buildTree(articles) {
    const root = { name: "", path: "", children: Object.create(null), count: 0 };
    (articles || []).forEach((a) => {
      const parts = splitPath(a && a.category);
      if (!parts.length) {
        root.count++;
        return;
      }
      let node = root;
      const acc = [];
      parts.forEach((name) => {
        acc.push(name);
        if (!node.children[name]) {
          node.children[name] = {
            name: name,
            path: joinPath(acc),
            children: Object.create(null),
            count: 0
          };
        }
        node = node.children[name];
        node.count++;
      });
    });
    return root;
  }

  function flattenTree(node, depth) {
    const out = [];
    const d = depth || 0;
    const names = Object.keys(node.children || {}).sort(function (a, b) {
      return a.localeCompare(b, "zh-Hant");
    });
    names.forEach(function (name) {
      const child = node.children[name];
      out.push({ name: child.name, path: child.path, count: child.count, depth: d });
      out.push.apply(out, flattenTree(child, d + 1));
    });
    return out;
  }

  function filterByCategory(articles, selected) {
    const list = articles || [];
    if (!selected || selected === "__all__") return list.slice();
    if (selected === "__none__") {
      return list.filter(function (a) {
        return !splitPath(a && a.category).length;
      });
    }
    return list.filter(function (a) {
      const cat = String((a && a.category) || "")
        .replace(/\\/g, "/")
        .replace(/^\/+|\/+$/g, "");
      return cat === selected || cat.indexOf(selected + "/") === 0;
    });
  }

  function uncategorizedCount(articles) {
    return (articles || []).filter(function (a) {
      return !splitPath(a && a.category).length;
    }).length;
  }

  KB.categories = {
    splitPath: splitPath,
    joinPath: joinPath,
    buildTree: buildTree,
    flattenTree: flattenTree,
    filterByCategory: filterByCategory,
    uncategorizedCount: uncategorizedCount
  };
})(window);
