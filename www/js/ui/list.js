(function (global) {
  const KB = (global.KB = global.KB || {});
  KB.ui = KB.ui || {};

  const list = {
    selectedId: null,
    onSelect: null,

    render(articles, titleHint) {
      const el = document.getElementById("article-list");
      const title = document.getElementById("list-title");
      if (title) {
        title.textContent = titleHint
          ? "文章 · " + titleHint
          : "文章 · " + (articles || []).length;
      }
      if (!el) return;
      el.innerHTML = "";
      const sorted = (articles || []).slice().sort(function (a, b) {
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      });
      if (!sorted.length) {
        const empty = document.createElement("li");
        empty.className = "empty-hint";
        empty.textContent = "沒有文章";
        el.appendChild(empty);
        return;
      }
      sorted.forEach((a) => {
        const li = document.createElement("li");
        if (a.id === this.selectedId) li.classList.add("active");
        li.dataset.id = a.id;
        const tags = (a.tags || [])
          .map(function (t) {
            return '<span class="tag"></span>';
          })
          .join("");
        li.innerHTML =
          '<div class="art-title"></div><span class="meta">' +
          '<span class="tags"></span> <span class="slug"></span></span>';
        li.querySelector(".art-title").textContent = a.title || "(無標題)";
        const tagsEl = li.querySelector(".tags");
        (a.tags || []).forEach(function (t) {
          const span = document.createElement("span");
          span.className = "tag";
          span.textContent = t;
          tagsEl.appendChild(span);
        });
        li.querySelector(".slug").textContent = a.slug || "";
        li.addEventListener("click", () => {
          this.selectedId = a.id;
          this.render(articles, titleHint);
          if (typeof this.onSelect === "function") this.onSelect(a.id);
        });
        el.appendChild(li);
      });
    },

    setSelected(id) {
      this.selectedId = id;
    },

    getSelected() {
      return this.selectedId;
    }
  };

  KB.ui.list = list;
})(window);
