/* SplitSmart Phase 1 — app-wide visual polish
   Authentication pages are intentionally excluded. */
(function () {
  const AUTH_PAGES = ['login.html', 'signin.html', 'signup.html', 'forgot-password.html'];
  const page = location.pathname.split('/').pop() || 'index.html';
  if (AUTH_PAGES.includes(page)) return;

  function addClasses() {
    document.body.classList.add('ss-polished-app');
    const shell = document.querySelector('.app-shell');
    if (shell) shell.classList.add('ss-app-shell-polished');

    document.querySelectorAll('.card').forEach((card, i) => {
      if (!card.dataset.ssReveal) card.dataset.ssReveal = '1';
      if (!card.dataset.ssDelay) card.style.setProperty('--ss-delay', `${Math.min(i * 35, 280)}ms`);
    });

    document.querySelectorAll('.stat-card, .snapshot-stat, .snapshot-balance, .review-kpi, .data-stat').forEach(el => {
      el.classList.add('ss-animate-number-card');
    });
  }

  function addFocusStates() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') document.body.classList.add('keyboard-nav');
    }, { passive: true });
    document.addEventListener('mousedown', () => document.body.classList.remove('keyboard-nav'), { passive: true });
  }

  function revealOnScroll() {
    const items = document.querySelectorAll('[data-ss-reveal], .quick-action-card, .group-card, .insight-card, .analytics-teaser');
    if (!('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('ss-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('ss-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px' });
    items.forEach(el => observer.observe(el));
    const mutation = new MutationObserver(() => {
      document.querySelectorAll('[data-ss-reveal]:not(.ss-visible), .quick-action-card:not(.ss-visible), .group-card:not(.ss-visible), .insight-card:not(.ss-visible), .analytics-teaser:not(.ss-visible)').forEach(el => observer.observe(el));
    });
    mutation.observe(document.body, { childList: true, subtree: true });
  }

  function addCardTilt() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('.quick-action-card, .group-card, .analytics-teaser, .insight-card').forEach(card => {
      if (card.dataset.ssTilt) return;
      card.dataset.ssTilt = '1';
      card.addEventListener('pointermove', e => {
        if (window.innerWidth < 900) return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(800px) rotateX(${(-y * 1.8).toFixed(2)}deg) rotateY(${(x * 1.8).toFixed(2)}deg) translateY(-3px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  function improveTables() {
    document.querySelectorAll('table').forEach(table => {
      const wrap = table.closest('.table-wrap');
      if (wrap) wrap.classList.add('ss-table-wrap');
      table.classList.add('ss-modern-table');
    });
  }

  function addSectionAccents() {
    document.querySelectorAll('.section-head, .panel-head, .dashboard-section-head').forEach(head => {
      head.classList.add('ss-section-head-polished');
    });
  }

  function addPageMarker() {
    const main = document.querySelector('main');
    if (main) main.classList.add('ss-page-main');
  }

  function init() {
    addClasses();
    addFocusStates();
    improveTables();
    addSectionAccents();
    addPageMarker();
    requestAnimationFrame(() => {
      revealOnScroll();
      addCardTilt();
    });
  }

  document.addEventListener('DOMContentLoaded', init, { once: true });
})();
