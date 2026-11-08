(function () {
  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Low-memory phones (around 4 GB or less) and data savers skip the heavy
  // effects: scroll reveals, word-by-word headlines, the cursor glow, the
  // magnetic buttons and the flowing current. Each of those adds GPU layers
  // or per-frame work, which is what makes cheap phones stutter.
  var conn = navigator.connection;
  var lite = (navigator.deviceMemory && navigator.deviceMemory <= 4) || !!(conn && conn.saveData);
  if (lite) root.classList.add('lite');
  var rich = !reduceMotion && !lite;
  if (rich) root.classList.add('rich');

  var hasIO = 'IntersectionObserver' in window;

  // ---------- The loader (first page of a visit only) ----------
  // The inline script in <head> adds .booting; the loader runs on CSS alone,
  // so it can never get stuck. Here we hold the page's own entrances until
  // the curtain starts lifting (the start of its lift animation), and remove
  // it once it has lifted. The timers are only a backup.
  var BOOT_MS = root.classList.contains('booting') ? 950 : 0;
  var bootWaiters = [];
  var whenBooted = function (fn) { if (!root.classList.contains('booting')) fn(); else bootWaiters.push(fn); };
  if (BOOT_MS) {
    var bootEl = document.querySelector('.boot');
    var unhold = function () {
      if (!root.classList.contains('booting')) return;
      root.classList.remove('booting');
      bootWaiters.forEach(function (fn) { fn(); });
      bootWaiters = [];
    };
    var finish = function () {
      unhold();
      if (bootEl && bootEl.parentNode) bootEl.remove();
      root.classList.remove('boot-on');
    };
    if (bootEl) {
      bootEl.addEventListener('animationstart', function (e) { if (e.animationName === 'boot-lift') unhold(); });
      bootEl.addEventListener('animationend', function (e) { if (e.animationName === 'boot-lift') finish(); });
    }
    setTimeout(unhold, 2500);
    setTimeout(finish, 4000);
  }

  // Runs fn at most once per frame while the page scrolls
  var onScrollFrame = function (fn) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () { ticking = false; fn(); });
      }
    }, { passive: true });
  };

  // ---------- Header: the name folds into the B mark ----------
  // Each letter is its own span so they can glide into the B one after another.
  var siteHeader = document.querySelector('.site-header');
  var homeLink = document.querySelector('.home-link');
  var nameEl = homeLink && homeLink.querySelector('.name');
  if (siteHeader && nameEl) {
    var text = nameEl.textContent;
    nameEl.textContent = '';
    var chars = text.split('').map(function (ch) {
      var span = document.createElement('span');
      span.className = 'ch';
      span.textContent = ch;
      nameEl.appendChild(span);
      return span;
    });
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
    // meanwhile, the latest wish is played right after, so fast scrolling can
    // never leave the name half folded.
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
    onScrollFrame(function () {
      var y = window.pageYOffset;
      if (y <= 8) { wantFolded = false; applyFold(); }
      else if (y > 60) { wantFolded = true; applyFold(); }
    });
    if (window.pageYOffset > 60) { folded = wantFolded = true; siteHeader.classList.add('folded'); }

    // Clicking the B (or the name on the home page) scrolls back to the top
    var onHome = homeLink.getAttribute('aria-current') === 'page';
    homeLink.addEventListener('click', function (e) {
      if (folded || onHome) {
        e.preventDefault();
        homeLink.blur();
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    });
  }

  // ---------- Toast: short confirmations at the bottom of the screen ----------
  var toastEl = document.querySelector('.toast');
  var toastTimer = null;
  var toast = function (message) {
    if (!toastEl) return;
    toastEl.innerHTML = '<svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    var span = document.createElement('span');
    span.textContent = message;
    toastEl.appendChild(span);
    toastEl.classList.remove('show');
    void toastEl.offsetWidth; // replay the entrance if a toast is already up
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 3400);
  };

  // ---------- Theme toggle ----------
  // Quick and simple: the new theme spreads out in a circle from the
  // button. Without view transitions the colours fade across.
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      var apply = function () {
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
      };

      if (reduceMotion || !document.startViewTransition) {
        root.classList.add('theming');
        apply();
        setTimeout(function () { root.classList.remove('theming'); }, 350);
        return;
      }

      var r = toggle.getBoundingClientRect();
      var x = r.left + r.width / 2;
      var y = r.top + r.height / 2;
      var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.classList.add('theme-vt');
      var t = document.startViewTransition(apply);
      t.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 420, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(function () {});
      var done = function () { root.classList.remove('theme-vt'); };
      t.finished.then(done, done);
    });
  }

  // ---------- Email ----------
  // The address is built only on click, so it never sits in the page for
  // spam bots to scrape. It is copied too, and a toast says so.
  document.querySelectorAll('.email-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var address = link.dataset.user + '@' + link.dataset.domain;
      var done = function (copied) {
        toast(copied ? 'Copied ' + address + '. Opening your mail app.' : 'Opening your mail app.');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(address).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
      window.location.href = 'mailto:' + address;
    });
  });

  // ---------- Text scramble ----------
  // Mono labels "decode" into place, like a datasheet booting up.
  var scramble = function (el, duration) {
    if (!rich || !el) return;
    var final = el.dataset.text || el.textContent;
    el.dataset.text = final;
    duration = duration || 700;
    var digitsOnly = /^\d+$/.test(final);
    var glyphs = digitsOnly ? '0123456789' : 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%/<>';
    var at = final.split('').map(function (ch, i) {
      return (i / final.length) * duration * 0.6 + Math.random() * duration * 0.4;
    });
    var start = performance.now();
    var frame = function (now) {
      var t = now - start;
      var out = '';
      for (var i = 0; i < final.length; i++) {
        var ch = final[i];
        out += (t >= at[i] || ch === ' ' || ch === '-') ? ch : glyphs[(Math.random() * glyphs.length) | 0];
      }
      el.textContent = out;
      if (t < duration) requestAnimationFrame(frame);
      else el.textContent = final;
    };
    requestAnimationFrame(frame);
  };

  // ---------- Headlines rise word by word ----------
  // Every word is wrapped in a mask (.w) holding the moving part (.wi).
  // The text stays real text, so screen readers and copy-paste are unaffected.
  var splitWords = function (el) {
    var n = 0;
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span');
            w.className = 'w';
            var wi = document.createElement('span');
            wi.className = 'wi';
            wi.textContent = part;
            wi.style.setProperty('--wd', Math.min(n++, 12) * 0.06 + 's');
            w.appendChild(wi);
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
    el.classList.add('split-ready');
  };

  // Letter by letter, for the headlines you can play with. Each word stays
  // together (.cw) so a line never breaks in the middle of one.
  var splitChars = function (el) {
    var n = 0;
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var word = document.createElement('span');
            word.className = 'cw';
            part.split('').forEach(function (ch) {
              var c = document.createElement('span');
              c.className = 'c';
              c.textContent = ch;
              c.style.setProperty('--cd', (n++ * 0.045).toFixed(3) + 's');
              c.style.setProperty('--r', ((Math.random() - 0.5) * 50).toFixed(1) + 'deg');
              word.appendChild(c);
            });
            frag.appendChild(word);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
    el.classList.add('chars-ready');
    // touch a letter and it hops
    var hop = function (c) {
      if (!c || !c.classList || !c.classList.contains('c') || c.classList.contains('hop')) return;
      c.style.transitionDelay = '0s';
      c.classList.add('hop');
    };
    el.addEventListener('pointerover', function (e) { hop(e.target); });
    el.addEventListener('animationend', function (e) { e.target.classList.remove('hop'); });
  };

  var splits = Array.prototype.slice.call(document.querySelectorAll('.split-words'));
  if (rich && hasIO) {
    splits.forEach(function (el) {
      if (el.closest('.hero') || el.classList.contains('footer-big')) splitChars(el);
      else splitWords(el);
    });
    var splitIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); splitIo.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    splits.forEach(function (el) {
      // the hero greets you straight away; the rest wait to be scrolled to
      if (el.closest('.hero') || el.closest('.page-intro')) {
        whenBooted(function () { setTimeout(function () { el.classList.add('in'); }, 120); });
      } else {
        splitIo.observe(el);
      }
    });
  }

  // ---------- Scroll reveal ----------
  // Blocks rise and fade in as they enter the screen, staggered when several
  // arrive together. On the Journey page only the text moves, so the vias
  // stay where the trace expects them.
  var revealTargets = [
    '.chip', '.pads > li',
    '.feature', '.writing > *',
    '.page-intro > :not(.split-words)', '.filters',
    '.project > .project-body', '.project > .spec', '.also',
    '.chapter > :not(.via)',
    '.log li', '.updated', '.toolbox',
    '.footer-actions', '.footer-bottom'
  ].join(',');

  var specLit = function (spec) {
    spec.classList.remove('wait');
    spec.querySelectorAll('li span:last-child').forEach(function (s, i) {
      setTimeout(function () { scramble(s, 650); }, i * 60);
    });
  };

  if (rich && hasIO) {
    document.querySelectorAll('.spec').forEach(function (spec) {
      spec.classList.add('wait');
      spec.querySelectorAll('li').forEach(function (li, i) { li.style.setProperty('--n', i); });
    });

    var toReveal = Array.prototype.slice.call(document.querySelectorAll(revealTargets));
    toReveal.forEach(function (el) { el.classList.add('rv'); });

    // Reveal a batch, staggered top to bottom. The delay goes straight on
    // transition-delay (not a custom property, which would restyle every
    // descendant), and the batch is cleaned up in one go afterwards.
    var reveal = function (els) {
      els.forEach(function (el, n) {
        el.style.transitionDelay = Math.min(n, 6) * 0.08 + 's';
        el.classList.add('in');
        revealIo.unobserve(el);
        if (el.classList.contains('spec')) setTimeout(function () { specLit(el); }, 200 + Math.min(n, 6) * 80);
      });
      setTimeout(function () {
        els.forEach(function (el) {
          el.classList.remove('rv', 'in');
          el.style.transitionDelay = '';
        });
      }, Math.min(els.length - 1, 6) * 80 + 1100);
    };

    var revealIo = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; })
        .map(function (e) { return e.target; });
      if (batch.length) reveal(batch);
    }, { rootMargin: '0px 0px -8% 0px' });

    // Things at the very end of a page can never rise above the trigger
    // line, so once you reach the bottom, reveal whatever is still waiting.
    var endMark = document.createElement('div');
    endMark.setAttribute('aria-hidden', 'true');
    endMark.style.cssText = 'height:1px;margin-top:-1px;pointer-events:none';
    document.body.appendChild(endMark);
    var endIo = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      var waiting = toReveal.filter(function (el) { return el.classList.contains('rv') && !el.classList.contains('in'); });
      if (waiting.length) reveal(waiting);
      else endIo.disconnect();
    });

    whenBooted(function () {
      toReveal.forEach(function (el) { revealIo.observe(el); });
    });
    endIo.observe(endMark);
  }

  // ---------- Ambient loops pause while off screen ----------
  var pauseOffscreen = function (watch, target) {
    if (!watch || !target || !hasIO) return;
    new IntersectionObserver(function (entries) {
      target.classList.toggle('paused', !entries[0].isIntersecting);
    }).observe(watch);
  };

  // ---------- Home: power up the chip when it scrolls into view ----------
  var board = document.querySelector('.board');
  if (board) {
    var powerUp = function () {
      board.classList.add('powered');
      setTimeout(function () { scramble(board.querySelector('[data-scramble]'), 900); }, 500);
    };
    if (reduceMotion || !hasIO) {
      board.classList.add('powered');
    } else {
      var boardIo = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { powerUp(); boardIo.disconnect(); }
      }, { threshold: 0.35 });
      boardIo.observe(board);
    }
  }

  // 404: the code decodes on load and again on hover
  var nf = document.querySelector('.nf-code[data-scramble]');
  if (nf) {
    scramble(nf, 900);
    nf.addEventListener('mouseenter', function () { scramble(nf, 600); });
  }

  // ---------- Home: PCB traces behind the hero ----------
  // Routed like a real board: straight runs with 45 degree jogs, each ending
  // in a via. A few carry a pulse of current. A copper copy shows through a
  // soft circle that follows the cursor.
  var circuit = document.querySelector('.hero-circuit');
  var hero = document.querySelector('.hero');
  if (circuit && hero) {
    var NS = 'http://www.w3.org/2000/svg';
    var seeded = function (seed) {
      return function () {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    };
    var svgEl = function (tag, attrs) {
      var el = document.createElementNS(NS, tag);
      for (var k in attrs) el.setAttribute(k, attrs[k]);
      return el;
    };

    var builtWidth = 0;
    var buildCircuit = function () {
      var W = circuit.clientWidth;
      var H = circuit.clientHeight;
      if (!W || !H || W === builtWidth) return;
      builtWidth = W;
      circuit.textContent = '';

      var rnd = seeded(11);
      var G = 24;
      var snap = function (v) { return Math.round(v / G) * G; };
      var clampY = function (v) { return Math.max(G, Math.min(H - G, v)); };
      var count = W < 720 ? 8 : 16;
      var traces = [];

      // Keep the traces out from behind the words, the button and the photo
      var cbox = circuit.getBoundingClientRect();
      var keepOut = Array.prototype.map.call(
        hero.querySelectorAll('h1, .lede, .hero-actions, .photo'),
        function (el) {
          var r = el.getBoundingClientRect();
          return [r.left - cbox.left - 16, r.top - cbox.top - 16, r.right - cbox.left + 16, r.bottom - cbox.top + 16];
        });
      var clashes = function (pts) {
        for (var k = 1; k < pts.length; k++) {
          var a = pts[k - 1], b = pts[k];
          var steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8));
          for (var t = 0; t <= steps; t++) {
            var px = a[0] + (b[0] - a[0]) * t / steps;
            var py = a[1] + (b[1] - a[1]) * t / steps;
            for (var q = 0; q < keepOut.length; q++) {
              var o = keepOut[q];
              if (px > o[0] && px < o[2] && py > o[1] && py < o[3]) return true;
            }
          }
        }
        return false;
      };

      for (var tries = 0, i = 0; i < count && tries < count * 40; tries++) {
        var pts = [];
        var kind = i % 3; // 0: from the left, 1: from the right, 2: from the top
        var x, y, d;
        if (kind === 2) {
          x = snap(W * (0.08 + rnd() * 0.84));
          y = -10;
          pts.push([x, y]);
          y = snap(H * (0.1 + rnd() * 0.25));
          pts.push([x, y]);
          d = rnd() < 0.5 ? -1 : 1;
          var j = snap(24 + rnd() * 48);
          x += d * j; y += j;
          pts.push([x, y]);
          x += d * snap(48 + rnd() * W * 0.12);
          pts.push([x, y]);
        } else {
          d = kind === 0 ? 1 : -1;
          x = kind === 0 ? -10 : W + 10;
          y = clampY(snap(H * (0.05 + rnd() * 0.9)));
          pts.push([x, y]);
          var segs = 1 + (rnd() < 0.5 ? 1 : 0);
          for (var s = 0; s < segs; s++) {
            x += d * snap(48 + rnd() * W * 0.14);
            pts.push([x, y]);
            var jog = snap(24 + rnd() * 48) * (rnd() < 0.5 ? -1 : 1);
            var ny = clampY(y + jog);
            if (ny !== y) { x += d * Math.abs(ny - y); y = ny; pts.push([x, y]); }
          }
          x += d * snap(24 + rnd() * 72);
          pts.push([x, y]);
        }
        if (clashes(pts)) continue;
        traces.push(pts);
        i++;
      }

      var toD = function (pts) {
        return pts.map(function (p, n) { return (n ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
      };

      var makeLayer = function (cls, withAnim) {
        var svg = svgEl('svg', { 'class': cls, width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, fill: 'none' });
        traces.forEach(function (pts, n) {
          var p = svgEl('path', { d: toD(pts), 'stroke-width': 1.25 });
          var end = pts[pts.length - 1];
          var c = svgEl('circle', { cx: end[0], cy: end[1], r: 4, 'stroke-width': 1.25 });
          if (withAnim && rich) {
            p.setAttribute('pathLength', '1');
            p.style.cssText = 'stroke-dasharray:1;stroke-dashoffset:1;animation:draw 1.4s cubic-bezier(0.16,1,0.3,1) ' + (0.2 + n * 0.06).toFixed(2) + 's forwards';
            c.style.cssText = 'opacity:0;animation:fade-in .5s ease ' + (1 + n * 0.06).toFixed(2) + 's forwards';
          }
          svg.appendChild(p);
          svg.appendChild(c);
        });
        return svg;
      };

      var bed = makeLayer('bed', true);
      circuit.appendChild(bed);

      // pulses of current on a few of the traces
      if (rich) {
        var flow = svgEl('svg', { 'class': 'flow', width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, fill: 'none' });
        traces.forEach(function (pts, n) {
          if (n % 3 === 1) return;
          var p = svgEl('path', { d: toD(pts), 'stroke-width': 2, pathLength: 100 });
          var dur = 3 + rnd() * 3;
          p.style.cssText = 'stroke-dasharray:8 120;stroke-dashoffset:8;animation:flow ' + dur.toFixed(2) + 's linear ' + (1.6 + rnd() * 4).toFixed(2) + 's infinite';
          flow.appendChild(p);
        });
        circuit.appendChild(flow);
      }

      if (finePointer && !reduceMotion && !lite) circuit.appendChild(makeLayer('hot', false));
    };

    buildCircuit();
    // the text can move once the web fonts arrive, so route again around it
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { builtWidth = 0; buildCircuit(); });
    var circuitResize = null;
    window.addEventListener('resize', function () {
      clearTimeout(circuitResize);
      circuitResize = setTimeout(buildCircuit, 200);
    });
    pauseOffscreen(hero, circuit);

    // the copper glow follows the cursor
    if (finePointer && !reduceMotion && !lite) {
      var glowFrame = 0, gx = 0, gy = 0;
      hero.addEventListener('pointermove', function (e) {
        var r = circuit.getBoundingClientRect();
        gx = e.clientX - r.left;
        gy = e.clientY - r.top;
        if (!glowFrame) {
          glowFrame = requestAnimationFrame(function () {
            glowFrame = 0;
            circuit.style.setProperty('--cx', gx + 'px');
            circuit.style.setProperty('--cy', gy + 'px');
          });
        }
      });
      hero.addEventListener('pointerenter', function () { circuit.classList.add('lit'); });
      hero.addEventListener('pointerleave', function () { circuit.classList.remove('lit'); });
    }
  }

  // ---------- Home: the photo ----------
  var photoFrame = document.querySelector('.photo-frame');
  if (photoFrame) {
    var img = photoFrame.querySelector('img');
    var loaded = function () { photoFrame.classList.add('loaded'); };
    if (img.complete && img.naturalWidth) loaded();
    else { img.addEventListener('load', loaded); img.addEventListener('error', loaded); }
  }

  // It tilts toward the cursor, with a glare that follows
  var photoCard = document.querySelector('.photo-card');
  if (photoCard && finePointer && !reduceMotion) {
    var photo = photoCard.parentElement;
    var cardBox = null;
    photoCard.addEventListener('animationend', function () { photoCard.classList.add('settled'); });
    photo.addEventListener('pointerenter', function () {
      cardBox = photoCard.getBoundingClientRect();
      photoCard.classList.add('tilting');
    });
    photo.addEventListener('pointermove', function (e) {
      if (!cardBox) return;
      var px = Math.max(0, Math.min(1, (e.clientX - cardBox.left) / cardBox.width));
      var py = Math.max(0, Math.min(1, (e.clientY - cardBox.top) / cardBox.height));
      photoCard.style.setProperty('--ry', ((px - 0.5) * 16).toFixed(2) + 'deg');
      photoCard.style.setProperty('--rx', ((0.5 - py) * 16).toFixed(2) + 'deg');
      photoCard.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
      photoCard.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
    });
    photo.addEventListener('pointerleave', function () {
      cardBox = null;
      photoCard.classList.remove('tilting');
      photoCard.style.setProperty('--rx', '0deg');
      photoCard.style.setProperty('--ry', '0deg');
    });
  }

  // ---------- Magnetic buttons ----------
  // The button leans toward the cursor and its label leans a little further.
  if (finePointer && rich) {
    document.querySelectorAll('.magnetic').forEach(function (el) {
      var box = null;
      el.addEventListener('pointerenter', function () { box = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', function (e) {
        if (!box) return;
        var x = e.clientX - (box.left + box.width / 2);
        var y = e.clientY - (box.top + box.height / 2);
        el.style.setProperty('--mx', (x * 0.3).toFixed(1) + 'px');
        el.style.setProperty('--my', (y * 0.4).toFixed(1) + 'px');
        el.style.setProperty('--lx', (x * 0.1).toFixed(1) + 'px');
        el.style.setProperty('--ly', (y * 0.12).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', function () {
        box = null;
        ['--mx', '--my', '--lx', '--ly'].forEach(function (p) { el.style.setProperty(p, '0px'); });
      });
    });
  }

  // ---------- Home: the study bot, shown working ----------
  // Plays an example /study exchange whenever the card is on screen. The
  // whole message is laid out from the start (the untyped part is just
  // invisible), so the card never changes size while it plays.
  var chat = document.querySelector('.chat');
  if (chat && !reduceMotion && hasIO) {
    var msgText = chat.querySelector('.msg-user .msg-text');
    var status = chat.querySelector('.chat-status');
    var full = msgText.textContent;
    var typed = document.createElement('span');
    var caret = document.createElement('span');
    caret.className = 'caret';
    var rest = document.createElement('span');
    rest.style.visibility = 'hidden';
    msgText.textContent = '';
    msgText.appendChild(typed);
    msgText.appendChild(caret);
    msgText.appendChild(rest);

    var runId = 0;
    var timers = [];
    var later = function (ms, fn) { timers.push(setTimeout(fn, ms)); };
    var setStep = function (n) { chat.setAttribute('data-step', n); };

    var play = function () {
      var id = ++runId;
      timers.forEach(clearTimeout);
      timers = [];
      chat.classList.add('playing');
      chat.classList.remove('fading');
      typed.textContent = '';
      rest.textContent = full;
      caret.style.display = '';
      status.textContent = 'online';
      setStep(0);

      later(450, function () {
        setStep(1);
        var i = 0;
        var type = function () {
          if (id !== runId) return;
          i++;
          typed.textContent = full.slice(0, i);
          rest.textContent = full.slice(i);
          if (i < full.length) later(i < 7 ? 70 : 32, type);
          else later(380, function () {
            caret.style.display = 'none';
            setStep(2);
            status.textContent = 'typing…';
            later(1500, function () {
              setStep(3);
              status.textContent = 'online';
              later(600, function () {
                setStep(4);
                later(5200, function () {
                  chat.classList.add('fading');
                  later(450, play);
                });
              });
            });
          });
        };
        type();
      });
    };

    // off screen it rests on the finished conversation
    var stop = function () {
      runId++;
      timers.forEach(clearTimeout);
      timers = [];
      chat.classList.remove('playing', 'fading');
      typed.textContent = full;
      rest.textContent = '';
      caret.style.display = 'none';
      status.textContent = 'online';
    };

    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) play(); else stop();
    }, { threshold: 0.4 }).observe(chat);
  }

  // ---------- Scroll progress: the ring around back-to-top ----------
  var backToTop = document.getElementById('back-to-top');
  var ring = backToTop && backToTop.querySelector('.ring circle');
  var RING = 150.8;
  var shownP = -1, shownTop = false;
  var paintProgress = function () {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.pageYOffset / max)) : 0;
    p = Math.round(p * 1000) / 1000;
    if (p !== shownP) {
      shownP = p;
      if (ring) ring.style.strokeDashoffset = (RING * (1 - p)).toFixed(2);
    }
    if (backToTop) {
      var want = window.pageYOffset > 500;
      if (want !== shownTop) { shownTop = want; backToTop.classList.toggle('visible', want); }
    }
  };
  onScrollFrame(paintProgress);
  window.addEventListener('resize', paintProgress);
  paintProgress();

  if (backToTop) {
    var footer = document.querySelector('.site-footer');
    if (footer && hasIO) {
      new IntersectionObserver(function (entries) {
        backToTop.classList.toggle('over-footer', entries[0].isIntersecting);
      }, { rootMargin: '0px 0px -60px 0px' }).observe(footer);
    }
    // it launches like a rocket, then comes back down once you are at the top
    backToTop.addEventListener('click', function () {
      backToTop.blur();
      if (rich) {
        backToTop.classList.add('launch');
        setTimeout(function () { backToTop.classList.remove('launch'); }, 1400);
      }
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  // ---------- Projects: filters ----------
  // A pill slides to the chosen filter. Projects that leave fade out, the
  // ones that stay glide to their new places, and new ones rise in.
  var filtersEl = document.querySelector('.filters');
  if (filtersEl) {
    var filters = Array.prototype.slice.call(filtersEl.querySelectorAll('.filter'));
    var projects = Array.prototype.slice.call(document.querySelectorAll('.project'));
    var thumb = filtersEl.querySelector('.filter-thumb');
    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    var matches = function (p, kind) { return kind === 'all' || p.dataset.kind.split(' ').indexOf(kind) !== -1; };

    filters.forEach(function (btn) {
      var count = projects.filter(function (p) { return matches(p, btn.dataset.filter); }).length;
      var c = btn.querySelector('.filter-count');
      if (c) c.textContent = count;
    });

    var placeThumb = function (btn, animate) {
      if (!thumb) return;
      if (!animate) filtersEl.classList.add('no-anim');
      thumb.style.width = btn.offsetWidth + 'px';
      thumb.style.height = btn.offsetHeight + 'px';
      thumb.style.transform = 'translate(' + btn.offsetLeft + 'px,' + btn.offsetTop + 'px)';
      if (!animate) { void thumb.offsetWidth; filtersEl.classList.remove('no-anim'); }
    };
    var current = function () { return filters.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || filters[0]; };
    if (thumb) {
      placeThumb(current(), false);
      filtersEl.classList.add('has-thumb');
      window.addEventListener('resize', function () { placeThumb(current(), false); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placeThumb(current(), false); });
    }

    var filterRun = 0;
    var pendingOuts = [];
    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var kind = btn.dataset.filter;
        filters.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        placeThumb(btn, !reduceMotion);

        var run = ++filterRun;
        // a quick second click undoes any fade-out still in progress
        pendingOuts.forEach(function (a) { a.cancel(); });
        pendingOuts = [];
        var leaving = projects.filter(function (p) { return !p.hidden && !matches(p, kind); });
        var entering = projects.filter(function (p) { return p.hidden && matches(p, kind); });

        if (reduceMotion || !Element.prototype.animate) {
          projects.forEach(function (p) { p.hidden = !matches(p, kind); });
          return;
        }

        var outs = leaving.map(function (p, i) {
          return p.animate(
            rich
              ? [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (i % 2 ? 60 : -60) + 'vw) rotate(' + (i % 2 ? 14 : -14) + 'deg)' }]
              : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-12px) scale(0.98)' }],
            { duration: rich ? 420 : 220, easing: 'cubic-bezier(0.7, 0, 0.84, 0)', fill: 'forwards' }
          );
        });
        pendingOuts = outs;

        var swap = function () {
          if (run !== filterRun) return;
          var staying = projects.filter(function (p) { return !p.hidden && matches(p, kind); });
          var before = staying.map(function (p) { return p.getBoundingClientRect().top; });
          projects.forEach(function (p) { p.hidden = !matches(p, kind); });
          outs.forEach(function (a) { a.cancel(); });
          pendingOuts = [];
          staying.forEach(function (p, i) {
            var dy = before[i] - p.getBoundingClientRect().top;
            if (Math.abs(dy) > 1) {
              p.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 650, easing: EASE });
            }
          });
          entering.forEach(function (p, i) {
            p.animate(
              rich
                ? [{ opacity: 0, transform: 'translateX(' + (i % 2 ? -50 : 50) + 'vw) rotate(' + (i % 2 ? -10 : 10) + 'deg)' }, { opacity: 1, transform: 'none' }]
                : [{ opacity: 0, transform: 'translateY(32px)' }, { opacity: 1, transform: 'none' }],
              { duration: rich ? 1000 : 700, delay: 80 + i * 90, easing: rich ? 'cubic-bezier(0.34, 1.4, 0.64, 1)' : EASE, fill: 'backwards' }
            );
          });
        };

        if (outs.length) {
          var waited = false;
          var go = function () { if (!waited) { waited = true; swap(); } };
          outs[0].onfinish = go;
          setTimeout(go, rich ? 460 : 260);
        } else {
          swap();
        }
      });
    });
  }

  // ---------- Projects: media drawers ----------
  // The layout changes once, instantly; then the panel is revealed with a clip
  // and everything below it slides into place with transforms (FLIP), so the
  // phone never has to re-layout the page on every frame.
  var DRAWER_MS = 520;
  var DRAWER_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

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
      if (n.tagName !== 'SCRIPT' && !n.classList.contains('back-to-top') && !n.classList.contains('toast')) out.push(n);
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
      var anim = function (el, frames, o) { running.push(el.animate(frames, o || opts)); };

      if (open) {
        drawer.classList.add('open');
        var h = drawer.getBoundingClientRect().height;
        anim(inner, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }]);
        below.forEach(function (el) {
          anim(el, [{ transform: 'translateY(' + (-h) + 'px)' }, { transform: 'translateY(0)' }]);
        });
        // the things on the bench pop in one after another
        drawer.querySelectorAll('.media-item').forEach(function (item, i) {
          anim(item, [{ opacity: 0, transform: 'translateY(24px) scale(0.96)' }, { opacity: 1, transform: 'none' }],
            { duration: 600, delay: 120 + i * 90, easing: DRAWER_EASE, fill: 'backwards' });
        });
      } else {
        var hc = drawer.getBoundingClientRect().height;
        anim(inner, [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], { duration: 380, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' });
        below.forEach(function (el) {
          anim(el, [{ transform: 'translateY(0)' }, { transform: 'translateY(' + (-hc) + 'px)' }], { duration: 380, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' });
        });
        finishTimer = setTimeout(function () {
          drawer.classList.remove('open');
          settle();
        }, 380);
        running.forEach(function (a) { a.effect && a.effect.updateTiming({ fill: 'forwards' }); });
      }
    });
  });

  // ---------- Video player with controls that match the site ----------
  document.querySelectorAll('.player').forEach(function (player) {
    var video = player.querySelector('video');
    var big = player.querySelector('.player-big');
    var toggleBtn = player.querySelector('.player-toggle');
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

    // Loading state: a spinner while the video buffers
    var setLoading = function (on) { player.classList.toggle('loading', on); };
    video.addEventListener('waiting', function () { setLoading(true); });
    video.addEventListener('seeking', function () { if (!video.paused) setLoading(true); });
    ['playing', 'canplay', 'seeked', 'pause', 'error'].forEach(function (ev) {
      video.addEventListener(ev, function () { setLoading(false); });
    });

    video.addEventListener('play', function () {
      player.classList.add('playing');
      toggleBtn.setAttribute('aria-label', 'Pause');
      if (video.readyState < 3) setLoading(true);
    });
    video.addEventListener('pause', function () {
      player.classList.remove('playing');
      toggleBtn.setAttribute('aria-label', 'Play');
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
    toggleBtn.addEventListener('click', play);
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

    // The log next to the video: click a moment to jump to it
    var bench = player.closest('.bench');
    var marks = bench ? bench.querySelectorAll('[data-seek]') : [];
    marks.forEach(function (mark) {
      mark.addEventListener('click', function () {
        video.currentTime = parseFloat(mark.dataset.seek);
        video.play();
        var r = player.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) {
          player.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      });
    });
    if (marks.length) {
      video.addEventListener('timeupdate', function () {
        var cur = null;
        marks.forEach(function (m) { if (video.currentTime >= parseFloat(m.dataset.seek) - 0.05) cur = m; });
        marks.forEach(function (m) { m.classList.toggle('now', m === cur && video.currentTime > 0); });
      });
      video.addEventListener('ended', function () {
        marks.forEach(function (m) { m.classList.remove('now'); });
      });
    }

    paint();
  });

  // ---------- Journey: the copper trace ----------
  // A trace runs through every via with 45 degree bends, like a real PCB,
  // and fills with "current" as you scroll, with a spark riding its front.
  // The copper copy sits in a clipping box: scrolling slides the box down and
  // the trace back up by the same amount, so the fill is only ever moved by
  // the GPU and never repainted.
  var journey = document.querySelector('.journey');
  if (journey) {
    var NSJ = 'http://www.w3.org/2000/svg';
    var makeTrace = function (cls) {
      var svg = document.createElementNS(NSJ, 'svg');
      svg.setAttribute('class', 'journey-trace');
      svg.setAttribute('aria-hidden', 'true');
      var path = document.createElementNS(NSJ, 'path');
      path.setAttribute('class', cls);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('stroke-linecap', 'round');
      svg.appendChild(path);
      return { svg: svg, path: path };
    };
    var bedT = makeTrace('bed');
    var live = makeTrace('live');
    var fill = document.createElement('div');
    fill.className = 'journey-fill';
    fill.setAttribute('aria-hidden', 'true');
    fill.appendChild(live.svg);
    journey.insertBefore(fill, journey.firstChild);
    journey.insertBefore(bedT.svg, journey.firstChild);

    var spark = null;
    if (!reduceMotion) {
      spark = document.createElement('span');
      spark.className = 'journey-spark';
      spark.setAttribute('aria-hidden', 'true');
      journey.appendChild(spark);
    }
    // a fading tail of sparks behind it
    var tails = [];
    if (spark && rich) {
      for (var ti = 1; ti <= 5; ti++) {
        var tl = document.createElement('span');
        tl.className = 'journey-tail';
        tl.setAttribute('aria-hidden', 'true');
        var size = 10 - ti * 1.5;
        tl.style.width = tl.style.height = size + 'px';
        tl.style.margin = (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px';
        tl.style.setProperty('--o', (0.7 - ti * 0.12).toFixed(2));
        journey.appendChild(tl);
        tails.push(tl);
      }
    }

    var chapters = journey.querySelectorAll('.chapter');
    var points = [];
    var samples = [];
    var height = 0;
    var shownCut = -1;
    var sparkOn = false;

    var draw = function () {
      var box = journey.getBoundingClientRect();
      height = box.height;
      points = [];
      chapters.forEach(function (ch) {
        var via = ch.querySelector('.via').getBoundingClientRect();
        points.push({ x: via.left + via.width / 2 - box.left, y: via.top + via.height / 2 - box.top, el: ch, lit: ch.classList.contains('lit') });
      });
      if (!points.length) return;

      var d = 'M' + points[0].x + ' ' + points[0].y;
      for (var i = 1; i < points.length; i++) {
        var a = points[i - 1];
        var b = points[i];
        var dx = Math.abs(b.x - a.x);
        if (dx > 1) {
          d += ' L' + a.x + ' ' + (b.y - dx - 24) + ' L' + b.x + ' ' + (b.y - 24) + ' L' + b.x + ' ' + b.y;
        } else {
          d += ' L' + b.x + ' ' + b.y;
        }
      }
      bedT.path.setAttribute('d', d);
      live.path.setAttribute('d', d);

      // sample the path so the spark can find its spot at any height
      samples = [];
      if (spark && live.path.getTotalLength) {
        var len = live.path.getTotalLength();
        for (var s = 0; s <= len; s += 6) {
          var pt = live.path.getPointAtLength(s);
          samples.push(pt.x, pt.y);
        }
      }
      shownCut = -1;
      update();
    };

    var placeSpark = function (reach) {
      if (!spark || samples.length < 4) return;
      var first = samples[1];
      var lastY = samples[samples.length - 1];
      var on = reach > first + 2 && reach < lastY - 2;
      if (on !== sparkOn) {
        sparkOn = on;
        spark.classList.toggle('on', on);
        tails.forEach(function (tl) { tl.classList.toggle('on', on); });
      }
      if (!on) return;
      var lo = 0, hi = samples.length / 2 - 1;
      while (lo < hi) {
        var mid = (lo + hi) >> 1;
        if (samples[mid * 2 + 1] < reach) lo = mid + 1; else hi = mid;
      }
      spark.style.transform = 'translate3d(' + samples[lo * 2] + 'px,' + samples[lo * 2 + 1] + 'px,0)';
      tails.forEach(function (tl, k) {
        var j = Math.max(0, lo - (k + 1) * 4);
        tl.style.transform = 'translate3d(' + samples[j * 2] + 'px,' + samples[j * 2 + 1] + 'px,0)';
      });
    };

    var update = function () {
      if (!points.length) return;
      var box = journey.getBoundingClientRect();
      // the "current" reaches 60% of the way down the screen
      var reach = window.innerHeight * 0.6 - box.top;
      var cut = Math.round(height - Math.max(0, Math.min(height, reach)));
      if (cut !== shownCut) {
        shownCut = cut;
        fill.style.transform = 'translate3d(0,' + (-cut) + 'px,0)';
        live.svg.style.transform = 'translate3d(0,' + cut + 'px,0)';
        placeSpark(reach);
      }
      points.forEach(function (p) {
        var lit = reach >= p.y - 4;
        if (lit !== p.lit) { p.lit = lit; p.el.classList.toggle('lit', lit); }
      });
    };

    onScrollFrame(update);
    window.addEventListener('resize', draw);
    window.addEventListener('load', draw);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    draw();
  }
  // ---------- Home: the 3D board ----------
  // Only on devices that can take it. If WebGL or the download fails, the
  // flat hero (photo and SVG traces) comes back.
  var stage = document.querySelector('.hero-stage');
  if (stage && rich) {
    var canGL = (function () {
      try {
        var c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
      } catch (e) { return false; }
    })();
    if (canGL) {
      root.classList.add('has-3d');
      var fallback = function () {
        root.classList.remove('has-3d');
        window.dispatchEvent(new Event('resize'));
      };
      import('./hero3d.js?v=32').then(function (m) {
        // the parts start dropping as the curtain lifts
        whenBooted(function () { m.start(stage, {
          mobile: !finePointer,
          onReady: function () { stage.classList.add('ready'); },
          onPlay: function () { stage.classList.add('played'); }
        }); });
      }).catch(fallback);
    }
  }

  // ---------- Our own cursor: a dot that sits exactly on the mouse and a
  // copper ring that trails it. It is built the first time a real mouse (or
  // touchpad) moves over the page, whatever the device says about itself,
  // and the normal pointer is hidden while it shows. Touch never builds it.
  // The normal pointer comes back in fullscreen video, when the mouse leaves
  // the page, and as soon as you touch the screen instead. ----
  var ringEl = null, dotEl = null;
  var mx = -100, my = -100, rx = -100, ry = -100, ringRaf = 0;
  var ringLoop = function () {
    // with reduced motion the ring snaps to the mouse instead of trailing
    var k = reduceMotion ? 1 : 0.22;
    rx += (mx - rx) * k;
    ry += (my - ry) * k;
    ringEl.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
    ringRaf = (Math.abs(mx - rx) + Math.abs(my - ry) > 0.3) ? requestAnimationFrame(ringLoop) : 0;
  };
  var showCursor = function (on) {
    if (!ringEl) return;
    ringEl.classList.toggle('on', on);
    dotEl.classList.toggle('on', on);
    root.classList.toggle('own-cursor', on && !document.fullscreenElement);
  };
  var buildCursor = function () {
    ringEl = document.createElement('div');
    ringEl.className = 'cursor-ring';
    ringEl.setAttribute('aria-hidden', 'true');
    ringEl.innerHTML = '<span>click</span>';
    dotEl = document.createElement('div');
    dotEl.className = 'cursor-dot';
    dotEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ringEl);
    document.body.appendChild(dotEl);
    document.documentElement.addEventListener('mouseleave', function () { showCursor(false); });
    document.addEventListener('fullscreenchange', function () {
      root.classList.toggle('own-cursor', !document.fullscreenElement && ringEl.classList.contains('on'));
    });
    window.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') { showCursor(false); return; }
      ringEl.classList.add('down'); dotEl.classList.add('down');
    });
    window.addEventListener('pointerup', function () { ringEl.classList.remove('down'); dotEl.classList.remove('down'); });
  };
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') { showCursor(false); return; }
    if (!ringEl) buildCursor();
    mx = e.clientX; my = e.clientY;
    dotEl.style.translate = mx + 'px ' + my + 'px';
    if (!ringEl.classList.contains('on')) { rx = mx; ry = my; showCursor(true); }
    var overPart = !!(stage && stage.classList.contains('over-part') && e.target.classList && e.target.classList.contains('stage-canvas'));
    var overLink = !overPart && !!(e.target.closest && e.target.closest('a, button, [data-seek], .c, input'));
    ringEl.classList.toggle('part', overPart);
    ringEl.classList.toggle('link', overLink);
    dotEl.classList.toggle('link', overLink || overPart);
    if (!ringRaf) ringRaf = requestAnimationFrame(ringLoop);
  }, { passive: true });

  // ---------- Copper sparks wherever you click ----------
  if (rich && Element.prototype.animate) {
    var liveSparks = 0;
    window.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || liveSparks > 60) return;
      var count = 12;
      for (var i = 0; i < count; i++) {
        var sp = document.createElement('span');
        sp.className = 'spark' + (i % 3 === 0 ? ' dot' : '');
        sp.setAttribute('aria-hidden', 'true');
        sp.style.left = e.clientX + 'px';
        sp.style.top = e.clientY + 'px';
        document.body.appendChild(sp);
        liveSparks++;
        var angle = (i / count) * 360 + Math.random() * 20;
        var dist = 36 + Math.random() * 60;
        var a = sp.animate([
          { transform: 'rotate(' + angle + 'deg) translateY(-6px) scaleY(1.4)', opacity: 1 },
          { transform: 'rotate(' + angle + 'deg) translateY(' + (-dist) + 'px) scaleY(0.2)', opacity: 0 }
        ], { duration: 450 + Math.random() * 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
        a.onfinish = (function (el) { return function () { el.remove(); liveSparks--; }; })(sp);
      }
    });
  }

  // ---------- Headlines lean with the speed of the scroll; the marquee races ----------
  if (rich) {
    var skewEls = Array.prototype.slice.call(document.querySelectorAll('.page-intro h1, .section-title, .project h2, .chapter h2, .footer-big, .marquee'));
    skewEls.forEach(function (el) { el.classList.add('skewy'); });

    var rows = Array.prototype.slice.call(document.querySelectorAll('.marquee-row')).map(function (row, i) {
      // repeat the words until the row is wider than two screens
      var unit = row.innerHTML;
      var seg = row.scrollWidth || 1;
      var guard = 0;
      while (row.scrollWidth < window.innerWidth * 2 + seg && guard++ < 12) row.insertAdjacentHTML('beforeend', unit);
      return { el: row, seg: seg, x: i ? -seg / 2 : 0, dir: i ? -1 : 1 };
    });
    var marquee = document.querySelector('.marquee');
    var marqueeOn = false;
    if (marquee && hasIO) {
      new IntersectionObserver(function (entries) {
        marqueeOn = entries[0].isIntersecting;
        if (marqueeOn) kick();
      }).observe(marquee);
    }

    var lastY = window.pageYOffset, vel = 0, shownSkew = 0, motionRaf = 0, lastT = 0, travel = 1;
    var motion = function (now) {
      var dt = lastT ? Math.min(50, now - lastT) / 16.67 : 1;
      lastT = now;
      var y = window.pageYOffset;
      var dy = y - lastY;
      lastY = y;
      vel += (dy - vel) * 0.18;
      if (Math.abs(vel) > 0.6) travel = vel > 0 ? 1 : -1;

      var skew = Math.max(-7, Math.min(7, vel * -0.25));
      if (Math.abs(skew - shownSkew) > 0.02) {
        shownSkew = skew;
        skewEls.forEach(function (el) { el.style.setProperty('--skew', skew.toFixed(2) + 'deg'); });
      }

      if (marqueeOn) {
        var speed = (1.1 + Math.min(30, Math.abs(vel)) * 0.9) * dt;
        rows.forEach(function (r) {
          r.x -= speed * r.dir * travel;
          if (r.x <= -r.seg) r.x += r.seg;
          if (r.x > 0) r.x -= r.seg;
          r.el.style.transform = 'translate3d(' + r.x.toFixed(1) + 'px,0,0)';
        });
      }

      var settled = Math.abs(vel) < 0.05 && Math.abs(shownSkew) < 0.03;
      if (settled && shownSkew !== 0) {
        shownSkew = 0;
        skewEls.forEach(function (el) { el.style.setProperty('--skew', '0deg'); });
      }
      motionRaf = (marqueeOn || !settled) ? requestAnimationFrame(motion) : 0;
      if (!motionRaf) lastT = 0;
    };
    var kick = function () { if (!motionRaf) motionRaf = requestAnimationFrame(motion); };
    window.addEventListener('scroll', kick, { passive: true });
  }
})();
