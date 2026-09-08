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
    // Social / contact placeholders — swap for the real accounts.
    instagramUrl: "https://instagram.com/theinsomniacs.lagos", // TODO: confirm real handle
    contactEmail: "signal@theinsomniacs.placeholder",           // TODO: confirm real inbox

    // BACKEND INTEGRATION POINT.
    // Leave null to run the prototype in local-only mode (no
    // network call — the frontend clearly does not claim the
    // submission reached a server). Set this to a real endpoint
    // URL once a waitlist backend exists, e.g.
    // "https://api.theinsomniacs.com/v1/waitlist".
    waitlistEndpoint: null,

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
     Backend integration layer
     Swap the body of this function for a real fetch() once
     CONFIG.waitlistEndpoint is set. The rest of the app only
     depends on the returned Promise resolving/rejecting.
  ------------------------------------------------------------ */
  function submitToWaitlist(payload) {
    if (CONFIG.waitlistEndpoint) {
      return fetch(CONFIG.waitlistEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) throw new Error("Waitlist submission failed");
        return res.json().catch(function () { return { ok: true }; });
      });
    }
    // Local-only simulation — no real request is made.
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve({ ok: true, local: true });
      }, 650 + Math.random() * 450);
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
          confirmPanel.querySelector(".confirm__you-re-in").focus();
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
     Boot
  ------------------------------------------------------------ */
  function boot() {
    wireLinks();
    initNav();

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
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
