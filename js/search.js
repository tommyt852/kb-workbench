(function (global) {
  const KB = (global.KB = global.KB || {});

  function tokenize(q) {
    return String(q || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }

  function haystack(article) {
    const a = article || {};
    return [a.title, a.body, a.slug, a.category, (a.tags || []).join(" ")]
      .join("\n")
      .toLowerCase();
  }

  function filter(articles, query) {
    const tokens = tokenize(query);
    const list = articles || [];
    if (!tokens.length) return list.slice();
    return list.filter(function (a) {
      const hay = haystack(a);
      return tokens.every(function (t) {
        return hay.indexOf(t) !== -1;
      });
    });
  }

  KB.search = {
    tokenize: tokenize,
    filter: filter,
    haystack: haystack
  };
})(window);
