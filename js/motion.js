/* Bhuiyan Academy preview: motion (GSAP 3 + ScrollTrigger).
   - [data-reveal] .reveal-child stagger in on load (in view) or once on scroll (below the fold)
   - The Pathway (#pathway): pinned on desktop, line scrubbed, milestones fade in at data-at
   - Portal pages (body.portal): entrance only, no ScrollTrigger
   Reduced motion: nothing here runs, content is visible and static. */
(function () {
  'use strict';

  var root = document.documentElement;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.remove('has-motion');
    return;
  }

  function init() {
    var portal = document.body.classList.contains('portal');

    // CDN blocked or slow: fall back to static, visible content.
    if (!window.gsap || (!portal && !window.ScrollTrigger)) {
      root.classList.remove('has-motion');
      return;
    }
    var gsap = window.gsap;
    var hasST = !!window.ScrollTrigger;
    if (hasST) { gsap.registerPlugin(window.ScrollTrigger); }

    var toArray = function (list) { return Array.prototype.slice.call(list); };

    // 1 · Reveals -----------------------------------------------------------
    toArray(document.querySelectorAll('[data-reveal]')).forEach(function (el) {
      var kids = toArray(el.querySelectorAll('.reveal-child'));
      if (!kids.length && el.id === 'pathway') { return; } // pinned: never transform the section itself
      var targets = kids.length ? kids : [el];
      var played = false;

      gsap.set(targets, { y: 24, opacity: 0 });

      function play(delay) {
        if (played) { return; }
        played = true;
        gsap.to(targets, {
          y: 0, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.08,
          delay: delay || 0, clearProps: 'transform', overwrite: 'auto'
        });
      }

      var inView = el.getBoundingClientRect().top < window.innerHeight * 0.82;
      if (portal || inView || !hasST) {
        play(0.05);
        return;
      }
      window.ScrollTrigger.create({
        trigger: el,
        start: 'top 82%',
        once: true,
        onEnter: function () { play(0); },
        onRefresh: function (self) { if (self.progress > 0) { play(0); } }
      });
    });

    // 2 · The Pathway ---------------------------------------------------------
    var pathway = document.getElementById('pathway');
    if (pathway && hasST && !portal) {
      var line = pathway.querySelector('.pathway__line');
      var items = toArray(pathway.querySelectorAll('.pathway__milestone'));
      var mm = gsap.matchMedia();

      var setMilestones = function (self) {
        var p = self.progress;
        items.forEach(function (li, i) {
          var at = parseFloat(li.getAttribute('data-at'));
          if (isNaN(at)) { at = i / items.length; }
          li.classList.toggle('is-on', p >= at);
        });
      };

      mm.add('(min-width: 900px)', function () {
        var tween = line
          ? gsap.fromTo(line, { scaleX: 0, svgOrigin: '0 12' }, { scaleX: 1, svgOrigin: '0 12', ease: 'none' })
          : null;
        window.ScrollTrigger.create({
          trigger: pathway,
          start: 'top top',
          end: function () { return '+=' + Math.round(window.innerHeight * 1.6); },
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          animation: tween || undefined,
          onUpdate: setMilestones,
          onRefresh: setMilestones
        });
        return function () {
          items.forEach(function (li) { li.classList.remove('is-on'); });
        };
      });

      mm.add('(max-width: 899px)', function () {
        items.forEach(function (li) {
          window.ScrollTrigger.create({
            trigger: li,
            start: 'top 88%',
            once: true,
            onEnter: function () { li.classList.add('is-on'); },
            onRefresh: function (self) { if (self.progress > 0) { li.classList.add('is-on'); } }
          });
        });
        return function () {
          items.forEach(function (li) { li.classList.remove('is-on'); });
        };
      });
    }

    // 3 · Final pass ------------------------------------------------------------
    if (hasST) {
      window.ScrollTrigger.sort();
      window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
