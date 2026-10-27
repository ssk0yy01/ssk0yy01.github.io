const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');
function mount(reduced = false, fine = true) {
  const events = {}, classes = new Set(), queue = new Map();
  let next = 0, time = 0;
  const element = () => ({ attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } });
  const mask = element(), noise = element(), displacement = element(), pulse = element();
  const hero = {
    classList: { add: x => classes.add(x), remove: x => classes.delete(x) },
    getBoundingClientRect: () => ({ left: 100, top: 80 }),
    addEventListener: (name, fn) => events[name] = fn
  };
  runInNewContext(readFileSync('assets/hero-water.js', 'utf8'), {
    document: { querySelector: s => ({ '.hero': hero, '#water-mask': mask, '#water-noise': noise, '#water-displacement': displacement, '#water-pulse': pulse })[s] },
    window: { addEventListener: (name, fn) => events[name] = fn },
    matchMedia: q => ({ matches: q.includes('reduce') ? reduced : fine, addEventListener() {} }),
    requestAnimationFrame: fn => { queue.set(++next, fn); return next; },
    cancelAnimationFrame: id => queue.delete(id)
  });
  return { events, classes, mask, displacement, pulse, queue, click(link = false) { events.click({ detail: 1, target: { closest: () => link } }); }, move(x, type = 'mouse') { events.pointermove({ clientX: x, clientY: 200, pointerType: type }); }, tick() { time += 1000 / 60; const pending = [...queue.values()]; queue.clear(); pending.forEach(fn => fn(time)); } };
}
const p = mount();
p.move(300);
assert.equal(p.queue.size, 0, 'stationary entry does not distort');
assert.equal(p.mask.attrs.x, '116.00');
assert.equal(p.mask.attrs.y, '36.00');
p.move(350); p.tick();
assert.ok(Number(p.displacement.attrs.scale) > 0);
assert.ok(Number(p.displacement.attrs.scale) < 6, 'subtle displacement limit');
for (let i = 0; i < 150 && p.queue.size; i++) p.tick();
assert.equal(p.queue.size, 0);
assert.equal(p.classes.size, 0);
assert.equal(p.displacement.attrs.scale, '0');
p.move(300); p.move(350); p.events.pointerleave();
assert.equal(p.queue.size, 0);
assert.equal(p.displacement.attrs.scale, '0');
for (const disabled of [mount(true), mount(false, false)]) {
  disabled.move(300); disabled.move(400);
  disabled.click();
  assert.equal(disabled.queue.size, 0);
}
const touch = mount(); touch.move(300, 'touch'); touch.move(400, 'touch');
assert.equal(touch.queue.size, 0);
const click = mount();
click.click(true);
assert.equal(click.queue.size, 0, 'navigation links do not trigger pulse');
click.click(); click.tick();
assert.notEqual(Number(click.pulse.attrs.scale), 0);
click.click();
assert.equal(click.queue.size, 1, 'repeated clicks share one animation loop');
for (let i = 0; i < 100; i++) click.tick();
assert.equal(click.queue.size, 0);
assert.equal(click.pulse.attrs.scale, '0');
assert.equal(click.classes.size, 0);
console.log('PASS: enlarged mask, local ripple, click pulse, settling, repeat clicks, navigation and motion preferences');
