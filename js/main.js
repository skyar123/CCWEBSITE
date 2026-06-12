/* ConnectEd Circles — Main JS */

(function () {
  'use strict';

  // ── Mobile nav toggle ──
  var toggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');

  if (toggle && navLinks) {
    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      navLinks.classList.toggle('open');

      if (!expanded) {
        var firstLink = navLinks.querySelector('a');
        if (firstLink) firstLink.focus();
      }
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close nav on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // ── Scroll animations (IntersectionObserver) ──
  var animEls = document.querySelectorAll('.anim');
  if ('IntersectionObserver' in window && animEls.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -10% 0px' }
    );
    animEls.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('visible');
      } else {
        observer.observe(el);
      }
    });
  } else {
    animEls.forEach(function (el) { el.classList.add('visible'); });
  }

  // ── Accordion (Frameworks page) ──
  document.querySelectorAll('.accordion-header').forEach(function (btn, i) {
    var item = btn.closest('.accordion-item');
    var body = btn.nextElementSibling;
    var panelId = 'accordion-panel-' + i;
    var btnId = 'accordion-btn-' + i;

    if (!btn.id) btn.id = btnId;
    if (body) {
      body.id = panelId;
      body.setAttribute('role', 'region');
      body.setAttribute('aria-labelledby', btn.id);
    }
    btn.setAttribute('aria-controls', panelId);
    btn.setAttribute('aria-expanded', item.classList.contains('open') ? 'true' : 'false');

    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.accordion-item.open').forEach(function (openItem) {
        openItem.classList.remove('open');
        openItem.querySelector('.accordion-header').setAttribute('aria-expanded', 'false');
      });

      // Toggle clicked
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ── Accordion: open item matching URL hash on page load ──
  (function () {
    var hash = window.location.hash;
    if (!hash) return;
    var target = document.querySelector(hash + '.accordion-item');
    if (!target) return;
    document.querySelectorAll('.accordion-item.open').forEach(function (el) {
      el.classList.remove('open');
      var b = el.querySelector('.accordion-header');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
    target.classList.add('open');
    var btn = target.querySelector('.accordion-header');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    setTimeout(function () { target.scrollIntoView({ block: 'start' }); }, 120);
  })();

  // ── Smooth scroll for anchor links ──
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── Spanish-language suggestion banner ──
  // Shown once to Spanish-preferring browsers on English pages, linking to
  // this page's Spanish twin (taken from the nav language switcher).
  (function () {
    if (document.documentElement.lang !== 'en') return;
    var dismissed;
    try { dismissed = localStorage.getItem('cc-lang-banner'); } catch (e) { dismissed = '1'; }
    if (dismissed) return;
    var langs = navigator.languages || [navigator.language || ''];
    var prefersSpanish = langs.some(function (l) { return /^es\b/i.test(l); });
    if (!prefersSpanish) return;
    var esLink = document.querySelector('.nav-lang');
    if (!esLink) return;

    var banner = document.createElement('div');
    banner.className = 'lang-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Sugerencia de idioma');
    banner.innerHTML =
      '<p>¿Prefiere leer en español? Esta página está disponible en español.</p>' +
      '<a class="btn" href="' + esLink.getAttribute('href') + '">Ver en español <span class="arrow">&rarr;</span></a>' +
      '<button type="button" class="lang-banner-close" aria-label="Cerrar">&times;</button>';
    document.body.appendChild(banner);

    function dismiss() {
      banner.remove();
      try { localStorage.setItem('cc-lang-banner', '1'); } catch (e) {}
    }
    banner.querySelector('.lang-banner-close').addEventListener('click', dismiss);
    banner.querySelector('a.btn').addEventListener('click', function () {
      try { localStorage.setItem('cc-lang-banner', '1'); } catch (e) {}
    });
  })();

  // ── Nav background on scroll ──
  var nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.style.boxShadow = window.scrollY > 10 ? 'var(--shadow-sm)' : 'none';
    });
  }

  // ── Team card modals ──
  function openTeamDetail(memberId) {
    var overlay = document.getElementById('detail-' + memberId);
    if (!overlay) return;

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    var closeBtn = overlay.querySelector('.team-detail-close');
    if (closeBtn) closeBtn.focus();

    // Focus trap
    var focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    function trapFocus(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { last.focus(); e.preventDefault(); }
      } else {
        if (document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    }

    overlay._trapFocus = trapFocus;
    overlay.addEventListener('keydown', trapFocus);
    overlay._trigger = document.querySelector('[data-member="' + memberId + '"]');
  }

  function closeTeamDetail(overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (overlay._trapFocus) overlay.removeEventListener('keydown', overlay._trapFocus);
    if (overlay._trigger) overlay._trigger.focus();
  }

  document.querySelectorAll('.team-card[data-member]').forEach(function (card) {
    card.addEventListener('click', function () {
      openTeamDetail(card.getAttribute('data-member'));
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openTeamDetail(card.getAttribute('data-member'));
      }
    });
    if (!card.getAttribute('tabindex')) card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
  });

  document.querySelectorAll('.team-detail-overlay').forEach(function (overlay) {
    var closeBtn = overlay.querySelector('.team-detail-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () { closeTeamDetail(overlay); });
    }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeTeamDetail(overlay);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.team-detail-overlay.open').forEach(function (overlay) {
        closeTeamDetail(overlay);
      });
    }
  });

})();
