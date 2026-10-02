(function () {
  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header: the name folds into the B mark as you scroll down and unfolds
  // as soon as you scroll back up. Each letter is its own span so they can
  // glide into the B one after another.
  var siteHeader = document.querySelector('.site-header');
  var homeLink = document.querySelector('.home-link');
  var nameEl = homeLink && homeLink.querySelector('.name');
  if (siteHeader && nameEl) {
    var text = nameEl.textContent;
    nameEl.textContent = '';
    var chars = text.split('').map(function (ch, n) {
      var span = document.createElement('span');
      span.className = 'ch';
      span.textContent = ch;
      nameEl.appendChild(span);
      return span;
    });
    // how far each letter travels toward the B, and when it leaves / returns
    var last = chars.length - 1;
    var measure = function () {
      chars.forEach(function (span, n) {
        span.style.setProperty('--x', (-span.offsetLeft * 0.55).toFixed(1) + 'px');
        span.style.setProperty('--fold-d', ((last - n) * 11) + 'ms');
        span.style.setProperty('--unfold-d', (40 + n * 11) + 'ms');
      });
    };
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    // A fold or unfold always plays to the end. If the scroll direction flips
    // meanwhile, the latest wish is remembered and played right after, so
    // fast up-and-down scrolling can never leave the name half folded.
    var FOLD_MS = reduceMotion ? 160 : 680;
    var UNFOLD_MS = reduceMotion ? 160 : 760;
    var folded = false, wantFolded = false, foldBusy = false;
    var applyFold = function () {
      if (foldBusy || wantFolded === folded) return;
      folded = wantFolded;
      siteHeader.classList.toggle('folded', folded);
      foldBusy = true;
      setTimeout(function () { foldBusy = false; applyFold(); }, folded ? FOLD_MS : UNFOLD_MS);
    };
    var requestFold = function (state) { wantFolded = state; applyFold(); };

    var lastY = window.pageYOffset;
    var foldTicking = false;
    var setFold = function () {
      foldTicking = false;
      var y = window.pageYOffset;
      var dy = y - lastY;
      if (y < 80) requestFold(false);
      else if (dy > 4 && y > 140) requestFold(true);
      else if (dy < -4) requestFold(false);
      if (Math.abs(dy) > 4 || y < 80) lastY = y;
    };
    window.addEventListener('scroll', function () {
      if (!foldTicking) { foldTicking = true; requestAnimationFrame(setFold); }
    }, { passive: true });
    if (lastY > 140) { folded = wantFolded = true; siteHeader.classList.add('folded'); }

    // Clicking the B (or the name on the home page) scrolls back to the top
    // instead of reloading the page
    var onHome = homeLink.getAttribute('aria-current') === 'page';
    homeLink.addEventListener('click', function (e) {
      if (folded || onHome) {
        e.preventDefault();
        homeLink.blur();
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    });
  }

  // Theme toggle
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('animationend', function () { toggle.classList.remove('spin'); });
    toggle.addEventListener('click', function () {
      toggle.classList.remove('spin');
      void toggle.offsetWidth; // restart the spin if clicked again quickly
      toggle.classList.add('spin');
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // Build the email address only when the icon is clicked, so it never
  // appears in the page for spam bots to scrape (same trick as the blog)
  document.querySelectorAll('.email-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = 'mailto:' + link.dataset.user + '@' + link.dataset.domain;
    });
  });

  // ---------- Scroll reveal ----------
  // Elements rise and fade in as they enter the screen, staggered when several
  // arrive together. On the Journey page only the text moves, so the copper
  // vias stay where the trace expects them.
  var revealTargets = [
    '.hero-text > *', '.photo',
    '.board-section .section-head', '.chip', '.pads > li',
    '.feature > *', '.split > div > .feature-label', '.writing-list li', '.writing-more',
    '.page-intro > *', '.filters',
    '.project > .project-num', '.project > .project-body', '.project > .spec', '.also',
    '.chapter > :not(.via)',
    '.log li', '.updated', '.toolbox > *',
    '.footer-big', '.contact-icons', '.footer-bottom'
  ].join(',');

  var startReveal = function () {};
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var toReveal = Array.prototype.slice.call(document.querySelectorAll(revealTargets));
    toReveal.forEach(function (el) { el.classList.add('rv'); });

    var revealIo = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      batch.forEach(function (entry, n) {
        var el = entry.target;
        var delay = Math.min(n, 6) * 0.08;
        el.style.setProperty('--rd', delay + 's');
        el.classList.add('in');
        revealIo.unobserve(el);
        // hand the element back to its own transitions once it has arrived
        setTimeout(function () {
          el.classList.remove('rv', 'in');
          el.style.removeProperty('--rd');
        }, (delay + 1) * 1000);
      });
    }, { rootMargin: '0px 0px -8% 0px' });

    // Things at the very end of a page (like the footer's last row) can never
    // rise above the trigger line, so once you reach the bottom, reveal
    // whatever is still waiting.
    var revealRest = function () {
      var atBottom = window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 4;
      if (!atBottom) return;
      var waiting = toReveal.filter(function (el) { return el.classList.contains('rv') && !el.classList.contains('in'); });
      waiting.forEach(function (el, n) {
        var delay = Math.min(n, 6) * 0.08;
        el.style.setProperty('--rd', delay + 's');
        el.classList.add('in');
        revealIo.unobserve(el);
        setTimeout(function () {
          el.classList.remove('rv', 'in');
          el.style.removeProperty('--rd');
        }, (delay + 1) * 1000);
      });
    };
    var restTicking = false;

    startReveal = function () {
      toReveal.forEach(function (el) { revealIo.observe(el); });
      window.addEventListener('scroll', function () {
        if (!restTicking) { restTicking = true; requestAnimationFrame(function () { restTicking = false; revealRest(); }); }
      }, { passive: true });
      window.addEventListener('resize', revealRest);
      revealRest();
    };
  }

  // ---------- Power-on screen (home page, first visit per session) ----------
  var bootScreen = document.querySelector('.boot-screen');
  if (root.classList.contains('boot') && bootScreen) {
    try { sessionStorage.setItem('booted', '1'); } catch (e) {}
    setTimeout(function () {
      bootScreen.classList.add('leave');
      // the page starts building just as the screen lifts
      setTimeout(function () { root.classList.remove('booting'); startReveal(); }, 250);
      setTimeout(function () { root.classList.remove('boot'); }, 700);
    }, 1350);
  } else {
    root.classList.remove('boot', 'booting');
    startReveal();
  }

  // Power up the chip on the home page when it scrolls into view
  var board = document.querySelector('.board');
  if (board) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      board.classList.add('powered');
    } else {
      var boardIo = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          board.classList.add('powered');
          boardIo.disconnect();
        }
      }, { threshold: 0.35 });
      boardIo.observe(board);
    }
  }

  // Back to top
  var backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    var onScroll = function () {
      backToTop.classList.toggle('visible', window.pageYOffset > 500);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    var footer = document.querySelector('.site-footer');
    if (footer && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        backToTop.classList.toggle('over-footer', entries[0].isIntersecting);
      }, { rootMargin: '0px 0px -60px 0px' }).observe(footer);
    }
    backToTop.addEventListener('click', function () {
      backToTop.blur();
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  // Project filters
  var filters = document.querySelectorAll('.filter');
  if (filters.length) {
    var projects = document.querySelectorAll('.project');
    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var kind = btn.dataset.filter;
        filters.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        projects.forEach(function (p) {
          p.hidden = kind !== 'all' && p.dataset.kind.split(' ').indexOf(kind) === -1;
        });
      });
    });
  }

  // Project media drawers.
  // The layout changes once, instantly; then the panel is revealed with a clip
  // and everything below it slides into place with transforms (FLIP), so the
  // phone never has to re-layout the page on every frame.
  var DRAWER_MS = 420;
  var DRAWER_EASE = 'cubic-bezier(0.25, 0.8, 0.25, 1)';

  // Everything that sits visually below the drawer and must move with it
  var nodesBelow = function (drawer) {
    var top = drawer.getBoundingClientRect().top - 1;
    var out = [];
    var li = drawer.closest('.project');
    Array.prototype.forEach.call(li.children, function (el) {
      if (el !== drawer && el.getBoundingClientRect().top >= top) out.push(el);
    });
    var n;
    for (n = li.nextElementSibling; n; n = n.nextElementSibling) out.push(n);
    for (n = li.parentElement.nextElementSibling; n; n = n.nextElementSibling) out.push(n);
    var main = li.closest('main');
    for (n = main.nextElementSibling; n; n = n.nextElementSibling) {
      if (n.tagName !== 'SCRIPT' && !n.classList.contains('back-to-top')) out.push(n);
    }
    return out;
  };

  document.querySelectorAll('.drawer-toggle').forEach(function (btn) {
    var drawer = document.getElementById(btn.getAttribute('aria-controls'));
    if (!drawer) return;
    var inner = drawer.querySelector('.drawer-inner');
    var running = [];
    var finishTimer = null;

    var settle = function () {
      running.forEach(function (a) { a.cancel(); });
      running = [];
      clearTimeout(finishTimer);
    };

    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      settle();
      if (!open) drawer.querySelectorAll('video').forEach(function (v) { v.pause(); });

      if (reduceMotion || !inner.animate) {
        drawer.classList.toggle('open', open);
        return;
      }

      var below = nodesBelow(drawer);
      var opts = { duration: DRAWER_MS, easing: DRAWER_EASE };
      var anim = function (el, frames) { running.push(el.animate(frames, opts)); };

      if (open) {
        // Lay out the open state once, then play from the old positions
        drawer.classList.add('open');
        var h = drawer.getBoundingClientRect().height;
        anim(inner, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }]);
        below.forEach(function (el) {
          anim(el, [{ transform: 'translateY(' + (-h) + 'px)' }, { transform: 'translateY(0)' }]);
        });
      } else {
        // Play the close while the layout is still open, then collapse once
        var hc = drawer.getBoundingClientRect().height;
        anim(inner, [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }]);
        below.forEach(function (el) {
          anim(el, [{ transform: 'translateY(0)' }, { transform: 'translateY(' + (-hc) + 'px)' }]);
        });
        finishTimer = setTimeout(function () {
          drawer.classList.remove('open');
          settle();
        }, DRAWER_MS);
        // keep the end frame held until the layout collapses
        running.forEach(function (a) { a.effect && a.effect.updateTiming({ fill: 'forwards' }); });
      }
    });
  });

  // Video player with controls that match the site
  document.querySelectorAll('.player').forEach(function (player) {
    var video = player.querySelector('video');
    var big = player.querySelector('.player-big');
    var toggle = player.querySelector('.player-toggle');
    var seek = player.querySelector('.player-seek');
    var time = player.querySelector('.player-time');
    var mute = player.querySelector('.player-mute');
    var full = player.querySelector('.player-full');

    video.removeAttribute('controls');
    player.classList.add('ready');

    var fmt = function (t) {
      t = Math.max(0, Math.floor(t || 0));
      return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2);
    };

    var paint = function () {
      var p = video.duration ? video.currentTime / video.duration : 0;
      seek.value = Math.round(p * 1000);
      seek.style.setProperty('--p', (p * 100) + '%');
      time.textContent = fmt(video.currentTime) + ' / ' + fmt(video.duration);
    };

    var play = function () {
      if (video.paused || video.ended) video.play(); else video.pause();
    };

    video.addEventListener('play', function () {
      player.classList.add('playing');
      toggle.setAttribute('aria-label', 'Pause');
    });
    video.addEventListener('pause', function () {
      player.classList.remove('playing');
      toggle.setAttribute('aria-label', 'Play');
    });
    video.addEventListener('ended', function () { player.classList.add('ended'); });
    video.addEventListener('playing', function () { player.classList.remove('ended'); });
    video.addEventListener('timeupdate', paint);
    video.addEventListener('loadedmetadata', paint);
    video.addEventListener('volumechange', function () {
      player.classList.toggle('muted', video.muted);
      mute.setAttribute('aria-label', video.muted ? 'Unmute' : 'Mute');
    });

    big.addEventListener('click', play);
    toggle.addEventListener('click', play);
    video.addEventListener('click', play);

    seek.addEventListener('input', function () {
      if (video.duration) video.currentTime = seek.value / 1000 * video.duration;
      paint();
    });

    mute.addEventListener('click', function () { video.muted = !video.muted; });

    full.addEventListener('click', function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (video.requestFullscreen) video.requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    });

    // The lab log next to the video: click a moment to jump to it
    var bench = player.closest('.bench');
    var marks = bench ? bench.querySelectorAll('[data-seek]') : [];
    marks.forEach(function (mark) {
      mark.addEventListener('click', function () {
        video.currentTime = parseFloat(mark.dataset.seek);
        video.play();
        // on phones the log sits under the video, so bring the video back into view
        var r = player.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) {
          player.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      });
    });
    if (marks.length) {
      video.addEventListener('timeupdate', function () {
        var current = null;
        marks.forEach(function (m) { if (video.currentTime >= parseFloat(m.dataset.seek) - 0.05) current = m; });
        marks.forEach(function (m) { m.classList.toggle('now', m === current && video.currentTime > 0); });
      });
      video.addEventListener('ended', function () {
        marks.forEach(function (m) { m.classList.remove('now'); });
      });
    }

    paint();
  });

  // Journey: draw a copper trace through every via, with 45 degree bends like a
  // real PCB, and fill it with "current" as you scroll down the page.
  var journey = document.querySelector('.journey');
  if (journey) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'journey-trace');
    svg.setAttribute('aria-hidden', 'true');
    var bed = document.createElementNS(NS, 'path');
    var live = document.createElementNS(NS, 'path');
    [bed, live].forEach(function (p) {
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke-width', '3');
      p.setAttribute('stroke-linejoin', 'round');
      p.setAttribute('stroke-linecap', 'round');
      svg.appendChild(p);
    });
    bed.setAttribute('class', 'bed');
    live.setAttribute('class', 'live');
    journey.insertBefore(svg, journey.firstChild);

    var chapters = journey.querySelectorAll('.chapter');
    var points = [];
    var samples = [];
    var length = 0;

    var lengthAtY = function (y) {
      if (y <= samples[0].y) return 0;
      for (var i = 1; i < samples.length; i++) {
        if (samples[i].y >= y) {
          var a = samples[i - 1], b = samples[i];
          var t = b.y === a.y ? 1 : (y - a.y) / (b.y - a.y);
          return a.len + t * (b.len - a.len);
        }
      }
      return length;
    };

    var draw = function () {
      var box = journey.getBoundingClientRect();
      points = [];
      chapters.forEach(function (ch) {
        var via = ch.querySelector('.via').getBoundingClientRect();
        points.push({ x: via.left + via.width / 2 - box.left, y: via.top + via.height / 2 - box.top, el: ch });
      });
      if (!points.length) return;

      var d = 'M' + points[0].x + ' ' + points[0].y;
      for (var i = 1; i < points.length; i++) {
        var a = points[i - 1];
        var b = points[i];
        var dx = Math.abs(b.x - a.x);
        if (dx > 1) {
          // run straight down, then a 45 degree jog over to the next via
          d += ' L' + a.x + ' ' + (b.y - dx - 24) + ' L' + b.x + ' ' + (b.y - 24) + ' L' + b.x + ' ' + b.y;
        } else {
          d += ' L' + b.x + ' ' + b.y;
        }
      }
      bed.setAttribute('d', d);
      live.setAttribute('d', d);
      length = live.getTotalLength();
      live.style.strokeDasharray = length;

      // The path is longer than it is tall because of the jogs, so map
      // heights to lengths by sampling along it.
      samples = [];
      for (var s = 0; s <= 300; s++) {
        var len = length * s / 300;
        samples.push({ len: len, y: live.getPointAtLength(len).y });
      }
      update();
    };

    var update = function () {
      if (!points.length) return;
      var box = journey.getBoundingClientRect();
      // the "current" reaches as far as 60% down the screen
      var reach = window.innerHeight * 0.6 - box.top;
      live.style.strokeDashoffset = length - lengthAtY(reach);
      points.forEach(function (p) {
        p.el.classList.toggle('lit', reach >= p.y - 4);
      });
    };

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () { ticking = false; update(); });
      }
    }, { passive: true });
    window.addEventListener('resize', draw);
    window.addEventListener('load', draw);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    draw();
  }
})();
