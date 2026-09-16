/* ============================================================
   THE INSOMNIACS — app.js
   Everything editable about content, links and backend wiring
   lives in CONFIG below. Adjust freely.
============================================================ */
(function () {
  "use strict";

  /* ------------------------------------------------------------
     CONFIG — edit me
  ------------------------------------------------------------ */
  var CONFIG = {
    // Social / contact — real accounts.
    instagramUrl: "https://www.instagram.com/insomniacs.ng?stkn=MmpudnVmbHlwNnF1",
    contactEmail: "helloinsomniacs@gmail.com",

    // WAITLIST STORAGE — Google Sheet (via Apps Script Web App).
    // Deploy the paired Apps Script as a Web App (see README) and
    // paste the resulting URL here — it ends in /exec. Every
    // submission is then appended as a row to that Sheet in Drive,
    // automatically, the instant someone submits. Leave null to run
    // in local-only mode (nothing saved anywhere yet).
    driveEndpoint: "https://script.google.com/macros/s/AKfycbwnYYSeAcTJhN7eJIx6y4jigp91G4OdrTdo0B1f0r2XyjNGz7qPapWMWUc8WacXUlHN/exec",

    // How long the "YOU'RE IN / THEY'RE AWAKE" confirmation holds
    // before the site transitions into the final signal state.
    confirmHoldMs: 3400,

    // localStorage key. Bump the version suffix if the stored
    // shape ever changes.
    storageKey: "insomniacs_waitlist_v1"
  };

  /* ------------------------------------------------------------
     Persistence layer
     Device-local only — this intentionally does not claim to be
     a cross-device identity system. Once a real backend exists,
     the join state returned by it (e.g. a signed token) should
     replace/augment this local flag.
  ------------------------------------------------------------ */
  var Store = {
    read: function () {
      try {
        var raw = window.localStorage.getItem(CONFIG.storageKey);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    write: function (data) {
      try {
        window.localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
      } catch (e) { /* storage unavailable — degrade silently */ }
    }
  };

  /* ------------------------------------------------------------
     Waitlist storage layer
     Posts straight to the Google Sheet via the Apps Script Web
     App URL in CONFIG.driveEndpoint — no visitor action needed,
     no popup, nothing to hit send on. Uses mode: "no-cors" because
     Apps Script doesn't return CORS headers for POST; that means
     the response is opaque (we can't read success/failure back),
     but the request itself reaches the Sheet reliably. Falls back
     to a local-only simulation if no endpoint is set yet.
  ------------------------------------------------------------ */
  function submitToWaitlist(payload) {
    if (!CONFIG.driveEndpoint) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve({ ok: true, local: true });
        }, 650 + Math.random() * 450);
      });
    }

    var body = new URLSearchParams();
    body.append("firstName", payload.firstName);
    body.append("email", payload.email);
    body.append("phone", payload.phone || "");

    return fetch(CONFIG.driveEndpoint, {
      method: "POST",
      mode: "no-cors",
      body: body
    }).then(function () {
      return { ok: true };
    });
  }

  /* ------------------------------------------------------------
     Wire static links from config
  ------------------------------------------------------------ */
  function wireLinks() {
    var ig1 = document.getElementById("follow-signal");
    var ig2 = document.getElementById("footer-instagram");
    var contact = document.getElementById("footer-contact");
    if (ig1) ig1.href = CONFIG.instagramUrl;
    if (ig2) ig2.href = CONFIG.instagramUrl;
    if (contact) contact.href = "mailto:" + CONFIG.contactEmail;
  }

  /* ------------------------------------------------------------
     Navigation: toggle + recede-on-scroll
  ------------------------------------------------------------ */
  function initNav() {
    var toggle = document.getElementById("nav-toggle");
    var menu = document.getElementById("nav-menu");
    var nav = document.getElementById("site-nav");
    if (!toggle || !menu || !nav) return;

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      menu.setAttribute("data-open", String(!open));
    });

    menu.querySelectorAll("[data-nav-close]").forEach(function (link) {
      link.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        menu.setAttribute("data-open", "false");
      });
    });

    var lastY = window.scrollY;
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        var scrollingDown = y > lastY && y > 120;
        var menuOpen = toggle.getAttribute("aria-expanded") === "true";
        nav.setAttribute("data-hidden", String(scrollingDown && !menuOpen));
        lastY = y;
        ticking = false;
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------
     Waitlist form
  ------------------------------------------------------------ */
  function initWaitlist(onJoined) {
    var form = document.getElementById("waitlist-form");
    var errorEl = document.getElementById("form-error");
    var submitBtn = document.getElementById("waitlist-submit");
    var formPanel = document.getElementById("waitlist-form-panel");
    var confirmPanel = document.getElementById("waitlist-confirm-panel");
    var srStatus = document.getElementById("sr-status");
    if (!form) return;

    function validate(data) {
      if (!data.firstName || !data.firstName.trim()) {
        return "First name is required.";
      }
      var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!data.email || !emailPattern.test(data.email.trim())) {
        return "Enter a valid email address.";
      }
      return null;
    }

    form.addEventListener("submit", function (evt) {
      evt.preventDefault();
      errorEl.textContent = "";

      var data = {
        firstName: form.firstName.value,
        email: form.email.value,
        phone: form.phone.value
      };

      var validationError = validate(data);
      if (validationError) {
        errorEl.textContent = validationError;
        return;
      }

      submitBtn.setAttribute("disabled", "true");
      submitBtn.setAttribute("data-loading", "true");

      submitToWaitlist(data)
        .then(function () {
          Store.write({
            joined: true,
            firstName: data.firstName.trim(),
            joinedAt: new Date().toISOString()
          });

          formPanel.hidden = true;
          confirmPanel.hidden = false;
          var confirmHeading = confirmPanel.querySelector(".confirm__you-re-in");
          confirmHeading.focus();
          if (window.Motion) {
            window.Motion.scramble(confirmHeading, { text: "YOU'RE IN.", duration: 550 });
          }
          if (srStatus) srStatus.textContent = "You're in. They're awake. We'll tell you what's next.";

          setTimeout(function () {
            onJoined();
          }, CONFIG.confirmHoldMs);
        })
        .catch(function () {
          errorEl.textContent = "Something went wrong. Try again.";
          submitBtn.removeAttribute("disabled");
          submitBtn.removeAttribute("data-loading");
        });
    });
  }

  /* ------------------------------------------------------------
     Final signal state — the terminal experience
  ------------------------------------------------------------ */
  function enterFinalState() {
    var body = document.body;
    var finalSignal = document.getElementById("final-signal");
    body.setAttribute("data-state", "final");
    if (finalSignal) {
      finalSignal.hidden = false;
      if (window.SignalGlitch) window.SignalGlitch.start();
    }
  }

  /* ------------------------------------------------------------
     Dev/test helper — visiting the site with ?reset=1 in the URL
     clears the local "joined" flag with no devtools required, e.g.
     https://your-site.vercel.app/?reset=1
     Useful for repeatedly testing the new-visitor flow.
  ------------------------------------------------------------ */
  function clearJoinFlagIfRequested() {
    if (/[?&]reset=1\b/.test(window.location.search)) {
      try { window.localStorage.removeItem(CONFIG.storageKey); } catch (e) {}
      var cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, "", cleanUrl);
    }
  }

  /* ------------------------------------------------------------
     Boot
  ------------------------------------------------------------ */
  function boot() {
    wireLinks();
    initNav();
    clearJoinFlagIfRequested();

    var record = Store.read();
    var alreadyJoined = !!(record && record.joined);

    if (!alreadyJoined) {
      initWaitlist(enterFinalState);
    }

    window.IntroSequence.run(function () {
      if (alreadyJoined) {
        enterFinalState();
      } else {
        document.body.setAttribute("data-state", "app");
        var eyebrow = document.getElementById("hero-eyebrow");
        if (eyebrow && window.Motion) {
          window.Motion.scramble(eyebrow, { text: "SIGNAL LOGGED AT 03:17", duration: 700 });
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
