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

  // ── Ghost subscribe forms ──
  // Calls a Netlify Function that proxies the request to Ghost server-to-server,
  // bypassing the CORS restriction that blocks browser → Ghost direct calls.

  document.querySelectorAll('form[action*="ghost.io/subscribe"], form[action*="ghost.io/members"]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var emailInput = form.querySelector('input[type="email"]');
      var btn = form.querySelector('button[type="submit"], button:not([type])');
      if (!emailInput) return;

      var email = emailInput.value.trim();
      if (!email) { emailInput.focus(); return; }

      var origText = btn ? btn.textContent : '';
      if (btn) { btn.textContent = 'Sending\u2026'; btn.disabled = true; }

      fetch('/.netlify/functions/ghost-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      })
        .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
        .then(function (result) {
          if (result.ok && result.data.success) {
            if (result.data.already_subscribed) {
              showFormMsg(form, "You're already subscribed with " + email + "! Check your inbox for past issues.", 'info');
            } else {
              showFormMsg(form, "\u2713 You're subscribed! Check " + email + " for a welcome email from Ghost.", 'success');
            }
            emailInput.value = '';
          } else {
            showFormMsg(form, result.data.error || 'Something went wrong. Please try again.', 'error');
          }
        })
        .catch(function () {
          showFormMsg(form, 'Could not connect. Please try again.', 'error');
        })
        .finally(function () {
          if (btn) { btn.textContent = origText; btn.disabled = false; }
        });
    });
  });

  function showFormMsg(form, msg, type) {
    var existing = form.parentNode.querySelector('.form-feedback');
    if (existing) existing.remove();
    var el = document.createElement('p');
    el.className = 'form-feedback';
    el.textContent = msg;
    el.style.cssText = 'font-size:0.85rem;margin-top:12px;text-align:center;' +
      (type === 'success' ? 'color:#5d8a72;' : type === 'info' ? 'color:#4a7c8a;' : 'color:#c06030;');
    form.parentNode.insertBefore(el, form.nextSibling);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 10000);
  }

})();
