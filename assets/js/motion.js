/* Velos — motion.js
   Premium agency-showcase animation layer.
   Depends on: window.gsap, window.ScrollTrigger, window.ScrollToPlugin, window.Flip
   Safe no-op when GSAP is unavailable. */
(function () {
  'use strict';

  var g = window.gsap;
  if (!g) {
    document.documentElement.classList.add('no-motion');
    return;
  }

  var ST = window.ScrollTrigger;
  var Flip = window.Flip;
  if (ST) g.registerPlugin(ST);
  if (window.ScrollToPlugin) g.registerPlugin(window.ScrollToPlugin);
  if (Flip) g.registerPlugin(Flip);

  var html = document.documentElement;
  var REDUCED = html.classList.contains('no-motion');
  var SUPPORTS_HOVER = window.matchMedia('(hover:hover)').matches;

  g.ticker.lagSmoothing(500, 33);

  /* ---------- 1. Headline split (no SplitText) ---------- */
  function splitWords(el) {
    if (!el || el.dataset.split === '1') return;
    var text = el.textContent;
    el.textContent = '';
    text.split(/(\s+)/).forEach(function (tok) {
      if (!tok) return;
      if (/^\s+$/.test(tok)) { el.appendChild(document.createTextNode(tok)); return; }
      var mask = document.createElement('span'); mask.className = 'word-mask';
      var inner = document.createElement('span'); inner.className = 'word-inner';
      inner.textContent = tok;
      mask.appendChild(inner); el.appendChild(mask);
    });
    el.dataset.split = '1';
  }

  function resplitHeroHeadline() {
    document.querySelectorAll('[data-hero-headline]').forEach(function (el) {
      el.dataset.split = '';
      splitWords(el);
    });
  }

  /* ---------- 2. Splash → nav-logo FLIP handoff ---------- */
  var SPLASH_HOLD = 1.2;

  function splashHandoff() {
    var splash = document.getElementById('splash');
    if (!splash) { startHero(); return; }
    var splashImg = splash.querySelector('img');
    var navImg = document.querySelector('nav .nav-logo-icon');

    html.classList.add('motion-ready');

    if (REDUCED || !Flip || !splashImg || !navImg) {
      g.to(splash, { autoAlpha: 0, duration: 0.5, delay: REDUCED ? 0 : SPLASH_HOLD,
        onComplete: function () { splash.remove(); }});
      startHero();
      return;
    }

    g.set(splashImg, { willChange: 'transform' });

    g.delayedCall(SPLASH_HOLD, function () {
      startHero();

      try {
        g.set(splash, { background: 'transparent', pointerEvents: 'none' });

        var state = Flip.getState(splashImg);
        var navRect = navImg.getBoundingClientRect();
        splashImg.style.position = 'fixed';
        splashImg.style.top    = navRect.top    + 'px';
        splashImg.style.left   = navRect.left   + 'px';
        splashImg.style.width  = navRect.width  + 'px';
        splashImg.style.height = navRect.height + 'px';

        navImg.style.visibility = 'hidden';

        Flip.from(state, {
          duration: 0.85,
          ease: 'power3.inOut',
          absolute: true,
          onComplete: function () {
            navImg.style.visibility = 'visible';
            splash.remove();
          }
        });
      } catch (e) {
        g.to(splash, { autoAlpha: 0, duration: 0.5,
          onComplete: function () { splash.remove(); }});
      }
    });
  }

  /* ---------- 3. Hero choreography ---------- */
  function startHero() {
    var hero = document.getElementById('hero');
    if (!hero) return;

    var eyebrow   = hero.querySelector('[data-anim-hero="eyebrow"]');
    var headline  = hero.querySelectorAll('[data-hero-headline]');
    var tagline   = hero.querySelector('[data-anim-hero="tagline"]');
    var ctas      = hero.querySelectorAll('[data-anim-hero="cta"]');
    var stats     = hero.querySelectorAll('[data-counter]');
    var statRows  = hero.querySelectorAll('[data-anim-hero="stat"]');
    var badge     = hero.querySelector('[data-anim-hero="badge"]');
    var visual    = hero.querySelector('[data-anim-hero="visual"]');
    var chevron   = hero.querySelector('[data-anim-hero="chevron"]');

    resplitHeroHeadline();

    if (REDUCED) {
      [eyebrow, tagline, badge, visual, chevron].forEach(function (el) {
        if (el) g.set(el, { opacity: 1, clearProps: 'transform' });
      });
      ctas.forEach(function (el) { g.set(el, { opacity: 1, clearProps: 'transform' }); });
      statRows.forEach(function (el) { g.set(el, { opacity: 1 }); });
      document.querySelectorAll('.word-inner').forEach(function (el) {
        g.set(el, { yPercent: 0 });
      });
      return;
    }

    if (eyebrow)  g.set(eyebrow,  { opacity: 0, y: 12 });
    if (tagline)  g.set(tagline,  { opacity: 0, y: 16 });
    if (badge)    g.set(badge,    { opacity: 0, scale: 0.9 });
    if (visual)   g.set(visual,   { opacity: 0, scale: 0.94 });
    if (chevron)  g.set(chevron,  { opacity: 0, y: -10 });
    ctas.forEach(function (el) { g.set(el, { opacity: 0, y: 14 }); });
    statRows.forEach(function (el) { g.set(el, { opacity: 0, y: 12 }); });

    var tl = g.timeline({ defaults: { ease: 'power3.out' } });

    if (eyebrow) tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.5 }, 0);

    var words = document.querySelectorAll('.word-inner');
    if (words.length) {
      tl.from(words, {
        yPercent: 110, opacity: 0,
        duration: 0.75, ease: 'expo.out', stagger: 0.06,
        immediateRender: true
      }, 0.15);
    }

    if (tagline) tl.to(tagline, { opacity: 1, y: 0, duration: 0.6 }, 0.55);

    if (statRows.length) {
      tl.to(statRows, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, 0.7);
    }
    if (stats.length) {
      stats.forEach(function (el) {
        var raw = (el.textContent || '').trim();
        var m = raw.match(/^(\D*)([\d.,\s]+)(.*)$/);
        if (!m) return;
        var prefix = m[1] || '';
        var target = parseFloat(m[2].replace(/[,\s]/g, '.').replace(/\.(?=.*\.)/g, ''));
        var suffix = (m[3] || '') + (el.dataset.counterSuffix || '');
        if (!isFinite(target)) return;
        var obj = { n: 0 };
        tl.to(obj, {
          n: target, duration: 1.0, ease: 'power2.out',
          onUpdate: function () {
            el.textContent = prefix + Math.round(obj.n) + suffix;
          },
          onComplete: function () { el.textContent = raw; }
        }, 0.75);
      });
    }

    if (ctas.length) tl.to(ctas, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, 0.9);
    if (visual)  tl.to(visual,  { opacity: 1, scale: 1, duration: 0.7 }, 1.0);
    if (badge)   tl.to(badge,   { opacity: 1, scale: 1, duration: 0.5 }, 1.15);

    if (chevron) {
      tl.to(chevron, { opacity: 0.6, y: 0, duration: 0.4 }, 1.3);
      chevron.classList.remove('animate-bounce');
      g.to(chevron, {
        y: 6, duration: 0.8, ease: 'sine.inOut',
        yoyo: true, repeat: -1
      });
    }
  }

  /* ---------- 4. Section reveal pattern ---------- */
  function preStateFor(kind) {
    switch (kind) {
      case 'fade':         return { opacity: 0 };
      case 'scale-in':     return { opacity: 0, scale: 0.94 };
      case 'reveal-left':  return { opacity: 0, x: -40 };
      case 'reveal-right': return { opacity: 0, x: 40 };
      case 'fade-up':
      default:             return { opacity: 0, y: 32 };
    }
  }

  function postStateFor(kind) {
    switch (kind) {
      case 'fade':         return { opacity: 1 };
      case 'scale-in':     return { opacity: 1, scale: 1 };
      case 'reveal-left':
      case 'reveal-right': return { opacity: 1, x: 0 };
      case 'fade-up':
      default:             return { opacity: 1, y: 0 };
    }
  }

  // Set reveal pre-states synchronously (cheap, no layout read) so nothing
  // flashes before the ScrollTriggers are wired on window load. In reduced
  // mode, jump straight to the post-state (everything visible).
  function setRevealPreStates() {
    var roots = Array.prototype.slice.call(document.querySelectorAll('[data-anim]'));
    roots.forEach(function (el) {
      var kind = el.getAttribute('data-anim') || 'fade-up';
      if (el.hasAttribute('data-anim-stagger')) {
        el.querySelectorAll('[data-anim-child]').forEach(function (c) {
          g.set(c, preStateFor(kind));
        });
      } else {
        g.set(el, preStateFor(kind));
      }
    });
    if (REDUCED) {
      roots.forEach(function (el) {
        var kind = el.getAttribute('data-anim') || 'fade-up';
        if (el.hasAttribute('data-anim-stagger')) {
          el.querySelectorAll('[data-anim-child]').forEach(function (c) {
            g.set(c, postStateFor(kind));
          });
        } else {
          g.set(el, postStateFor(kind));
        }
      });
    }
  }

  // ScrollTrigger wiring — deferred to window load (forced reflow off the
  // critical path). Pre-states are already set by setRevealPreStates().
  function bindReveals() {
    if (!ST || REDUCED) return;
    var roots = Array.prototype.slice.call(document.querySelectorAll('[data-anim]'));
    roots.forEach(function (el) {
      var kind = el.getAttribute('data-anim') || 'fade-up';
      var stagger = parseFloat(el.getAttribute('data-anim-stagger')) || 0;
      var delay = parseFloat(el.getAttribute('data-anim-delay')) || 0;
      var once = el.getAttribute('data-anim-once') !== 'false';

      ST.create({
        trigger: el,
        start: 'top 85%',
        once: once,
        onEnter: function () {
          if (stagger) {
            var kids = el.querySelectorAll('[data-anim-child]');
            if (kids.length) {
              g.to(kids, Object.assign(postStateFor(kind), {
                duration: 0.7, ease: 'power3.out',
                stagger: stagger, delay: delay,
                clearProps: 'willChange'
              }));
              return;
            }
          }
          g.to(el, Object.assign(postStateFor(kind), {
            duration: 0.7, ease: 'power3.out', delay: delay,
            clearProps: 'willChange'
          }));
        }
      });
    });
  }

  /* ---------- 5. Card micro-interactions ---------- */
  function bindCardTilt(card) {
    if (!SUPPORTS_HOVER) return;
    var rotX = g.quickTo(card, 'rotationX', { duration: 0.4, ease: 'power3.out' });
    var rotY = g.quickTo(card, 'rotationY', { duration: 0.4, ease: 'power3.out' });
    var transY = g.quickTo(card, 'y', { duration: 0.4, ease: 'power3.out' });

    card.style.transformStyle = 'preserve-3d';
    card.style.transformPerspective = '1000px';

    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var cx = (e.clientX - r.left) / r.width;
      var cy = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', (cx * 100).toFixed(2));
      card.style.setProperty('--my', (cy * 100).toFixed(2));
      rotY((cx - 0.5) * 8);
      rotX(-(cy - 0.5) * 6);
      transY(-2);
    });
    card.addEventListener('pointerleave', function () {
      card.style.setProperty('--mx', '50');
      card.style.setProperty('--my', '50');
      rotX(0); rotY(0); transY(0);
    });
  }

  function bindCardSpotlight(card) {
    if (!SUPPORTS_HOVER) return;
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(2));
      card.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(2));
    });
  }

  function bindMagnetic(el, strength) {
    if (!SUPPORTS_HOVER) return;
    var s = strength || 0.25;
    var tx = g.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
    var ty = g.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      tx((e.clientX - cx) * s);
      ty((e.clientY - cy) * s);
    });
    el.addEventListener('pointerleave', function () { tx(0); ty(0); });
  }

  function bindCards() {
    if (REDUCED) return;
    document.querySelectorAll('[data-tilt]').forEach(bindCardTilt);
    document.querySelectorAll('[data-spotlight]').forEach(function (el) {
      if (!el.hasAttribute('data-tilt')) bindCardSpotlight(el);
    });
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      bindMagnetic(el, parseFloat(el.getAttribute('data-magnetic')) || 0.25);
    });
  }


  function bindRecommendedBadge() {
    if (REDUCED) return;
    document.querySelectorAll('[data-pricing-recommended]').forEach(function (tier) {
      var badge = tier.querySelector('[data-pricing-badge]') || tier.firstElementChild;
      if (badge) {
        g.fromTo(badge, { scale: 0, rotate: -8, opacity: 0 },
          { scale: 1, rotate: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.7)',
            scrollTrigger: ST ? { trigger: tier, start: 'top 80%', once: true } : undefined });
        g.to(badge, {
          y: -4, duration: 2.2, ease: 'sine.inOut',
          yoyo: true, repeat: -1, delay: 0.7
        });
      }
      g.to(tier, {
        boxShadow: '0 0 24px rgba(195,244,0,0.28)',
        duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1
      });
    });
  }

  /* ---------- 7. Simulator polish ---------- */
  function wrapSimulator() {
    if (REDUCED) return;
    if (typeof window.showSimStep !== 'function') return;

    var orig = window.showSimStep;
    window.showSimStep = function (n, opts) {
      var current = document.querySelector('.sim-step.active');
      if (current && current !== document.getElementById('step-' + n)) {
        g.to(current, {
          opacity: 0, y: -8, duration: 0.18, ease: 'power2.in',
          onComplete: function () {
            orig(n, opts);
            var next = document.getElementById('step-' + n);
            if (next) {
              g.set(next, { opacity: 0, y: 12 });
              g.to(next, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' });
              if (n === 4) {
                var rows = next.querySelectorAll('[data-anim-recap]');
                if (rows.length) {
                  g.from(rows, { opacity: 0, y: 10, duration: 0.4,
                    stagger: 0.07, ease: 'power3.out', delay: 0.1 });
                }
              }
            }
          }
        });
      } else {
        orig(n, opts);
      }
    };

    if (typeof window.updateSimProgress === 'function') {
      var origProg = window.updateSimProgress;
      window.updateSimProgress = function () {
        var label = document.getElementById('sim-progress-label');
        var bar = document.getElementById('sim-progress-bar');
        // Animate the composited transform (scaleX) instead of width.
        var prevScale = bar ? (g.getProperty(bar, 'scaleX') || 0) : 0;
        origProg();
        if (bar) {
          var match = /scaleX\(([\d.]+)\)/.exec(bar.style.transform);
          var target = match ? parseFloat(match[1]) : 1;
          g.fromTo(bar, { scaleX: prevScale }, { scaleX: target, duration: 0.55, ease: 'power2.out' });
        }
        if (label) {
          g.fromTo(label, { scale: 1.2, color: '#c3f400' },
            { scale: 1, color: '', duration: 0.35, ease: 'power3.out' });
        }
      };
    }
  }

  /* ---------- 8. Nav scroll behavior ---------- */
  function bindNav() {
    if (!ST) return;
    var nav = document.querySelector('nav');
    if (!nav) return;

    var lastY = window.scrollY;
    var hidden = false;
    var hideTween = g.quickTo(nav, 'yPercent', { duration: 0.3, ease: 'power3.out' });

    ST.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var y = window.scrollY;
        var dy = y - lastY;
        lastY = y;
        if (y < 200) { if (hidden) { hideTween(0); hidden = false; } return; }
        if (dy > 4 && !hidden)  { hideTween(-100); hidden = true; }
        else if (dy < -4 && hidden) { hideTween(0); hidden = false; }
      }
    });

    var hero = document.getElementById('hero');
    if (hero) {
      ST.create({
        trigger: hero,
        start: 'top top', end: 'bottom top',
        onUpdate: function (self) {
          var p = self.progress;
          nav.style.backgroundColor = 'rgba(28,27,27,' + (0.55 + 0.4 * p).toFixed(3) + ')';
          nav.style.backdropFilter = 'blur(' + (12 + 12 * p) + 'px)';
          nav.style.webkitBackdropFilter = 'blur(' + (12 + 12 * p) + 'px)';
        }
      });
    }

    // Active link tracker
    var navLinks = nav.querySelectorAll('a.nav-link[href^="#"]');
    navLinks.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = id ? document.getElementById(id) : null;
      if (!section) return;
      ST.create({
        trigger: section,
        start: 'top center', end: 'bottom center',
        onToggle: function (self) {
          if (self.isActive) {
            navLinks.forEach(function (l) { l.classList.remove('nav-link-active'); });
            link.classList.add('nav-link-active');
          }
        }
      });
    });
  }

  /* ---------- 9. Smooth in-page anchor scroll ---------- */
  function bindSmoothScroll() {
    if (REDUCED || !window.ScrollToPlugin) return;
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      a.addEventListener('click', function (e) {
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        g.to(window, {
          duration: 0.9, ease: 'power3.inOut',
          scrollTo: { y: target, offsetY: 80 }
        });
      });
    });
  }

  /* ---------- 11. Init ---------- */
  function init() {
    splashHandoff();          // hero choreography — must stay off the load gate (LCP)
    setRevealPreStates();     // immediate, prevents flash
    bindCards();
    bindSmoothScroll();

    // Defer ScrollTrigger creation (the ~56ms forced reflow) until after load,
    // keeping it off the critical render path.
    var wireScrollTriggers = function () {
      bindReveals();
      bindRecommendedBadge();
      bindNav();
      if (ST) ST.refresh();
    };
    if (document.readyState === 'complete') {
      wireScrollTriggers();
    } else {
      window.addEventListener('load', wireScrollTriggers, { once: true });
    }

    // Wrap simulator once its globals exist.
    if (typeof window.showSimStep === 'function') {
      wrapSimulator();
    } else {
      var poll = setInterval(function () {
        if (typeof window.showSimStep === 'function') {
          clearInterval(poll);
          wrapSimulator();
        }
      }, 50);
      setTimeout(function () { clearInterval(poll); }, 4000);
    }

    // Re-init bits after language switch (textContent changes wipe split spans).
    window.addEventListener('velos:i18n-ready', function () {
      resplitHeroHeadline();
      if (ST) ST.refresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
