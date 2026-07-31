(function () {
  'use strict';

  /* ── Nav Scroll State ───────────────────────────────────── */
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });

  /* ── Scroll Reveal ──────────────────────────────────────── */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const siblings = el.parentElement.querySelectorAll('.reveal-item');
      let delay = 0;
      siblings.forEach((sib, idx) => { if (sib === el) delay = idx * 90; });
      setTimeout(() => el.classList.add('revealed'), delay);
      revealObserver.unobserve(el);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal-item').forEach(el => revealObserver.observe(el));

  /* ── Count Up ───────────────────────────────────────────── */
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const duration = 1600;
      const startTime = performance.now();
      function tick(now) {
        const p = Math.min((now - startTime) / duration, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      countObserver.unobserve(el);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.count-up, .score-num, .metric-live').forEach(el => {
    countObserver.observe(el);
  });

  /* ── Score Bar Fill ─────────────────────────────────────── */
  const scoreObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const fill = document.getElementById('scoreFill');
      if (fill) setTimeout(() => { fill.style.width = '87%'; }, 300);
      scoreObserver.unobserve(entry.target);
    });
  }, { threshold: 0.3 });
  const scoreCard = document.getElementById('floatScore');
  if (scoreCard) scoreObserver.observe(scoreCard);

  /* ── Stat Bar Fills on reveal ───────────────────────────── */
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('revealed');
      statObserver.unobserve(entry.target);
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.stat-card').forEach(el => statObserver.observe(el));

  /* ── Bubble Typing Cycle ────────────────────────────────── */
  const questions = [
    "Tell me about a time you led a cross-functional team through ambiguity...",
    "How would you design a real-time collaborative editing system?",
    "Walk me through your most impactful product decision.",
    "Describe a situation where data changed your strategy.",
    "How do you approach mentoring junior engineers?",
  ];
  let qi = 0;
  const typingEl = document.getElementById('typingIndicator');
  const bubbleEl = document.getElementById('bubbleText');

  if (typingEl && bubbleEl) {
    setTimeout(() => {
      bubbleEl.classList.add('visible');
      typingEl.classList.add('hidden');
    }, 1500);

    setInterval(() => {
      bubbleEl.classList.remove('visible');
      typingEl.classList.remove('hidden');
      setTimeout(() => {
        qi = (qi + 1) % questions.length;
        bubbleEl.textContent = questions[qi];
        bubbleEl.classList.add('visible');
        typingEl.classList.add('hidden');
      }, 2000);
    }, 6000);
  }

  /* ── Hero 3D Tilt ───────────────────────────────────────── */
  const heroFloat = document.getElementById('heroFloat');
  const heroEl = document.getElementById('hero');
  if (heroEl && heroFloat) {
    heroEl.addEventListener('mousemove', (e) => {
      const r = heroEl.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      heroFloat.style.transform = `perspective(1200px) rotateY(${dx * 5}deg) rotateX(${-dy * 3}deg)`;
    });
    heroEl.addEventListener('mouseleave', () => {
      heroFloat.style.transform = '';
    });
  }

  /* ── Parallax bg on scroll ──────────────────────────────── */
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const heroBg = document.querySelector('.hero-bg');
        if (heroBg) heroBg.style.transform = `translateY(${window.scrollY * 0.25}px)`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  /* ── Waveform bar heights (randomize) ───────────────────── */
  document.querySelectorAll('.wave-bars span').forEach(bar => {
    const d = Math.random() * 1;
    const dur = Math.random() * 0.5 + 0.8;
    bar.style.animation = `wave ${dur}s ease-in-out infinite ${d}s`;
  });

  /* ── Logo scroll pause on hover ─────────────────────────── */
  const logosInner = document.getElementById('logosInner');
  if (logosInner) {
    logosInner.addEventListener('mouseenter', () => { logosInner.style.animationPlayState = 'paused'; });
    logosInner.addEventListener('mouseleave', () => { logosInner.style.animationPlayState = 'running'; });
  }

  /* ── Testimonial 3D tilt ────────────────────────────────── */
  document.querySelectorAll('.testi-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(700px) rotateY(${x * 5}deg) rotateX(${-y * 3}deg) translateY(-3px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  /* ── Pricing card spotlight ─────────────────────────────── */
  document.querySelectorAll('.pricing-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const base = card.classList.contains('pricing-card-pro') ? 'var(--bg-2)' : 'var(--bg-1)';
      card.style.background = `radial-gradient(280px circle at ${x}px ${y}px, rgba(255,255,255,0.04), transparent 70%), ${base}`;
    });
    card.addEventListener('mouseleave', () => { card.style.background = ''; });
  });

  /* ── Smooth anchor scroll ───────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  /* ── Scroll progress bar ────────────────────────────────── */
  const bar = document.createElement('div');
  bar.style.cssText = `
    position:fixed; top:64px; left:0; height:1px;
    background:rgba(255,255,255,0.15); z-index:101;
    width:0%; transition:width 0.1s linear;
  `;
  document.body.appendChild(bar);
  window.addEventListener('scroll', () => {
    const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    bar.style.width = pct + '%';
  }, { passive: true });

  /* ── Hero entrance ──────────────────────────────────────── */
  const heroLeft = document.querySelector('.hero-left');
  const heroRight = document.querySelector('.hero-right');
  const enter = (el, delay) => {
    if (!el) return;
    el.style.cssText += `opacity:0;transform:translateY(20px);transition:opacity 0.9s ease ${delay}s,transform 0.9s ease ${delay}s;`;
    setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, 50);
  };
  enter(heroLeft, 0.05);
  enter(heroRight, 0.2);

  /* ── Session card stagger ───────────────────────────────── */
  const sessionCards = [...document.querySelectorAll('.session-card')];
  const sessionObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const idx = sessionCards.indexOf(entry.target);
      setTimeout(() => entry.target.classList.add('revealed'), idx * 70);
      sessionObs.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  sessionCards.forEach(el => sessionObs.observe(el));

})();
