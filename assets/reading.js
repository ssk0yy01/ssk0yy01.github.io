(() => {
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('ko', { granularity: 'sentence' }) : null;

  function sentenceEnds(text) {
    if (!segmenter) return [];
    return [...segmenter.segment(text)].slice(0, -1)
      .map(part => part.index + part.segment.trimEnd().length);
  }

  function readingImageWidth(width) {
    return width > 0 && width < 800 ? Math.min(960, Math.round(width * 1.6)) : width;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { sentenceEnds, readingImageWidth };
  }
  if (typeof document === 'undefined') return;

  document.querySelectorAll('.article-body p, .article-body li').forEach(block => {
    // Preserve author-supplied breaks, nested lists, and technical tables verbatim.
    if (block.closest('table, pre, figure') || block.querySelector('br, p, ul, ol, pre, table')) return;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let length = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      nodes.push({ node, start: length, end: length + node.length });
      length += node.length;
    }
    sentenceEnds(block.textContent).reverse().forEach(end => {
      const entry = nodes.find(item => end > item.start && end <= item.end);
      if (!entry || entry.node.parentElement.closest('code, a, kbd, samp, math')) return;
      entry.node.splitText(end - entry.start);
      entry.node.after(document.createElement('br'));
    });
  });

  document.querySelectorAll('.article-body img').forEach(img => {
    function resize() {
      const original = img.naturalWidth || Number(img.getAttribute('width'));
      if (original > 0 && original < 800) img.style.width = `${readingImageWidth(original)}px`;
    }
    resize();
    if (!img.complete) img.addEventListener('load', resize, { once: true });
  });
})();
