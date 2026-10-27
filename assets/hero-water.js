(() => {
  const hero = document.querySelector('.hero');
  const mask = document.querySelector('#water-mask');
  const noise = document.querySelector('#water-noise');
  const displacement = document.querySelector('#water-displacement');
  if (!hero || !mask || !noise || !displacement) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  let frame = 0, energy = 0, phase = 0, previous = null;

  function stop() {
    hero.classList.remove('is-water-active');
    cancelAnimationFrame(frame);
    frame = 0;
    energy = 0;
    previous = null;
    displacement.setAttribute('scale', '0');
  }

  function render() {
    phase += .22;
    energy *= .92;
    displacement.setAttribute('scale', (energy * (1 + .15 * Math.sin(phase))).toFixed(3));
    noise.setAttribute('baseFrequency', (.025 + .002 * Math.sin(phase)).toFixed(4));
    if (energy > .05) frame = requestAnimationFrame(render);
    else stop();
  }

  hero.addEventListener('pointermove', event => {
    if (motion.matches || !pointer.matches || event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    const distance = previous ? Math.hypot(x - previous.x, y - previous.y) : 0;
    previous = { x, y };
    mask.setAttribute('x', (x - 48).toFixed(2));
    mask.setAttribute('y', (y - 48).toFixed(2));
    energy = Math.min(5, energy + distance * .12);
    if (energy > .05) {
      hero.classList.add('is-water-active');
      if (!frame) frame = requestAnimationFrame(render);
    }
  }, { passive: true });
  hero.addEventListener('pointerleave', stop);
  hero.addEventListener('pointercancel', stop);
  window.addEventListener('blur', stop);
  window.addEventListener('scroll', stop, { passive: true });
  motion.addEventListener('change', stop);
  pointer.addEventListener('change', stop);
})();
