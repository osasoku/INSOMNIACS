/* ============================================================
   AnimatedGrainBackground
   Procedural canvas noise, tiled and redrawn on an offset drift.
   Keeps the black background feeling physically alive without
   the cost of a full-resolution video texture.
============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("grain-canvas");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d", { alpha: true });
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Small offscreen noise tile — generated once per "grain frame",
  // then stamped across the viewport as a repeating pattern that
  // drifts, so the CPU cost stays tiny regardless of screen size.
  var TILE = 180;
  var tileCanvas = document.createElement("canvas");
  tileCanvas.width = TILE;
  tileCanvas.height = TILE;
  var tileCtx = tileCanvas.getContext("2d");
  var imageData = tileCtx.createImageData(TILE, TILE);

  function paintNoiseTile() {
    var data = imageData.data;
    for (var i = 0; i < data.length; i += 4) {
      var v = (Math.random() * 255) | 0;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
    tileCtx.putImageData(imageData, 0, 0);
  }

  var pattern = null;
  function refreshPattern() {
    paintNoiseTile();
    pattern = ctx.createPattern(tileCanvas, "repeat");
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5); // cap for perf
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
  }

  var driftX = 0, driftY = 0;
  var lastNoiseUpdate = 0;
  var lastFrameTime = 0;

  // Grain frame rate: deliberately not 60fps — real film grain
  // "flickers" at a lower, irregular cadence. This also halves
  // the redraw cost on low-power devices.
  var NOISE_FPS = reduceMotion ? 6 : 14;
  var NOISE_INTERVAL = 1000 / NOISE_FPS;

  function tick(t) {
    requestAnimationFrame(tick);

    if (t - lastFrameTime < NOISE_INTERVAL) return;
    lastFrameTime = t;

    if (!pattern || t - lastNoiseUpdate > NOISE_INTERVAL) {
      refreshPattern();
      lastNoiseUpdate = t;
      // organic, irregular drift — never a clean repeating loop
      driftX = (driftX + (Math.random() * 6 - 3)) % TILE;
      driftY = (driftY + (Math.random() * 6 - 3)) % TILE;
    }

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(driftX, driftY);
    ctx.fillStyle = pattern;
    ctx.fillRect(-driftX, -driftY, canvas.width + TILE, canvas.height + TILE);
    ctx.restore();
  }

  resize();
  refreshPattern();
  window.addEventListener("resize", resize, { passive: true });

  // Pause entirely off-screen tabs to save battery/CPU.
  var running = true;
  document.addEventListener("visibilitychange", function () {
    running = !document.hidden;
    if (running) requestAnimationFrame(tick);
  });

  requestAnimationFrame(tick);
})();
