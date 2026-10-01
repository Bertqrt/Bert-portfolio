(function () {
  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  // Local time in Accra
  var clock = document.getElementById('accra-time');
  if (clock) {
    var tick = function () {
      try {
        clock.textContent = new Date().toLocaleTimeString('en-GB', {
          timeZone: 'Africa/Accra',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {}
    };
    tick();
    setInterval(tick, 20000);
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

  // Project media drawers
  document.querySelectorAll('.drawer-toggle').forEach(function (btn) {
    var drawer = document.getElementById(btn.getAttribute('aria-controls'));
    if (!drawer) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      drawer.classList.toggle('open', open);
      if (!open) {
        drawer.querySelectorAll('video').forEach(function (v) { v.pause(); });
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
