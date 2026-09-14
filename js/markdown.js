(function (global) {
  const KB = (global.KB = global.KB || {});

  function getMarked() {
    return global.marked;
  }

  function getPurify() {
    return global.DOMPurify;
  }

  function render(md) {
    const src = String(md == null ? "" : md);
    let html = "";
    const marked = getMarked();
    try {
      if (marked && typeof marked.parse === "function") {
        html = marked.parse(src, { async: false });
      } else if (typeof marked === "function") {
        html = marked(src);
      } else {
        html = escapeHtml(src).replace(/\n/g, "<br>");
      }
    } catch (e) {
      console.error(e);
      html = "<pre>" + escapeHtml(src) + "</pre>";
    }
    const purify = getPurify();
    if (purify && typeof purify.sanitize === "function") {
      return purify.sanitize(html, {
        USE_PROFILES: { html: true }
      });
    }
    return html;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  KB.markdown = {
    render: render,
    escapeHtml: escapeHtml
  };
})(window);
