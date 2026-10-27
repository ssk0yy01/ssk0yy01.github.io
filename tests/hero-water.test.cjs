const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');
const source = readFileSync('assets/hero-water.js', 'utf8');
function mount(reduced = false, fine = true) {
  const events = {}, classes = new Set(), queue = new Map();
  let next = 0;
  const drop = { style: {} };
  const hero = {
    querySelector: () => drop,
    classList: { add: x => classes.add(x), remove: x => classes.delete(x) },
    getBoundingClientRect: () => ({ left: 100, top: 80 }),
    addEventListener: (name, fn) => events[name] = fn
  };
  runInNewContext(source, {
    document: { querySelector: () => hero },
    window: { addEventListener: (name, fn) => events[name] = fn },
    matchMedia: query => ({ matches: query.includes('reduce') ? reduced : fine, addEventListener() {} }),
    requestAnimationFrame: fn => { queue.set(++next, fn); return next; },
    cancelAnimationFrame: id => queue.delete(id)
  });
  return { events, classes, drop, queue, tick() { const pending = [...queue.values()]; queue.clear(); pending.forEach(fn => fn()); } };
}
const page = mount();
page.events.pointermove({ clientX: 300, clientY: 200, pointerType: 'mouse' });
page.tick();
assert.match(page.drop.style.transform, /translate\(115px, 35px\)/);
assert.equal(page.queue.size, 0);
page.events.pointermove({ clientX: 600, clientY: 300, pointerType: 'mouse' });
page.tick();
assert.ok(page.queue.size > 0);
for (let i = 0; i < 150 && page.queue.size; i++) page.tick();
assert.equal(page.queue.size, 0, 'animation stops after settling');
page.events.pointerleave();
assert.equal(page.classes.size, 0);
assert.equal(page.queue.size, 0);
for (const disabled of [mount(true), mount(false, false)]) {
  disabled.events.pointermove({ clientX: 200, clientY: 200, pointerType: 'mouse' });
  assert.equal(disabled.queue.size, 0);
  assert.equal(disabled.classes.size, 0);
}
const touch = mount();
touch.events.pointermove({ clientX: 200, clientY: 200, pointerType: 'touch' });
assert.equal(touch.queue.size, 0);
console.log('PASS: relative position, settling, exit cleanup, reduced motion, coarse pointer and touch');
