(() => {
  const sidebar = document.querySelector('#sidebar');
  const toggle = document.querySelector('#sidebar-toggle');
  const backdrop = document.querySelector('.sidebar-backdrop');
  const mobile = window.matchMedia('(max-width: 760px)');

  function setExpanded(expanded, returnFocus = false) {
    document.body.classList.toggle('sidebar-collapsed', !expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? '사이드바 접기' : '사이드바 펼치기');
    sidebar.inert = !expanded;
    backdrop.hidden = !expanded || !mobile.matches;
    // The mobile drawer is modal; prevent focus reaching the covered content.
    document.querySelector('#main').inert = expanded && mobile.matches;
    if (returnFocus) toggle.focus();
  }

  function toggleSidebar() {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    setExpanded(expanded);
    if (expanded && mobile.matches) sidebar.querySelector('a').focus();
  }

  toggle.addEventListener('click', toggleSidebar);
  document.querySelector('[data-sidebar-toggle]').addEventListener('click', event => {
    event.currentTarget.closest('details').open = false;
    toggleSidebar();
  });
  backdrop.addEventListener('click', () => setExpanded(false, true));
  mobile.addEventListener('change', () => setExpanded(!mobile.matches));
  setExpanded(!mobile.matches);

  document.querySelectorAll('[data-history]').forEach(button => {
    button.addEventListener('click', () => window.history[button.dataset.history]());
  });
  document.addEventListener('click', event => {
    document.querySelectorAll('.window-menus details[open]').forEach(menu => {
      if (!menu.contains(event.target)) menu.open = false;
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.window-menus details[open]').forEach(menu => {
      menu.open = false;
      menu.querySelector('summary').focus();
    });
    if (mobile.matches && toggle.getAttribute('aria-expanded') === 'true') setExpanded(false, true);
  });

  const area = document.querySelector('[data-search-list]');
  if (!area) return;
  const form = area.querySelector('form');
  const input = area.querySelector('input');
  const posts = [...area.querySelectorAll('.post-row')];
  const count = area.querySelector('.post-count');
  const empty = area.querySelector('.empty-state');
  const normalize = text => text.normalize('NFKC').toLocaleLowerCase().trim();

  function search() {
    const words = normalize(input.value).split(/\s+/).filter(Boolean);
    let visible = 0;
    posts.forEach(post => {
      const text = normalize(post.textContent);
      post.hidden = !words.every(word => text.includes(word));
      if (!post.hidden) visible++;
    });
    count.textContent = `${visible}개`;
    empty.hidden = visible > 0;
    empty.textContent = words.length ? '검색 결과가 없습니다.' : '아직 글이 없습니다.';
  }

  input.value = new URLSearchParams(window.location.search).get('q') || '';
  input.addEventListener('input', search);
  form.addEventListener('submit', event => {
    event.preventDefault();
    search();
    const url = new URL(window.location.href);
    if (input.value.trim()) url.searchParams.set('q', input.value.trim());
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
  });
  form.hidden = false;
  search();
  if (window.location.hash === '#search') input.focus();
})();
