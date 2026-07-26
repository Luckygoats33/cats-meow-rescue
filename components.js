/* Cat's Meow Cat Rescue — Shared Components
   Single source of truth for header, footer, mobile nav, and sticky bar.
   All pages reference this file. Changes here update every page. */

(function(){
  var isIndex = location.pathname.endsWith('index.html') || location.pathname.endsWith('/cats-meow-rescue/') || location.pathname === '/';
  var isSubdir = location.pathname.includes('/blog/');
  var prefix = isSubdir ? '../' : '';
  function href(anchor) {
    if (anchor.startsWith('#')) return isIndex ? anchor : prefix + 'index.html' + anchor;
    if (anchor.startsWith('http')) return anchor;
    return prefix + anchor;
  }

  // Logo (base64 inline for instant render, no flash)
  var logoSrc = prefix + 'logo-cats-128.png';

  // === HEADER ===
  var headerHTML = '<header class="site-header" id="site-header">'
    + '<div class="header-inner">'
    + '<a href="' + href('#') + '" class="logo">'
    + '<img src="' + logoSrc + '" alt="Cat\'s Meow Cat Rescue" class="logo-img" width="44" height="44">'
    + ' Cat\'s Meow</a>'
    + '<nav class="main-nav">'
    + '<a href="' + href('#cats') + '">Adopt</a>'
    + '<div class="nav-dropdown"><a href="' + href('#contact-us') + '">Get Involved</a>'
    + '<div class="nav-dropdown-menu">'
    + '<a href="' + href('#help') + '">Donate</a>'
    + '<a href="' + href('#apply') + '">Foster a Cat</a>'
    + '<a href="' + href('#contact-us') + '">Volunteer</a>'
    + '<a href="' + href('#events') + '">Events</a>'
    + '</div></div>'
    + '<a href="' + href('shop.html') + '">Shop</a>'
    + '<div class="nav-dropdown"><a href="' + href('blog.html') + '">Blog</a>'
    + '<div class="nav-dropdown-menu">'
    + '<a href="' + href('blog.html') + '">All Posts</a>'
    + '<a href="' + href('blog.html#adoption-tips') + '">Adoption Tips</a>'
    + '<a href="' + href('blog.html#cat-health') + '">Cat Health</a>'
    + '<a href="' + href('blog.html#cat-behavior') + '">Cat Behavior</a>'
    + '<a href="' + href('blog.html#fostering') + '">Fostering</a>'
    + '<a href="' + href('blog.html#community') + '">Community</a>'
    + '<a href="' + href('blog.html#cat-care') + '">Cat Care</a>'
    + '</div></div>'
    + '<a href="' + href('about.html') + '">About</a>'
    + '<a href="' + href('#contact-us') + '">Contact</a>'
    + '</nav>'
    + '<a href="' + href('#help') + '" class="btn btn--rose btn--sm btn--pill header-cta">Donate</a>'
    + '<button class="search-toggle" id="search-toggle" aria-label="Search site"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>'
    + '<button class="cart-toggle" id="cart-toggle" aria-label="Shopping cart"><svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg><span class="cart-badge" id="cart-badge">0</span></button>'
    + '<button class="nav-toggle" id="nav-toggle" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>'
    + '</div></header>';

  // === MOBILE NAV ===
  var mobileNavHTML = '<div class="mobile-nav" id="mobile-nav" aria-hidden="true">'
    + '<nav>'
    + '<a href="' + href('#cats') + '">Adopt</a>'
    + '<a href="' + href('#help') + '">Donate</a>'
    + '<a href="' + href('#events') + '">Events</a>'
    + '<a href="' + href('shop.html') + '">Shop</a>'
    + '<a href="' + href('blog.html') + '">Blog</a>'
    + '<a href="' + href('about.html') + '">About</a>'
    + '<a href="' + href('#contact-us') + '">Contact</a>'
    + '<a href="' + href('#help') + '" class="btn btn--rose btn--pill mobile-donate" style="margin-top:.5rem">Donate Now</a>'
    + '</nav></div>';

  // === FOOTER ===
  var footerHTML = '<footer class="site-footer">'
    + '<div class="container"><div class="footer-grid">'
    + '<div class="footer-brand">'
    + '<a href="' + href('#') + '" class="logo"><img src="' + logoSrc + '" alt="Cat\'s Meow Cat Rescue" class="logo-img"></a>'
    + '<p class="footer-tagline">Saving lives, one cat at a time.<br>Foster-based rescue in Milwaukie, Oregon.</p>'
    + '<div class="footer-social">'
    + '<a href="https://www.facebook.com/catsmeowcatrescue/" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>'
    + '<a href="mailto:catsmeowcatrescue@gmail.com" aria-label="Email"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></a>'
    + '</div></div>'
    + '<div class="footer-col"><h4>Explore</h4><ul>'
    + '<li><a href="' + href('#cats') + '">Adoptable Cats</a></li>'
    + '<li><a href="' + href('#help') + '">Donate</a></li>'
    + '<li><a href="' + href('#events') + '">Events</a></li>'
    + '<li><a href="' + href('shop.html') + '">Shop</a></li>'
    + '<li><a href="' + href('blog.html') + '">Blog</a></li>'
    + '<li><a href="' + href('about.html') + '">About Us</a></li>'
    + '<li><a href="' + href('#apply') + '">Apply to Adopt</a></li>'
    + '<li><a href="' + href('faq.html') + '">FAQ</a></li>'
    + '<li><a href="' + href('#contact-us') + '">Contact Us</a></li>'
    + '</ul></div>'
    + '<div class="footer-col"><h4>Resources</h4><ul>'
    + '<li><a href="https://www.feralcats.com/" target="_blank" rel="noopener">Feral Cat Coalition OR</a></li>'
    + '<li><a href="https://www.oregonhumane.org/" target="_blank" rel="noopener">Oregon Humane Society</a></li>'
    + '<li><a href="https://catadoptionteam.org/" target="_blank" rel="noopener">Cat Adoption Team</a></li>'
    + '<li><a href="https://www.petfinder.com/" target="_blank" rel="noopener">Petfinder</a></li>'
    + '</ul></div>'
    + '<div class="footer-col"><h4>Contact</h4><ul style="opacity:.6">'
    + '<li style="margin-bottom:.5rem"><a href="mailto:catsmeowcatrescue@gmail.com">catsmeowcatrescue@gmail.com</a></li>'
    + '<li style="margin-bottom:.5rem"><a href="tel:+15038506363">(503) 850-6363</a></li>'
    + '<li>PO Box 68222<br>Milwaukie, OR 97268</li>'
    + '</ul></div>'
    + '</div>'
    + '<div class="footer-bottom">'
    + '<span>&copy; 2026 Cat\'s Meow Cat Rescue &middot; 501(c)(3) Nonprofit &middot; EIN: 83-2426815</span>'
    + '<span>Proud partner of <img src="' + prefix + 'petsmart-logo.png" alt="PetSmart Charities" style="height:24px;width:auto;display:inline-block;vertical-align:middle;margin-left:4px"></span>'
    + '</div></div></footer>';

  // === MOBILE BOTTOM BAR ===
  var stickyBarHTML = '<div class="mobile-bottom-bar" id="mobile-bottom-bar">'
    + '<a href="' + href('#cats') + '" class="btn btn--pri">Adopt a Cat</a>'
    + '<a href="' + href('#help') + '" class="btn btn--gold">Donate</a>'
    + '</div>';

  // === INJECT COMPONENTS ===
  var headerMount = document.getElementById('header-mount');
  var footerMount = document.getElementById('footer-mount');

  if (headerMount) {
    headerMount.outerHTML = headerHTML + mobileNavHTML;
  }
  if (footerMount) {
    footerMount.outerHTML = footerHTML + stickyBarHTML;
  }

  // === EVENT LISTENERS ===

  // Nav toggle (hamburger menu)
  var toggle = document.getElementById('nav-toggle');
  var mob = document.getElementById('mobile-nav');
  if (toggle && mob) {
    toggle.addEventListener('click', function(){
      var open = toggle.classList.toggle('is-open');
      mob.classList.toggle('is-open', open);
      mob.setAttribute('aria-hidden', !open);
      toggle.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mob.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        toggle.classList.remove('is-open');
        mob.classList.remove('is-open');
        mob.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // Header scroll shadow
  var header = document.getElementById('site-header');
  if (header) {
    window.addEventListener('scroll', function(){
      header.classList.toggle('scrolled', window.scrollY > 10);
    }, {passive: true});
  }

  // Mobile bottom bar: hide when footer is visible
  var bar = document.getElementById('mobile-bottom-bar');
  if (bar) {
    var footer = document.querySelector('.site-footer');
    if (footer) {
      window.addEventListener('scroll', function(){
        var ft = footer.getBoundingClientRect().top;
        bar.style.opacity = ft < window.innerHeight ? '0' : '1';
        bar.style.pointerEvents = ft < window.innerHeight ? 'none' : 'auto';
      }, {passive: true});
    }
  }

  // Back to top button
  var btt = document.querySelector('.back-to-top');
  if (btt) {
    window.addEventListener('scroll', function(){
      btt.classList.toggle('visible', window.scrollY > 400);
    }, {passive: true});
    btt.addEventListener('click', function(){
      window.scrollTo({top: 0, behavior: 'smooth'});
    });
  }

  // === SITE-WIDE SEARCH ===
  var searchOverlay = document.createElement('div');
  searchOverlay.id = 'site-search';
  searchOverlay.className = 'search-overlay';
  searchOverlay.innerHTML = '<div class="search-container">'
    + '<div class="search-header">'
    + '<div class="search-input-wrap">'
    + '<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    + '<input type="text" id="search-input" class="search-input" placeholder="Search articles, pages, and more..." autocomplete="off" autocorrect="off" spellcheck="false">'
    + '<button id="search-close" class="search-close" aria-label="Close search">&times;</button>'
    + '</div></div>'
    + '<div class="search-results" id="search-results">'
    + '<div class="search-hint">Start typing to search 160+ articles, guides, and pages.</div>'
    + '</div></div>';
  document.body.appendChild(searchOverlay);

  var searchStyle = document.createElement('style');
  searchStyle.textContent = ''
    + '.search-toggle{width:44px;height:44px;display:grid;place-items:center;flex-shrink:0;border:none;background:none;cursor:pointer}'
    + '.search-toggle svg{stroke:var(--header-ink,var(--ink))}'
    + '.search-overlay{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);opacity:0;visibility:hidden;transition:all .25s;display:flex;align-items:flex-start;justify-content:center;padding-top:clamp(3rem,8vh,6rem)}'
    + '.search-overlay.is-open{opacity:1;visibility:visible}'
    + '.search-container{width:min(42rem,calc(100% - 2rem));background:var(--surface,#fff);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.25);overflow:hidden;max-height:80vh;display:flex;flex-direction:column}'
    + '.search-header{padding:1rem 1.25rem;border-bottom:1px solid var(--mist,#E8DDD2)}'
    + '.search-input-wrap{display:flex;align-items:center;gap:.75rem}'
    + '.search-icon{width:20px;height:20px;flex-shrink:0;opacity:.4}'
    + '.search-input{flex:1;border:none;outline:none;font-size:1.1rem;font-family:inherit;background:transparent;color:var(--ink,#2D1810);padding:.25rem 0}'
    + '.search-input::placeholder{color:var(--stone,#746758);opacity:.6}'
    + '.search-close{width:32px;height:32px;display:grid;place-items:center;font-size:1.5rem;border-radius:50%;border:none;background:transparent;color:var(--stone,#746758);cursor:pointer;transition:background .15s}'
    + '.search-close:hover{background:var(--mist,#E8DDD2)}'
    + '.search-results{flex:1;overflow-y:auto;padding:.5rem}'
    + '.search-hint{text-align:center;padding:2rem 1rem;color:var(--stone,#746758);font-size:.9rem}'
    + '.search-result{display:block;padding:.75rem 1rem;border-radius:10px;transition:background .15s;text-decoration:none;color:inherit}'
    + '.search-result:hover,.search-result.focused{background:var(--ground,#FFF9F2)}'
    + '.search-result-cat{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--pri,#B22222);margin-bottom:.15rem}'
    + '.search-result-title{font-family:var(--serif,system-ui);font-size:.95rem;font-weight:700;margin-bottom:.15rem;color:var(--ink,#2D1810)}'
    + '.search-result-desc{font-size:.8rem;color:var(--stone,#746758);line-height:1.4}'
    + '.search-no-results{text-align:center;padding:2rem 1rem;color:var(--stone,#746758)}'
    + '.search-no-results strong{display:block;font-size:1.1rem;margin-bottom:.5rem;color:var(--ink,#2D1810)}'
    + '@media(max-width:640px){.search-container{border-radius:0;max-height:100vh;height:100vh}.search-overlay{padding-top:0}}';
  document.head.appendChild(searchStyle);

  var searchData = null;
  var searchBtn = document.getElementById('search-toggle');
  var searchPanel = document.getElementById('site-search');
  var searchInput = document.getElementById('search-input');
  var searchResults = document.getElementById('search-results');
  var searchCloseBtn = document.getElementById('search-close');
  var focusIdx = -1;

  function openSearch() {
    searchPanel.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setTimeout(function(){ searchInput.focus(); }, 100);
    if (!searchData) {
      fetch(prefix + 'search-index.json')
        .then(function(r){ return r.json(); })
        .then(function(d){ searchData = d; })
        .catch(function(){});
    }
  }
  function closeSearch() {
    searchPanel.classList.remove('is-open');
    document.body.style.overflow = '';
    searchInput.value = '';
    searchResults.innerHTML = '<div class="search-hint">Start typing to search 160+ articles, guides, and pages.</div>';
    focusIdx = -1;
  }

  if (searchBtn) searchBtn.addEventListener('click', openSearch);
  if (searchCloseBtn) searchCloseBtn.addEventListener('click', closeSearch);
  searchPanel.addEventListener('click', function(e) {
    if (e.target === searchPanel) closeSearch();
  });
  document.addEventListener('keydown', function(e) {
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (searchPanel.classList.contains('is-open')) closeSearch(); else openSearch();
    }
    if (e.key === 'Escape' && searchPanel.classList.contains('is-open')) closeSearch();
    if (searchPanel.classList.contains('is-open')) {
      var items = searchResults.querySelectorAll('.search-result');
      if (e.key === 'ArrowDown') { e.preventDefault(); focusIdx = Math.min(focusIdx + 1, items.length - 1); updateFocus(items); }
      if (e.key === 'ArrowUp') { e.preventDefault(); focusIdx = Math.max(focusIdx - 1, 0); updateFocus(items); }
      if (e.key === 'Enter' && focusIdx >= 0 && items[focusIdx]) { items[focusIdx].click(); }
    }
  });

  function updateFocus(items) {
    items.forEach(function(el, i) { el.classList.toggle('focused', i === focusIdx); });
    if (items[focusIdx]) items[focusIdx].scrollIntoView({ block: 'nearest' });
  }

  searchInput.addEventListener('input', function() {
    var q = searchInput.value.trim().toLowerCase();
    focusIdx = -1;
    if (!q || !searchData) {
      searchResults.innerHTML = q && !searchData
        ? '<div class="search-hint">Loading search index...</div>'
        : '<div class="search-hint">Start typing to search 160+ articles, guides, and pages.</div>';
      return;
    }
    var words = q.split(/\s+/);
    var scored = searchData.map(function(item) {
      var title = (item.title || '').toLowerCase();
      var desc = (item.desc || '').toLowerCase();
      var cat = (item.cat || '').toLowerCase();
      var score = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        if (title.indexOf(w) !== -1) score += 10;
        if (desc.indexOf(w) !== -1) score += 5;
        if (cat.indexOf(w) !== -1) score += 3;
      }
      return { item: item, score: score };
    }).filter(function(x){ return x.score > 0; })
      .sort(function(a,b){ return b.score - a.score; })
      .slice(0, 12);

    if (scored.length === 0) {
      searchResults.innerHTML = '<div class="search-no-results"><strong>No results found</strong>Try a different search term or browse our <a href="' + prefix + 'blog.html" style="color:var(--pri);text-decoration:underline">blog</a>.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < scored.length; i++) {
      var it = scored[i].item;
      html += '<a href="' + prefix + it.url + '" class="search-result">'
        + '<div class="search-result-cat">' + (it.cat || '') + '</div>'
        + '<div class="search-result-title">' + (it.title || '') + '</div>'
        + '<div class="search-result-desc">' + (it.desc || '') + '</div></a>';
    }
    searchResults.innerHTML = html;
  });
})();
