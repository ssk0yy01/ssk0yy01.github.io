const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');

function element(extra = {}) {
  return Object.assign({
    hidden: false, events: {}, attributes: {},
    addEventListener(type, handler) { this.events[type] = handler; },
    setAttribute(key, value) { this.attributes[key] = value; },
    getAttribute(key) { return this.attributes[key]; },
    focus() { this.focused = true; }
  }, extra);
}
function mount({ mobile = false, query = '', texts = [] } = {}) {
  const toggle = element();
  const backdrop = element();
  const main = element();
  const sidebarLink = element();
  const media = element({ matches: mobile });
  const input = element();
  const form = element({ hidden: true });
  const count = element();
  const empty = element();
  const posts = texts.map(textContent => element({ textContent }));
  const area = { querySelector: s => ({ form, input, '.post-count': count, '.empty-state': empty })[s], querySelectorAll: () => posts };
  const collapsed = new Set();
  const document = element({
    body: { classList: { toggle(name, value) { value ? collapsed.add(name) : collapsed.delete(name); } } },
    querySelector: s => ({ '#sidebar': { querySelector: () => sidebarLink }, '#sidebar-toggle': toggle, '.sidebar-backdrop': backdrop, '#main': main, '[data-sidebar-toggle]': element(), '[data-search-list]': area })[s],
    querySelectorAll: () => []
  });
  const history = { replaceState(_state, _title, url) { this.url = url.toString(); } };
  runInNewContext(readFileSync('assets/app.js', 'utf8'), {
    document, window: { matchMedia: () => media, location: { search: query, hash: '', href: 'https://example.com/posts/' + query }, history }, URL, URLSearchParams
  });
  return { toggle, backdrop, main, sidebarLink, media, input, form, count, empty, posts, collapsed, history, document };
}
const narrow = mount({ mobile: true });
assert.equal(narrow.toggle.getAttribute('aria-expanded'), 'false');
assert.equal(narrow.backdrop.hidden, true);
assert.equal(narrow.main.inert, false);
narrow.toggle.events.click();
assert.equal(narrow.backdrop.hidden, false);
assert.equal(narrow.main.inert, true);
assert.equal(narrow.sidebarLink.focused, true);
narrow.document.events.keydown({ key: 'Escape' });
assert.equal(narrow.toggle.getAttribute('aria-expanded'), 'false');
assert.equal(narrow.main.inert, false);
assert.equal(narrow.toggle.focused, true);
narrow.media.matches = false;
narrow.media.events.change();
assert.equal(narrow.toggle.getAttribute('aria-expanded'), 'true');
assert.equal(narrow.backdrop.hidden, true);
assert.equal(narrow.main.inert, false);
const page = mount({ query: '?q=AI+security', texts: ['AI Security 개발', 'AI 모델 분석 블로그/기술문서', '리버싱 입문'] });
assert.equal(page.form.hidden, false);
assert.deepEqual(page.posts.map(p => p.hidden), [false, true, true]);
assert.equal(page.count.textContent, '1개');
page.input.value = 'ＡＩ';
page.input.events.input();
assert.deepEqual(page.posts.map(p => p.hidden), [false, false, true]);
page.input.value = '리버싱';
page.form.events.submit({ preventDefault() {} });
assert.deepEqual(page.posts.map(p => p.hidden), [true, true, false]);
assert.equal(new URL(page.history.url).searchParams.get('q'), '리버싱');
page.input.value = '<script>alert(1)</script>';
page.input.events.input();
assert.equal(page.empty.hidden, false);
assert.equal(page.count.textContent, '0개');
page.input.value = '  ';
page.form.events.submit({ preventDefault() {} });
assert.equal(page.empty.hidden, true);
assert.equal(page.count.textContent, '3개');
assert.equal(new URL(page.history.url).searchParams.has('q'), false);
assert.equal(mount().empty.hidden, false);
console.log('PASS: responsive sidebar, keyboard dismissal, focus, search URLs, Unicode, empty and reset results');
