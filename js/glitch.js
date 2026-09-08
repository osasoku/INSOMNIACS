/* ============================================================
   Signal glitch controller
   Drives short, irregular "burst" moments on the final-signal
   panel: RGB channel separation + slight displacement. Reads as
   a deliberate transmission artifact, not a broken page — bursts
   are brief, spaced out, and the text stays legible throughout.
============================================================ */
(function () {
  "use strict";

  var panel = document.getElementById("final-signal");
  if (!panel) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var timer = null;
  var active = false;

  function burstOnce() {
    if (!active) return;
    panel.setAttribute("data-burst", "true");
    var burstLength = reduceMotion ? 90 : 120 + Math.random() * 140;
    setTimeout(function () {
      panel.removeAttribute("data-burst");
    }, burstLength);
    scheduleNext();
  }

  function scheduleNext() {
    if (!active) return;
    // irregular spacing between bursts, ~2.4s–5.2s
    var wait = reduceMotion ? 6000 + Math.random() * 3000 : 2400 + Math.random() * 2800;
    timer = setTimeout(burstOnce, wait);
  }

  function start() {
    if (active) return;
    active = true;
    scheduleNext();
  }

  function stop() {
    active = false;
    if (timer) clearTimeout(timer);
    panel.removeAttribute("data-burst");
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (!panel.hidden) start();
  });

  window.SignalGlitch = { start: start, stop: stop };
})();
