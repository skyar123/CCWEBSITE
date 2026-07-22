/* ConnectEd Circles — Substack feed renderer.
   Reads config from the container element:
     data-feed="home" | "blog"   (card layout + post count)
     data-feed-lang="en" | "es"  (UI strings + date locale)
   Containers: #home-substack-posts (home) or #substack-posts (blog). */

(function () {
  'use strict';

  var grid = document.querySelector('[data-feed]');
  if (!grid) return;

  var mode = grid.getAttribute('data-feed') === 'blog' ? 'blog' : 'home';
  var lang = grid.getAttribute('data-feed-lang') === 'es' ? 'es' : 'en';
  var FEED = '/api/feed';

  var STRINGS = {
    en: {
      locale: 'en-US',
      read: 'Read on Substack',
      homeFallbackText: 'Field Notes is published on Substack. Head there to read the latest reflections from the team.',
      homeFallbackBtn: 'Open Field Notes on Substack',
      blogFallbackText: 'We couldn’t load recent posts right now. Read Field Notes directly on Substack.',
      blogFallbackBtn: 'Open Field Notes'
    },
    es: {
      locale: 'es-US',
      read: 'Leer en Substack',
      homeFallbackText: 'Field Notes se publica en Substack. Visítelo para leer las reflexiones más recientes del equipo.',
      homeFallbackBtn: 'Abrir Field Notes en Substack',
      blogFallbackText: 'No pudimos cargar las publicaciones recientes. Lea Field Notes directamente en Substack.',
      blogFallbackBtn: 'Abrir Field Notes'
    }
  };
  var T = STRINGS[lang];

  function escapeHtml(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function stripHtml(s) { var t = document.createElement('div'); t.innerHTML = s || ''; return t.textContent || ''; }
  function extractImage(html) { if (!html) return ''; var m = html.match(/<img[^>]+src=["']([^"']+)["']/i); return m ? m[1] : ''; }
  function getText(el, tag) { var n = el.getElementsByTagName(tag)[0]; return n ? (n.textContent || '').trim() : ''; }
  function safeUrl(u) { return /^https:\/\//i.test(u) ? u : 'https://connectedcircles.substack.com/'; }

  function animateIn(container) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
      }, { threshold: 0.1 });
      container.querySelectorAll('.anim').forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible');
        else io.observe(el);
      });
    } else {
      container.querySelectorAll('.anim').forEach(function (el) { el.classList.add('visible'); });
    }
  }

  function fallback() {
    if (mode === 'blog') {
      grid.innerHTML = '<div class="posts-state">' +
        '<p>' + T.blogFallbackText + '</p>' +
        '<a href="https://connectedcircles.substack.com/" target="_blank" rel="noopener" class="btn btn-primary">' + T.blogFallbackBtn + ' <span class="arrow">&rarr;</span></a>' +
        '</div>';
    } else {
      grid.innerHTML = '<div class="card" style="grid-column:1/-1;text-align:center;padding:32px 24px;">' +
        '<p style="margin:0 0 14px;color:var(--neutral-500);">' + T.homeFallbackText + '</p>' +
        '<a href="https://connectedcircles.substack.com/" target="_blank" rel="noopener" class="btn btn-primary">' + T.homeFallbackBtn + ' <span class="arrow">&rarr;</span></a></div>';
    }
  }

  function formatDate(pubDate) {
    var d = new Date(pubDate);
    if (isNaN(d.getTime())) return '';
    var opts = mode === 'blog'
      ? { month: 'long', day: 'numeric', year: 'numeric' }
      : { month: 'long', year: 'numeric' };
    return d.toLocaleString(T.locale, opts);
  }

  function renderHome(items) {
    grid.innerHTML = '';
    items.slice(0, 2).forEach(function (item, i) {
      var title = getText(item, 'title');
      var link = safeUrl(getText(item, 'link') || getText(item, 'guid'));
      var description = getText(item, 'description');
      var enclosure = item.getElementsByTagName('enclosure')[0];
      var img = (enclosure && enclosure.getAttribute('url')) || extractImage(description);
      var month = formatDate(getText(item, 'pubDate'));
      var excerpt = stripHtml(description).trim();
      if (excerpt.length > 160) excerpt = excerpt.substring(0, 157) + '…';

      var imgHtml = img
        ? '<div style="height:160px;background:var(--sage-100);overflow:hidden;margin:-24px -24px 16px;border-radius:var(--r-lg) var(--r-lg) 0 0;"><img src="' + escapeHtml(img) + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;"></div>'
        : '';
      var card = document.createElement('a');
      card.className = 'card anim' + (i === 1 ? ' anim-d1' : '');
      card.href = link; card.target = '_blank'; card.rel = 'noopener';
      card.style.textDecoration = 'none'; card.style.color = 'inherit'; card.style.display = 'flex'; card.style.flexDirection = 'column';
      card.innerHTML = imgHtml +
        '<div style="font-size:0.78rem;color:var(--neutral-400);font-weight:600;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:8px;">ConnectEd Circles' + (month ? ' &nbsp;&middot;&nbsp; ' + month : '') + '</div>' +
        '<h3 style="font-size:1.05rem;margin:0 0 10px;line-height:1.35;">' + escapeHtml(title) + '</h3>' +
        '<p style="font-size:0.88rem;color:var(--neutral-500);margin:0 0 16px;flex:1;">' + escapeHtml(excerpt) + '</p>' +
        '<span style="font-size:0.85rem;font-weight:700;color:var(--sage-700);">' + T.read + ' <span class="arrow">&rarr;</span></span>';
      grid.appendChild(card);
    });
  }

  function renderBlog(items) {
    grid.innerHTML = '';
    items.slice(0, 12).forEach(function (item, i) {
      var title = getText(item, 'title');
      var link = safeUrl(getText(item, 'link') || getText(item, 'guid'));
      var description = getText(item, 'description');
      var enclosure = item.getElementsByTagName('enclosure')[0];
      var img = (enclosure && enclosure.getAttribute('url')) || extractImage(description);
      var month = formatDate(getText(item, 'pubDate'));
      var excerpt = stripHtml(description).trim();
      if (excerpt.length > 180) excerpt = excerpt.substring(0, 177) + '…';

      var thumb = img
        ? '<div class="post-thumb"><img src="' + escapeHtml(img) + '" alt="" loading="lazy"></div>'
        : '';
      var delay = i % 3 === 1 ? ' anim-d1' : i % 3 === 2 ? ' anim-d2' : '';
      var card = document.createElement('a');
      card.className = 'post-card anim' + delay;
      card.href = link; card.target = '_blank'; card.rel = 'noopener';
      card.innerHTML = thumb +
        '<div class="post-body">' +
        '<div class="post-meta">' + month + '</div>' +
        '<h3>' + escapeHtml(title) + '</h3>' +
        '<p>' + escapeHtml(excerpt) + '</p>' +
        '<span class="read-link">' + T.read + ' <span class="arrow">&rarr;</span></span>' +
        '</div>';
      grid.appendChild(card);
    });
  }

  var rendered = false;
  var timeoutId = setTimeout(function () { if (!rendered) { rendered = true; fallback(); } }, 6000);

  fetch(FEED)
    .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
    .then(function (text) {
      if (rendered) return;
      var doc = new DOMParser().parseFromString(text, 'text/xml');
      var items = Array.prototype.slice.call(doc.getElementsByTagName('item'));
      rendered = true; clearTimeout(timeoutId);
      if (!items.length) { fallback(); return; }
      if (mode === 'blog') renderBlog(items); else renderHome(items);
      animateIn(grid);
    })
    .catch(function () { if (!rendered) { rendered = true; clearTimeout(timeoutId); fallback(); } });
})();
