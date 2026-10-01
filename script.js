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
    backToTop.addEventListener('click', function () {
      backToTop.blur();
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  // Reveal on scroll
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
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
    var length = 0;

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
        var dx = b.x - a.x;
        if (dx > 0) {
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
      update();
    };

    var update = function () {
      if (!points.length) return;
      var box = journey.getBoundingClientRect();
      // the "current" reaches as far as 60% down the screen
      var reach = window.innerHeight * 0.6 - box.top;
      var lastY = points[points.length - 1].y;
      var progress = Math.max(0, Math.min(1, reach / lastY));
      live.style.strokeDashoffset = length * (1 - progress);
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
