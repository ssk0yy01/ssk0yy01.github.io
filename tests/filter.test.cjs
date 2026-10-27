const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');

function mount(topics) {
  const buttons = ['all', 'web', 'blog', 'other'].map(filter => ({
    dataset: { filter },
    setAttribute(name, value) { this[name] = value; },
    addEventListener(event, handler) { this.click = handler; }
  }));
  const posts = topics.map(topic => ({ dataset: { topic }, hidden: false }));
  const count = {};
  const empty = {};
  const bar = { hidden: true, querySelectorAll: () => buttons };
  const area = {
    querySelector: selector => ({ '.filter-bar': bar, '.post-count': count, '.empty-state': empty })[selector],
    querySelectorAll: () => posts
  };
  runInNewContext(readFileSync('assets/filter.js', 'utf8'), { document: { querySelector: () => area } });
  return { buttons, posts, count, empty, bar };
}

const page = mount(['blog', 'web', 'other']);
assert.equal(page.bar.hidden, false);
assert.equal(page.count.textContent, '3개');
page.buttons[1].click();
assert.deepEqual(page.posts.map(post => post.hidden), [true, false, true]);
assert.equal(page.count.textContent, '1개');
assert.equal(page.buttons[1]['aria-pressed'], 'true');
assert.equal(page.buttons[0]['aria-pressed'], 'false');
page.buttons[3].click();
assert.deepEqual(page.posts.map(post => post.hidden), [true, true, false]);
page.buttons[0].click();
assert.equal(page.posts.filter(post => !post.hidden).length, 3);
const sparse = mount(['blog']);
sparse.buttons[1].click();
assert.equal(sparse.empty.hidden, false);
assert.equal(sparse.count.textContent, '0개');
sparse.buttons[2].click();
assert.equal(sparse.empty.hidden, true);
assert.equal(sparse.count.textContent, '1개');
assert.equal(mount([]).empty.hidden, false);
console.log('PASS: filtering, reset, selection state, empty results, and empty category');
