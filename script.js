/* ============================================================
   Abhyas — Premium Interactions & Animations
   ============================================================ */

(function () {
  'use strict';

  /* ── Custom Cursor ──────────────────────────────────────── */
  const cursor = document.getElementById('cursor');
  const cursorDot = document.getElementById('cursorDot');
  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top = mouseY + 'px';
  });

  // Smooth cursor follow
  function animateCursor() {
    cursorX += (mouseX - cursorX) * 0.12;
    cursorY += (mouseY - cursorY) * 0.12;
    cursor.style.left = cursorX + 'px';
    cursor.style.top = cursorY + 'px';
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  // Hover effect on interactive elements
  const hoverEls = document.querySelectorAll('a, button, .magnetic, .session-card, .stat-card, .testi-card, .pricing-card');
  hoverEls.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
  });

  /* ── Magnetic Buttons ───────────────────────────────────── */
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.3;
      const dy = (e.clientY - cy) * 0.3;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });

  /* ── Nav Scroll State ───────────────────────────────────── */
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });

  /* ── Scroll Reveal (IntersectionObserver) ───────────────── */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        // Stagger siblings
        const siblings = el.parentElement.querySelectorAll('.reveal-item');
        let delay = 0;
        siblings.forEach((sib, idx) => {
          if (sib === el) delay = idx * 100;
        });
        setTimeout(() => {
          el.classList.add('revealed');
        }, delay);
        revealObserver.unobserve(el);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.reveal-item').forEach(el => {
    revealObserver.observe(el);
  });

  /* ── Count Up Animations ────────────────────────────────── */
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        const duration = 1800;
        const startTime = performance.now();

        function updateCount(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          el.textContent = Math.round(eased * target);
          if (progress < 1) requestAnimationFrame(updateCount);
        }
        requestAnimationFrame(updateCount);
        countObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.count-up, .score-num, .metric-live').forEach(el => {
    countObserver.observe(el);
  });

  /* ── Score Bar Fill ─────────────────────────────────────── */
  const scoreObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fill = document.getElementById('scoreFill');
        if (fill) {
          setTimeout(() => { fill.style.width = '87%'; }, 300);
        }
        scoreObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  const scoreCard = document.getElementById('floatScore');
  if (scoreCard) scoreObserver.observe(scoreCard);

  /* ── Stat Bar Fills ─────────────────────────────────────── */
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.stat-bar-fill').forEach(fill => {
          setTimeout(() => fill.classList.add('revealed'), 200);
          // Trigger via CSS: add revealed to parent card
        });
        entry.target.classList.add('revealed');
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.stat-card').forEach(el => statObserver.observe(el));

  /* ── Bubble Typing Animation ────────────────────────────── */
  const questions = [
    "Tell me about a time you led a cross-functional team through ambiguity...",
    "How would you design a real-time collaborative editing system?",
    "Walk me through your most impactful product decision.",
    "Describe a situation where data changed your strategy.",
    "How do you approach mentoring junior engineers?",
  ];

  let questionIndex = 0;
  const typingIndicator = document.getElementById('typingIndicator');
  const bubbleText = document.getElementById('bubbleText');

  function cycleQuestion() {
    if (!typingIndicator || !bubbleText) return;

    // Show typing
    bubbleText.classList.remove('visible');
    typingIndicator.classList.remove('hidden');

    setTimeout(() => {
      typingIndicator.classList.add('hidden');
      questionIndex = (questionIndex + 1) % questions.length;
      bubbleText.textContent = questions[questionIndex];
      bubbleText.classList.add('visible');
    }, 2000);
  }

  // Initial show
  setTimeout(() => {
    bubbleText.classList.add('visible');
    typingIndicator.classList.add('hidden');
  }, 1500);

  // Cycle every 6 seconds
  setInterval(cycleQuestion, 6000);

  /* ── Hero Float 3D Tilt on Mouse Move ───────────────────── */
  const heroFloat = document.getElementById('heroFloat');
  const hero = document.getElementById('hero');

  if (hero && heroFloat) {
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);

      heroFloat.style.transform = `
        perspective(1200px)
        rotateY(${dx * 6}deg)
        rotateX(${-dy * 4}deg)
        translateZ(10px)
      `;
    });

    hero.addEventListener('mouseleave', () => {
      heroFloat.style.transform = `perspective(1200px) rotateY(0) rotateX(0) translateZ(0)`;
    });
  }

  /* ── Parallax on Scroll ─────────────────────────────────── */
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const heroBg = document.querySelector('.hero-bg');
        if (heroBg) {
          heroBg.style.transform = `translateY(${scrollY * 0.3}px)`;
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  /* ── Soft Cursor Glow (ambient lighting effect) ─────────── */
  let glowX = 0, glowY = 0;
  let gTargetX = 0, gTargetY = 0;

  const bodyGlow = document.createElement('div');
  bodyGlow.style.cssText = `
    position: fixed;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
    transform: translate(-50%, -50%);
    transition: opacity 0.3s;
    top: 0;
    left: 0;
  `;
  document.body.appendChild(bodyGlow);

  document.addEventListener('mousemove', (e) => {
    gTargetX = e.clientX;
    gTargetY = e.clientY;
  });

  function animateGlow() {
    glowX += (gTargetX - glowX) * 0.06;
    glowY += (gTargetY - glowY) * 0.06;
    bodyGlow.style.left = glowX + 'px';
    bodyGlow.style.top = glowY + 'px';
    requestAnimationFrame(animateGlow);
  }
  animateGlow();

  /* ── Logo Scroll Pause on Hover ─────────────────────────── */
  const logosInner = document.getElementById('logosInner');
  if (logosInner) {
    logosInner.addEventListener('mouseenter', () => {
      logosInner.style.animationPlayState = 'paused';
    });
    logosInner.addEventListener('mouseleave', () => {
      logosInner.style.animationPlayState = 'running';
    });
  }

  /* ── Hero entrance animation ────────────────────────────── */
  const heroLeft = document.querySelector('.hero-left');
  const heroRight = document.querySelector('.hero-right');

  if (heroLeft) {
    heroLeft.style.opacity = '0';
    heroLeft.style.transform = 'translateY(24px)';
    heroLeft.style.transition = 'opacity 1s ease, transform 1s ease';

    setTimeout(() => {
      heroLeft.style.opacity = '1';
      heroLeft.style.transform = 'translateY(0)';
    }, 100);
  }

  if (heroRight) {
    heroRight.style.opacity = '0';
    heroRight.style.transform = 'translateY(32px)';
    heroRight.style.transition = 'opacity 1s ease 0.3s, transform 1s ease 0.3s';

    setTimeout(() => {
      heroRight.style.opacity = '1';
      heroRight.style.transform = 'translateY(0)';
    }, 100);
  }

  /* ── Waveform animation randomization ───────────────────── */
  const waveBars = document.querySelectorAll('.wave-bars span');
  waveBars.forEach(bar => {
    const randHeight = Math.random() * 18 + 4;
    const randDelay = Math.random() * 1;
    const randDuration = Math.random() * 0.6 + 0.8;
    bar.style.animation = `wave ${randDuration}s ease-in-out infinite ${randDelay}s`;
  });

  /* ── Smooth Anchor Scroll ───────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── Orb Glow Pulse on idle ─────────────────────────────── */
  const aiOrb = document.getElementById('aiOrb');
  if (aiOrb) {
    setInterval(() => {
      aiOrb.style.filter = 'brightness(1.3)';
      setTimeout(() => { aiOrb.style.filter = ''; }, 300);
    }, 4000);
  }

  /* ── Session card stagger reveal ────────────────────────── */
  const sessionCards = document.querySelectorAll('.session-card');
  const sessionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const allCards = [...sessionCards];
        const idx = allCards.indexOf(el);
        setTimeout(() => {
          el.classList.add('revealed');
        }, idx * 80);
        sessionObserver.unobserve(el);
      }
    });
  }, { threshold: 0.1 });

  sessionCards.forEach(el => sessionObserver.observe(el));

  /* ── Testi card hover depth ─────────────────────────────── */
  document.querySelectorAll('.testi-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 4}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  /* ── Pricing card hover glow ────────────────────────────── */
  document.querySelectorAll('.pricing-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.background = `radial-gradient(300px circle at ${x}px ${y}px, rgba(99,102,241,0.06), transparent 70%), var(--surface)`;
    });
    card.addEventListener('mouseleave', () => {
      if (!card.classList.contains('pricing-card-pro')) {
        card.style.background = '';
      }
    });
  });

  /* ── Float card subtle hover ────────────────────────────── */
  document.querySelectorAll('.float-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = 'rgba(255,255,255,0.14)';
      card.style.boxShadow = '0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(99,102,241,0.1)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = '';
      card.style.boxShadow = '';
    });
  });

  /* ── Scroll progress line on Nav ────────────────────────── */
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    position: fixed;
    top: 68px;
    left: 0;
    height: 1px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    z-index: 101;
    width: 0%;
    transition: width 0.1s linear;
    box-shadow: 0 0 8px rgba(99,102,241,0.6);
  `;
  document.body.appendChild(progressBar);

  window.addEventListener('scroll', () => {
    const total = document.body.scrollHeight - window.innerHeight;
    const pct = (window.scrollY / total) * 100;
    progressBar.style.width = pct + '%';
  }, { passive: true });

})();
