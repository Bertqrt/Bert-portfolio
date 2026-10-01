(function () {
  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Theme toggle
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // Build the email address on click so scrapers don't find it (same trick as the blog)
  document.querySelectorAll('[data-user][data-domain]').forEach(function (link) {
    var address = link.dataset.user + '@' + link.dataset.domain;
    link.href = 'mailto:' + address;
    var label = link.querySelector('.addr');
    if (label) label.textContent = address;
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
