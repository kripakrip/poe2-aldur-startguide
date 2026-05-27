// ===== Sidebar: active section on scroll =====
(function () {
  const navLinks = Array.from(document.querySelectorAll('#nav a'));
  const sections = navLinks
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  function setActive() {
    const fromTop = window.scrollY + 120;
    let current = sections[0];
    for (const s of sections) {
      if (s.offsetTop <= fromTop) current = s;
    }
    navLinks.forEach(a => a.classList.remove('active'));
    const active = navLinks.find(a => a.getAttribute('href') === '#' + current.id);
    if (active) active.classList.add('active');
  }
  window.addEventListener('scroll', setActive, { passive: true });
  setActive();

  // Mobile toggle
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('mobileToggle');
  if (toggle) {
    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.querySelectorAll('#nav a').forEach(a =>
      a.addEventListener('click', () => sidebar.classList.remove('open'))
    );
  }
})();

// ===== Checklist persistence =====
(function () {
  const list = document.getElementById('prelaunchList');
  if (!list) return;
  const KEY = 'poe2-aldur-prelaunch';
  let state;
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { state = {}; }

  const items = Array.from(list.querySelectorAll('li'));
  items.forEach((li, i) => {
    if (state[i]) li.classList.add('done');
    li.addEventListener('click', () => {
      li.classList.toggle('done');
      state[i] = li.classList.contains('done');
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    });
  });
})();

// ===== Gallery + Lightbox =====
(function () {
  const gallery = document.getElementById('gallery');
  if (!gallery) return;

  // Generate 138 images
  const COUNT = 138;
  const frag = document.createDocumentFragment();
  for (let i = 1; i <= COUNT; i++) {
    const img = document.createElement('img');
    img.src = `images/image${i}.png`;
    img.loading = 'lazy';
    img.alt = `Скриншот #${i}`;
    img.dataset.idx = i;
    frag.appendChild(img);
  }
  gallery.appendChild(frag);

  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImg');
  const lbClose = document.getElementById('lightboxClose');

  function open(src) {
    lbImg.src = src;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    lb.classList.remove('open');
    lbImg.src = '';
    document.body.style.overflow = '';
  }
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  lbClose.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Bind clicks on gallery + any inline .fig img
  document.addEventListener('click', e => {
    const t = e.target;
    if (t.tagName === 'IMG' && (t.closest('.gallery') || t.closest('.fig'))) {
      open(t.src);
    }
  });
})();
