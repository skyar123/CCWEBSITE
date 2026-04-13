/* ==============================================
   Ghost Content API → Netlify Blog Grid
   Fetches published posts and renders them as
   post-cards matching the ConnectEd Circles design.
   ============================================== */

(function () {
  'use strict';

  const GHOST_URL = 'https://connected-circles.ghost.io';
  const GHOST_KEY = '173c2ca8bce5d07e1c0d5998a2';

  // ---- helpers ----

  function formatDate(iso) {
    var d = new Date(iso);
    var months = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    return months[d.getMonth()] + ' ' + d.getFullYear();
  }

  // Rotate thumbnail colors to match the CC palette
  var thumbClasses = ['', 'pt-terra', 'pt-lav'];
  function thumbClass(i) {
    return thumbClasses[i % thumbClasses.length];
  }

  // Stagger animation delay classes
  var animDelays = ['', 'anim-d1', 'anim-d2'];
  function animClass(i) {
    return animDelays[i % animDelays.length];
  }

  // Determine access badge
  function accessBadge(post) {
    if (post.visibility === 'members' || post.visibility === 'paid') {
      return '<span class="post-access pa-member">Circle Members</span>';
    }
    return '<span class="post-access pa-free">Free</span>';
  }

  // Strip HTML and truncate for excerpt
  function excerpt(html, maxLen) {
    if (!html) return '';
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var text = tmp.textContent || tmp.innerText || '';
    if (text.length > maxLen) text = text.substring(0, maxLen).replace(/\s+\S*$/, '') + '\u2026';
    return text;
  }

  // Build a single post card
  function buildCard(post, index) {
    var card = document.createElement('div');
    card.className = 'post-card anim ' + animClass(index);

    var thumb = post.feature_image
      ? '<div class="post-thumb" style="background-image:url(' + post.feature_image + ');background-size:cover;background-position:center;"></div>'
      : '<div class="post-thumb ' + thumbClass(index) + '"></div>';

    var author = (post.primary_author && post.primary_author.name) || 'ConnectEd Circles';
    var date = formatDate(post.published_at);
    var desc = post.custom_excerpt || excerpt(post.html, 180);

    // Link: open on the main site at /blog/ghost-post.html?slug=<slug>
    // OR link directly to Ghost post for member-gated content
    var href = post.visibility === 'public'
      ? 'blog/ghost-post.html?slug=' + post.slug
      : GHOST_URL + '/' + post.slug + '/';

    var target = post.visibility === 'public' ? '' : ' target="_blank" rel="noopener"';

    card.innerHTML =
      thumb +
      '<div class="post-body">' +
        accessBadge(post) +
        '<div class="post-meta">' + author + ' &nbsp;&middot;&nbsp; ' + date + '</div>' +
        '<h3>' + post.title + '</h3>' +
        '<p>' + desc + '</p>' +
        '<a href="' + href + '" class="read-link"' + target + '>Read more <span class="arrow">&rarr;</span></a>' +
      '</div>';

    return card;
  }

  // ---- main fetch ----

  function loadGhostPosts() {
    var grid = document.getElementById('ghost-posts-grid');
    if (!grid) return;

    var endpoint = GHOST_URL + '/ghost/api/content/posts/?key=' + GHOST_KEY +
      '&include=authors&fields=id,title,slug,custom_excerpt,html,feature_image,published_at,visibility' +
      '&limit=12&order=published_at%20desc';

    fetch(endpoint)
      .then(function (res) {
        if (!res.ok) throw new Error('Ghost API ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var posts = data.posts || [];
        if (posts.length === 0) {
          grid.innerHTML = '<p style="text-align:center;color:var(--neutral-400);">No posts yet — check back soon.</p>';
          return;
        }
        // Show the section header
        var header = document.getElementById('ghost-section-header');
        if (header) header.style.display = '';

        posts.forEach(function (post, i) {
          grid.appendChild(buildCard(post, i));
        });

        // Re-trigger scroll animations for dynamically added cards
        if ('IntersectionObserver' in window) {
          var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
              }
            });
          }, { threshold: 0.1, rootMargin: '0px 0px -10% 0px' });
          grid.querySelectorAll('.anim').forEach(function (el) {
            observer.observe(el);
          });
        } else {
          grid.querySelectorAll('.anim').forEach(function (el) {
            el.classList.add('in-view');
          });
        }
      })
      .catch(function (err) {
        console.warn('Ghost fetch failed:', err);
        // Silently fail — the static posts are still there as fallback
      });
  }

  // ---- single post loader (for ghost-post.html) ----

  function loadGhostSinglePost() {
    var container = document.getElementById('ghost-post-content');
    if (!container) return;

    var params = new URLSearchParams(window.location.search);
    var slug = params.get('slug');
    if (!slug) {
      container.innerHTML = '<p>Post not found.</p>';
      return;
    }

    var endpoint = GHOST_URL + '/ghost/api/content/posts/slug/' + slug +
      '/?key=' + GHOST_KEY + '&include=authors';

    fetch(endpoint)
      .then(function (res) {
        if (!res.ok) throw new Error('Ghost API ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var post = data.posts && data.posts[0];
        if (!post) {
          container.innerHTML = '<p>Post not found.</p>';
          return;
        }

        var author = (post.primary_author && post.primary_author.name) || 'ConnectEd Circles';
        var authorBio = (post.primary_author && post.primary_author.bio) || '';
        var authorImg = (post.primary_author && post.primary_author.profile_image) || '';
        var date = formatDate(post.published_at);

        document.title = post.title + ' | ConnectEd Circles';

        var authorBox = '';
        if (authorImg || authorBio) {
          authorBox =
            '<div class="post-author">' +
              (authorImg ? '<img src="' + authorImg + '" alt="' + author + '">' : '') +
              '<div class="post-author-info">' +
                '<strong>' + author + '</strong>' +
                (authorBio ? '<span>' + authorBio + '</span>' : '') +
              '</div>' +
            '</div>';
        }

        container.innerHTML =
          '<a href="../blog.html" class="back-link"><span style="font-size:1rem;">&larr;</span> Back to Field Notes</a>' +
          '<div class="post-header">' +
            '<div class="post-meta">' + author + ' &nbsp;&middot;&nbsp; ' + date + '</div>' +
            '<h1>' + post.title + '</h1>' +
            (post.custom_excerpt ? '<p class="post-lede">' + post.custom_excerpt + '</p>' : '') +
          '</div>' +
          '<hr class="post-divider">' +
          '<div class="ghost-content">' + post.html + '</div>' +
          authorBox +
          '<div class="subscribe-inline">' +
            '<h3>Get new posts in your inbox</h3>' +
            '<p>Clinical reflections, practical tools, and honest thinking from the ConnectEd Circles team.</p>' +
            '<form action="https://connected-circles.ghost.io/subscribe" method="POST">' +
              '<div class="subscribe-inline-form">' +
                '<input type="email" name="email" required placeholder="your@email.com" aria-label="Email address">' +
                '<button type="submit">Subscribe &rarr;</button>' +
              '</div>' +
            '</form>' +
          '</div>';
      })
      .catch(function (err) {
        console.warn('Ghost single post failed:', err);
        container.innerHTML = '<p>Unable to load this post. <a href="../blog.html">Return to Field Notes</a>.</p>';
      });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      loadGhostPosts();
      loadGhostSinglePost();
    });
  } else {
    loadGhostPosts();
    loadGhostSinglePost();
  }
})();
