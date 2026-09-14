(function (global) {
  const KB = (global.KB = global.KB || {});

  function isPlainObject(v) {
    return v != null && typeof v === "object" && !Array.isArray(v);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function asString(v, fallback) {
    if (v == null) return fallback;
    return String(v);
  }

  function asTags(v) {
    if (Array.isArray(v)) {
      return v.map((t) => String(t).trim()).filter(Boolean);
    }
    if (typeof v === "string") {
      return v
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);
    }
    return [];
  }

  function normalizeArticle(raw, index) {
    const src = isPlainObject(raw) ? raw : {};
    const id = asString(src.id, "a-" + (index + 1));
    const title = asString(src.title, "");
    const body = asString(src.body, "");
    const category = asString(src.category, "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    const author = asString(src.author, "").trim();
    const editedBy = asString(src.editedBy, "").trim();
    const createdAt = asString(src.createdAt, nowIso());
    const updatedAt = asString(src.updatedAt, createdAt);
    let slug = asString(src.slug, "").trim();
    if (!slug && KB.slug && typeof KB.slug.slugify === "function") {
      slug = KB.slug.slugify(title || id);
    }
    // Preserve unknown fields; first-class author / editedBy default to ""
    const article = Object.assign({}, src, {
      id: id,
      slug: slug,
      title: title,
      body: body,
      category: category,
      tags: asTags(src.tags),
      author: author,
      editedBy: editedBy,
      createdAt: createdAt,
      updatedAt: updatedAt,
      extra: isPlainObject(src.extra) ? src.extra : {}
    });
    return article;
  }

  function normalizeDoc(raw) {
    const src = isPlainObject(raw) ? raw : {};
    const articles = Array.isArray(src.articles) ? src.articles.map(normalizeArticle) : [];
    // Preserve unknown top-level fields; bump version lightly for new first-class fields
    const ver = src.version != null ? Number(src.version) || 1 : 1;
    return Object.assign({}, src, {
      version: ver < 2 ? 2 : ver,
      app: asString(src.app, "kb") || "kb",
      updatedAt: asString(src.updatedAt, nowIso()),
      meta: isPlainObject(src.meta) ? src.meta : {},
      articles: articles
    });
  }

  function validateBeforeSave(doc) {
    if (!isPlainObject(doc)) return "資料格式無效";
    if (!Array.isArray(doc.articles)) return "articles 必須係陣列";
    for (let i = 0; i < doc.articles.length; i++) {
      const a = doc.articles[i];
      if (!isPlainObject(a)) return "文章 #" + (i + 1) + " 格式無效";
      if (!String(a.slug || "").trim()) return "文章「" + (a.title || a.id || i + 1) + "」缺少 slug";
      if (!String(a.id || "").trim()) return "文章缺少 id";
    }
    return null;
  }

  function createArticle(partial) {
    const p = isPlainObject(partial) ? partial : {};
    const id =
      p.id ||
      "a-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 8);
    const title = asString(p.title, "未命名文章");
    let slug = asString(p.slug, "").trim();
    if (!slug && KB.slug && typeof KB.slug.slugify === "function") {
      slug = KB.slug.slugify(title);
    }
    if (!slug) slug = id;
    const ts = nowIso();
    return normalizeArticle(
      Object.assign({}, p, {
        id: id,
        slug: slug,
        title: title,
        body: asString(p.body, ""),
        category: asString(p.category, ""),
        tags: asTags(p.tags),
        author: asString(p.author, "").trim(),
        editedBy: asString(p.editedBy, "").trim(),
        createdAt: asString(p.createdAt, ts),
        updatedAt: asString(p.updatedAt, ts),
        extra: isPlainObject(p.extra) ? p.extra : {}
      }),
      0
    );
  }

  KB.schema = {
    normalizeDoc: normalizeDoc,
    normalizeArticle: normalizeArticle,
    validateBeforeSave: validateBeforeSave,
    createArticle: createArticle,
    emptyDoc: function () {
      return normalizeDoc({ version: 2, app: "kb", meta: {}, articles: [] });
    }
  };
})(window);
