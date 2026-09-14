(function (global) {
  const KB = (global.KB = global.KB || {});

  const CJK_RANGE = /[\u3400-\u9fff\uf900-\ufaff]/;

  function slugify(input) {
    let s = String(input == null ? "" : input).trim().toLowerCase();
    if (!s) return "";
    // Keep CJK, letters, numbers; turn spaces/underscores into hyphens
    s = s
      .normalize("NFKC")
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\u3400-\u9fff\uF900-\uFAFF-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    return s;
  }

  function findCollisions(articles) {
    const list = Array.isArray(articles) ? articles : [];
    const map = Object.create(null);
    const collisions = [];
    list.forEach((a) => {
      const slug = String((a && a.slug) || "")
        .trim()
        .toLowerCase();
      if (!slug) return;
      if (!map[slug]) map[slug] = [];
      map[slug].push(a);
    });
    Object.keys(map).forEach((slug) => {
      if (map[slug].length > 1) {
        collisions.push({ slug: slug, articles: map[slug] });
      }
    });
    return collisions;
  }

  function isUnique(articles, slug, exceptId) {
    const target = String(slug || "")
      .trim()
      .toLowerCase();
    if (!target) return false;
    return !(Array.isArray(articles) ? articles : []).some((a) => {
      if (!a) return false;
      if (exceptId != null && a.id === exceptId) return false;
      return String(a.slug || "").trim().toLowerCase() === target;
    });
  }

  function uniqueSlug(articles, base, exceptId) {
    let root = slugify(base) || "article";
    if (isUnique(articles, root, exceptId)) return root;
    let n = 2;
    while (!isUnique(articles, root + "-" + n, exceptId)) n++;
    return root + "-" + n;
  }

  KB.slug = {
    slugify: slugify,
    findCollisions: findCollisions,
    isUnique: isUnique,
    uniqueSlug: uniqueSlug,
    hasCjk: function (s) {
      return CJK_RANGE.test(String(s || ""));
    }
  };
})(window);
