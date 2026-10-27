(() => {
  const hero = document.querySelector('.hero');
  const drop = hero?.querySelector('.hero-droplet');
  if (!drop) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  let frame = 0;
  let x = 0, y = 0, targetX = 0, targetY = 0;
  let active = false;

  function render() {
    const dx = targetX - x, dy = targetY - y;
    x += dx * .12;
    y += dy * .12;
    const stretch = Math.min(Math.hypot(dx, dy) / 650, .18);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    drop.style.transform = `translate(${x - 85}px, ${y - 85}px) rotate(${angle}deg) scale(${1 + stretch}, ${1 - stretch * .65})`;
    frame = Math.abs(dx) + Math.abs(dy) > .15 ? requestAnimationFrame(render) : 0;
  }

  function stop() {
    active = false;
    hero.classList.remove('is-water-active');
    cancelAnimationFrame(frame);
    frame = 0;
  }

  hero.addEventListener('pointermove', event => {
    if (motion.matches || !pointer.matches || event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    targetX = event.clientX - bounds.left;
    targetY = event.clientY - bounds.top;
    if (!active) {
      x = targetX;
      y = targetY;
      active = true;
      hero.classList.add('is-water-active');
    }
    if (!frame) frame = requestAnimationFrame(render);
  }, { passive: true });
  hero.addEventListener('pointerleave', stop);
  hero.addEventListener('pointercancel', stop);
  window.addEventListener('blur', stop);
  window.addEventListener('scroll', stop, { passive: true });
  motion.addEventListener('change', stop);
  pointer.addEventListener('change', stop);
})();
