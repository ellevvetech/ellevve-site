/* Ellevve Tech · script.js */
(() => {
  const html = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const G = window.gsap && window.ScrollTrigger ? window.gsap : null;
  if (!G || reduce) html.classList.remove('motion');
  const motion = html.classList.contains('motion');
  html.classList.add('ready');
  if (G) {
    G.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* ---------- texto em máscara ---------- */
  function split(el) {
    if (el._words) return el._words;
    const words = [];
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = p;
            w.appendChild(wi); frag.appendChild(w); words.push(wi);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
      });
    };
    walk(el);
    el._words = words;
    el.classList.add('is-split');
    return words;
  }
  function lineMap(words) {
    let top = null, line = -1, pos = 0;
    return words.map(wi => {
      const t = wi.parentNode.getBoundingClientRect().top;
      if (top === null || Math.abs(t - top) > 6) { line++; top = t; pos = 0; } else pos++;
      return { line, pos };
    });
  }
  function prep(el) { const w = split(el); G.set(w, { yPercent: 118, opacity: 0 }); return w; }
  function play(el, delay = 0) {
    const w = split(el); const m = lineMap(w);
    return G.fromTo(w, { yPercent: 118, opacity: 0 }, {
      yPercent: 0, opacity: 1, duration: 1.45, ease: 'expo.out', overwrite: true,
      delay: i => delay + m[i].line * 0.11 + m[i].pos * 0.022
    });
  }

  /* ---------- rolagem nativa para âncoras ---------- */
  const scrollToY = y => window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
  function targetY(el) {
    if (el.id === 'topo') return 0;
    if (el.id === 'contato') return document.documentElement.scrollHeight;
    const box = el.parentElement && el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el;
    const m = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    return box.getBoundingClientRect().top + window.scrollY - m;
  }
  // foca o destino só quando a rolagem termina (antes disso o fechamento ainda pode estar inert)
  function focusLater(el, before) {
    let done = false;
    const go = () => {
      if (done) return; done = true;
      window.removeEventListener('scrollend', go);
      if (before) before();
      if (el) el.focus({ preventScroll: true });
    };
    if (reduce) { setTimeout(go, 0); return; }
    const hasEnd = 'onscrollend' in window;
    if (hasEnd) window.addEventListener('scrollend', go);
    setTimeout(go, hasEnd ? 2500 : 900);
  }
  $$('a[href^="#"]').forEach(a => {
    const id = a.getAttribute('href').slice(1);
    if (!id || a.classList.contains('skip')) return;
    a.addEventListener('click', e => {
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      const y = Math.min(targetY(el), document.documentElement.scrollHeight - window.innerHeight);
      const moving = Math.abs(window.scrollY - y) > 2;
      scrollToY(y);
      const dest = id === 'contato' ? $('.closing-ctas a') : el;
      const before = id === 'contato' ? () => openClosing(true) : null;
      if (moving) focusLater(dest, before);
      else { if (before) before(); dest.focus({ preventScroll: true }); }
      history.replaceState(null, '', '#' + id);
    });
  });

  /* ---------- cabeçalho ---------- */
  const header = $('#header');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { header.classList.toggle('is-scrolled', window.scrollY > 24); ticking = false; });
  };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const toggle = $('.nav-toggle'), panel = $('#nav-panel');
  function closeMenu() { if (!panel.hidden) { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); } }
  toggle.addEventListener('click', () => {
    const open = panel.hidden; panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open));
    if (open) $('a', panel).focus();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { closeMenu(); toggle.focus(); } });
  matchMedia('(min-width: 861px)').addEventListener('change', e => e.matches && closeMenu());

  const navLinks = $$('.nav-links a'), dot = $('.nav-dot');
  $('#contato').dataset.section = '3';
  function setActive(i) {
    navLinks.forEach((a, k) => { a.classList.toggle('is-active', k === i); if (k === i) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    const a = navLinks[i];
    if (a) { dot.style.opacity = '1'; dot.style.transform = `translateX(${a.offsetLeft + a.offsetWidth / 2}px)`; }
    else dot.style.opacity = '0';
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActive(parseInt(e.target.dataset.section, 10)); });
    }, { rootMargin: '-50% 0px -50% 0px' });
    $$('[data-section]').forEach(s => io.observe(s));
  }

  /* ---------- topo: campo de pontos ---------- */
  (function dots() {
    const c = $('.hero-canvas'); if (!c) return;
    const ctx = c.getContext('2d');
    let w = 0, h = 0, gray = [], cyan = [], raf = 0, visible = true, frame = 0;
    const small = () => window.innerWidth < 760;
    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, small() ? 1.25 : 1.5);
      w = c.clientWidth; h = c.clientHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gap = small() ? 36 : 26;
      gray = []; cyan = [];
      for (let y = gap / 2; y < h; y += gap) for (let x = gap / 2; x < w; x += gap) (Math.random() < 0.045 ? cyan : gray).push(x, y);
    }
    function pass(arr, t, color, base, gain) {
      ctx.fillStyle = color;
      for (let i = 0; i < arr.length; i += 2) {
        const x = arr[i], y = arr[i + 1];
        const z = Math.sin(x * 0.0105 + t * 0.00055) + Math.sin(y * 0.016 + x * 0.004 - t * 0.0007);
        const k = (z + 2) / 4, s = 0.8 + k * 1.4;
        ctx.globalAlpha = base + k * gain;
        ctx.fillRect(x - s / 2, y + z * 6 - s / 2, s, s);
      }
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      pass(gray, t, '#8597A3', 0.08, 0.42);
      pass(cyan, t, '#17D3F5', 0.3, 0.65);
      ctx.globalAlpha = 1;
    }
    function loop(t) {
      raf = requestAnimationFrame(loop);
      if (small() && (frame++ & 1)) return;
      draw(t);
    }
    const start = () => { if (!raf && motion && visible && !document.hidden) raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    build(); draw(0);
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); draw(performance.now()); }, 150); });
    if (!motion) return;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(c);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    start();
  })();

  /* ---------- montador ---------- */
  (function builder() {
    const wrap = $('.b-opts'), link = $('.b-link'), rows = $$('.b-row', wrap);
    const list = $('#b-chosen'), empty = $('#b-empty'), idea = $('#b-idea'), ideaWrap = $('#b-idea-wrap'), send = $('#b-send'), other = $('#opt-outra');
    const subject = 'Quero elevar o meu negócio com a Ellevve Tech';
    const center = r => r.offsetTop + r.offsetHeight / 2;
    function layout() {
      const on = rows.filter(r => r.classList.contains('is-on'));
      if (on.length < 2) {
        const y = on.length ? center(on[0]) : 0;
        link.style.opacity = '0';
        link.style.transform = `translateY(${y}px) scaleY(0)`;
        return;
      }
      const a = center(on[0]), b = center(on[on.length - 1]);
      link.style.opacity = '1';
      link.style.transform = `translateY(${a}px) scaleY(${(b - a) / wrap.offsetHeight})`;
    }
    function update() {
      const labels = rows.filter(r => r.classList.contains('is-on')).map(r => $('.opt', r).dataset.label);
      list.textContent = '';
      labels.forEach(l => { const li = document.createElement('li'); li.textContent = l; list.appendChild(li); });
      empty.hidden = labels.length > 0;
      const otherOn = other.getAttribute('aria-pressed') === 'true';
      ideaWrap.hidden = !otherOn;
      const text = otherOn ? idea.value.trim() : '';
      let body = '';
      if (labels.length) {
        const lines = ['Olá, Ellevve Tech.', '', 'Quero conversar sobre:'];
        labels.forEach(l => lines.push('• ' + (l === 'Outra ideia' && text ? 'Outra ideia: ' + text : l)));
        body = lines.join('\r\n');
      }
      send.href = 'mailto:contato@ellevve.tech?subject=' + encodeURIComponent(subject) + (body ? '&body=' + encodeURIComponent(body) : '');
      layout();
    }
    function set(btn, on) { btn.setAttribute('aria-pressed', String(on)); btn.closest('.b-row').classList.toggle('is-on', on); }
    rows.forEach(r => { const b = $('.opt', r); b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      set(b, on); update();
      if (b === other && on) idea.focus({ preventScroll: true });
    }); });
    idea.addEventListener('input', update);
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
    if (document.fonts) document.fonts.ready.then(layout);
    update();
  })();

  /* ---------- fechamento: foco só com a cortina aberta ---------- */
  const closing = $('#closing'), curtain = $('#contato');
  function openClosing(open) {
    if (!open && closing.contains(document.activeElement)) document.activeElement.blur();
    closing.inert = !open;
    if (open) closing.removeAttribute('aria-hidden'); else closing.setAttribute('aria-hidden', 'true');
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      openClosing(e.intersectionRatio >= 0.6 || e.intersectionRect.height >= window.innerHeight * 0.6);
    }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] }).observe(curtain);
  } else openClosing(true);
  const checkClosing = () => {
    const r = curtain.getBoundingClientRect();
    const vis = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    openClosing(atEnd || vis >= Math.min(r.height, window.innerHeight) * 0.6);
  };
  window.addEventListener('scroll', () => requestAnimationFrame(checkClosing), { passive: true });
  checkClosing();
  $('#to-top').addEventListener('click', () => { scrollToY(0); focusLater($('#topo')); });

  /* ---------- botões magnéticos ---------- */
  if (G && motion && finePointer) {
    $$('[data-magnetic]').forEach(el => {
      const xTo = G.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      const yTo = G.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      const rxTo = G.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3.out' });
      const ryTo = G.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3.out' });
      G.set(el, { transformPerspective: 500 });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        xTo(dx * 0.32); yTo(dy * 0.42); rxTo(-dy / r.height * 18); ryTo(dx / r.width * 14);
      });
      el.addEventListener('pointerleave', () => {
        G.to(el, { x: 0, y: 0, rotationX: 0, rotationY: 0, duration: 1.3, ease: 'elastic.out(1, 0.32)', overwrite: true });
      });
    });
  }

  if (!G || !motion) return;

  /* ---------- movimento ---------- */
  const heroTitle = $('.hero-title-text'), heroLead = $('.hero-lead');
  prep(heroTitle); prep(heroLead);
  $$('.hero-sheen').forEach(split);
  G.set('[data-fade="hero"]', { opacity: 0 });
  G.set('.cta-wrap[data-fade="hero"]', { y: 26 });

  const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))]) : Promise.resolve();
  fontsReady.then(() => {
    play(heroTitle, 0.1);
    play(heroLead, 0.75);
    G.to('.cta-wrap[data-fade="hero"]', { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', stagger: 0.1, delay: 1.05 });
    G.to('.marquee--hero', { opacity: 1, duration: 1.6, ease: 'power2.out', delay: 1.3 });
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });

  // entradas genéricas
  function revealOnScroll(el) {
    prep(el);
    const sibs = $$('[data-reveal]', el.parentElement).filter(x => x.parentElement === el.parentElement);
    const d = Math.max(0, sibs.indexOf(el)) * 0.14;
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => play(el, d) });
  }
  $$('[data-reveal]').filter(el => !el.closest('.hero') && !el.closest('.mod-step')).forEach(revealOnScroll);

  // 4. declaração palavra por palavra, ligada à rolagem
  const statement = $('.statement');
  G.fromTo(split(statement), { opacity: 0.14 }, {
    opacity: 1, ease: 'none', stagger: 0.1,
    scrollTrigger: { trigger: statement, start: 'top 82%', end: 'bottom 48%', scrub: true }
  });
  G.fromTo('.custom-bg', { xPercent: 6 }, {
    xPercent: -24, ease: 'none',
    scrollTrigger: { trigger: '.custom', start: 'top bottom', end: 'bottom top', scrub: true }
  });

  // 5. linha do tempo
  G.fromTo('.p-fill', { scaleY: 0 }, {
    scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '.p-wrap', start: 'top 62%', end: 'bottom 62%', scrub: true }
  });

  // 8. fechamento
  const tl = G.timeline({ scrollTrigger: { trigger: curtain, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } });
  tl.fromTo('.c-seal', { y: 90, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, ease: 'power2.out', duration: 0.55 }, 0.12)
    .fromTo('.closing-copy .eyebrow', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25 }, 0.22)
    .fromTo(split($('.closing-title')), { yPercent: 118, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.022, duration: 0.32, ease: 'power2.out' }, 0.3)
    .fromTo('.closing-ctas .cta-wrap', { y: 34, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.28, ease: 'power2.out' }, 0.56)
    .fromTo('.c-foot', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.22 }, 0.72);

  // 3 e 5: desktop fixa, celular empilha
  const sec = $('#modulos'), steps = $$('.mod-step', sec), bgNums = $$('.mod-bg-num', sec);
  const rBtns = $$('.r-list button', sec), rFill = $('.r-fill', sec);
  const pSteps = $$('.p-step');
  const mm = G.matchMedia();

  mm.add('(min-width: 900px)', () => {
    html.classList.add('pin-ok');
    steps.forEach(s => $$('[data-reveal]', s).forEach(prep));
    let cur = -1;
    function setStep(i) {
      if (i === cur) return;
      const prev = cur; cur = i;
      sec.dataset.step = i;
      sec.classList.toggle('is-complete', i === 3);
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      bgNums.forEach((n, k) => n.classList.toggle('is-on', k === i));
      rBtns.forEach((b, k) => { b.classList.toggle('is-done', k < i); if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      if (prev >= 0) G.to($$('.wi', steps[prev]), { yPercent: -118, opacity: 0, duration: 0.55, ease: 'power3.in', stagger: 0.004, overwrite: true });
      $$('[data-reveal]', steps[i]).forEach((el, k) => play(el, (prev >= 0 ? 0.38 : 0) + k * 0.12));
    }
    const len = () => window.innerHeight * 3;
    const st = ScrollTrigger.create({
      trigger: sec, start: 'top top', end: () => '+=' + len(), pin: true, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: self => { rFill.style.transform = `scaleY(${self.progress.toFixed(4)})`; if (self.progress > 0) setStep(Math.min(3, Math.floor(self.progress * 4))); },
      refreshPriority: 10
    });
    ScrollTrigger.create({ trigger: sec, start: 'top 70%', once: true, onEnter: () => { if (cur < 0) setStep(0); } });
    G.fromTo('.mod-bg', { yPercent: 5 }, { yPercent: -7, ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + len(), scrub: true } });
    const clicks = rBtns.map((b, i) => {
      const fn = () => scrollToY(st.start + (st.end - st.start) * ((i + 0.4) / 4));
      b.addEventListener('click', fn); return fn;
    });

    pSteps.forEach(s => ScrollTrigger.create({ trigger: s, start: 'top 62%', end: 'bottom 38%', toggleClass: { targets: s, className: 'is-active' } }));

    return () => {
      html.classList.remove('pin-ok');
      rBtns.forEach((b, i) => b.removeEventListener('click', clicks[i]));
      steps.forEach(s => s.classList.remove('is-active'));
      sec.classList.remove('is-complete');
    };
  });

  mm.add('(max-width: 899.98px)', () => {
    steps.forEach(s => $$('[data-reveal]', s).forEach(revealOnScroll));
    pSteps.forEach(s => ScrollTrigger.create({ trigger: s, start: 'top 82%', once: true, onEnter: () => s.classList.add('is-active') }));
  });

  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  window.addEventListener('load', () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); });
})();
