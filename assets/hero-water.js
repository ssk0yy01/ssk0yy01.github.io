(() => {
  const hero = document.querySelector('.hero');
  const mask = document.querySelector('#water-mask');
  const noise = document.querySelector('#water-noise');
  const displacement = document.querySelector('#water-displacement');
  const pulse = document.querySelector('#water-pulse');
  const pulseMask = document.querySelector('#pulse-mask');
  const ring = document.querySelector('#wave-ring');
  if (!hero || !mask || !noise || !displacement || !pulse || !pulseMask || !ring) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  let frame = 0, energy = 0, phase = 0, previous = null;
  let pulseAge = 2, lastTime = null;
  let originX = 0, originY = 0, maxRadius = 0;

  function stop() {
    hero.classList.remove('is-water-active');
    cancelAnimationFrame(frame);
    frame = 0;
    energy = 0;
    previous = null;
    pulseAge = 2;
    lastTime = null;
    displacement.setAttribute('scale', '0');
    pulse.setAttribute('scale', '0');
    ring.style.opacity = '0';
  }

  function render(time) {
    const dt = lastTime === null ? 1 / 60 : Math.min((time - lastTime) / 1000, .05);
    lastTime = time;
    phase += dt * 13.2;
    energy *= Math.pow(.92, dt * 60);
    displacement.setAttribute('scale', (energy * (1 + .15 * Math.sin(phase))).toFixed(3));
    noise.setAttribute('baseFrequency', (.025 + .002 * Math.sin(phase)).toFixed(4));
    pulseAge += dt;
    const progress = Math.min(pulseAge / 1.4, 1);
    const radius = 8 + maxRadius * (1 - Math.pow(1 - progress, 1.6));
    const envelope = Math.sin(Math.PI * progress) * (1 - progress);
    pulseMask.setAttribute('x', (originX - radius).toFixed(2));
    pulseMask.setAttribute('y', (originY - radius).toFixed(2));
    pulseMask.setAttribute('width', (radius * 2).toFixed(2));
    pulseMask.setAttribute('height', (radius * 2).toFixed(2));
    pulse.setAttribute('scale', (20 * envelope).toFixed(3));
    ring.setAttribute('r', (radius * .84).toFixed(2));
    ring.style.opacity = (.18 * envelope).toFixed(3);
    if (energy > .05 || pulseAge < 1.4) frame = requestAnimationFrame(render);
    else stop();
  }

  hero.addEventListener('pointermove', event => {
    if (motion.matches || !pointer.matches || event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    const distance = previous ? Math.hypot(x - previous.x, y - previous.y) : 0;
    previous = { x, y };
    mask.setAttribute('x', (x - 84).toFixed(2));
    mask.setAttribute('y', (y - 84).toFixed(2));
    energy = Math.min(5, energy + distance * .12);
    if (energy > .05) {
      hero.classList.add('is-water-active');
      if (!frame) frame = requestAnimationFrame(render);
    }
  }, { passive: true });
  hero.addEventListener('click', event => {
    if (motion.matches || !pointer.matches || event.detail === 0 || event.target.closest('a, button')) return;
    const bounds = hero.getBoundingClientRect();
    originX = event.clientX - bounds.left;
    originY = event.clientY - bounds.top;
    maxRadius = Math.hypot(Math.max(originX, bounds.width - originX), Math.max(originY, bounds.height - originY)) / .84;
    ring.setAttribute('cx', originX);
    ring.setAttribute('cy', originY);
    pulseAge = 0;
    hero.classList.add('is-water-active');
    if (!frame) frame = requestAnimationFrame(render);
  });
  hero.addEventListener('pointerleave', stop);
  hero.addEventListener('pointercancel', stop);
  window.addEventListener('blur', stop);
  window.addEventListener('scroll', stop, { passive: true });
  motion.addEventListener('change', stop);
  pointer.addEventListener('change', stop);
})();
