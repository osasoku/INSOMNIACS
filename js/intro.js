/* ============================================================
   IntroSequence — 03:17
   Deliberately short: a signal, not a loading screen.
   land → 03:17 appears → brief hold → environment begins moving
   → dissolves into the site underneath. Total runtime ~1.6s.
============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var TIMING = reduceMotion
    ? { appear: 1, hold: 250, fade: 1 }
    : { appear: 260, hold: 620, fade: 780 };

  function run(onComplete) {
    var body = document.body;
    var intro = document.getElementById("intro");
    if (!intro) { onComplete && onComplete(); return; }

    // Let the black frame paint first, then bring the signal in.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        body.setAttribute("data-intro", "signal");
      });
    });

    setTimeout(function () {
      // environment begins moving / site reveals behind the signal
      body.setAttribute("data-intro", "out");
      onComplete && onComplete();
    }, TIMING.appear + TIMING.hold);

    setTimeout(function () {
      intro.setAttribute("aria-hidden", "true");
      intro.style.display = "none";
    }, TIMING.appear + TIMING.hold + TIMING.fade);
  }

  window.IntroSequence = { run: run };
})();
