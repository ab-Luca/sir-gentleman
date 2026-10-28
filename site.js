// Shared page behavior. Each page sets window.HOURS before loading this file:
// index 0 = Sunday ... 6 = Saturday, each [openMinutes, closeMinutes] or null when closed.
(function () {
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function fmt(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    var suffix = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + (m ? ":" + String(m).padStart(2, "0") : "") + " " + suffix;
  }

  // Arizona does not observe daylight saving, so America/Phoenix is always correct here.
  function phoenixNow() {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Phoenix", weekday: "short", hour: "numeric", minute: "numeric", hour12: false
    }).formatToParts(new Date());
    var get = function (t) { return parts.find(function (p) { return p.type === t; }).value; };
    var day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    return { day: day, mins: (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10) };
  }

  function status(hours) {
    var now = phoenixNow(), today = hours[now.day];
    if (today && now.mins >= today[0] && now.mins < today[1]) {
      return { open: true, text: "Open now until " + fmt(today[1]) };
    }
    for (var i = 0; i < 7; i++) {
      var d = (now.day + i) % 7, h = hours[d];
      if (!h || (i === 0 && now.mins >= h[0])) continue;
      var when = i === 0 ? "today" : i === 1 ? "tomorrow" : DAYS[d];
      return { open: false, text: "Closed now. Opens " + when + " at " + fmt(h[0]) };
    }
    return { open: false, text: "Closed now" };
  }

  if (window.HOURS) {
    var s = status(window.HOURS);
    document.querySelectorAll("[data-open-status]").forEach(function (el) {
      el.textContent = s.text;
      el.classList.add(s.open ? "is-open" : "is-closed");
    });
    var today = phoenixNow().day;
    document.querySelectorAll('[data-day="' + today + '"]').forEach(function (row) {
      row.classList.add("today");
    });
  }

  // Mobile menu
  var toggle = document.querySelector(".menu-toggle"), nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", false); });
    });
  }

  // Copy address
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var label = btn.textContent;
      navigator.clipboard.writeText(btn.getAttribute("data-copy")).then(function () {
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = label; }, 1800);
      });
    });
  });

  // Photo viewer
  var photos = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
  if (photos.length) {
    var box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML = '<button class="lb-close" aria-label="Close">&times;</button>' +
      '<button class="lb-prev" aria-label="Previous photo">&#8249;</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lb-next" aria-label="Next photo">&#8250;</button>';
    document.body.appendChild(box);
    var img = box.querySelector("img"), cap = box.querySelector("figcaption"), index = 0, startX = null;

    function show(i) {
      index = (i + photos.length) % photos.length;
      img.src = photos[index].currentSrc || photos[index].src;
      img.alt = photos[index].alt;
      cap.textContent = photos[index].alt + "  (" + (index + 1) + " of " + photos.length + ")";
    }
    function close() { box.classList.remove("open"); document.body.style.overflow = ""; }

    photos.forEach(function (p, i) {
      p.tabIndex = 0;
      p.addEventListener("click", function () { show(i); box.classList.add("open"); document.body.style.overflow = "hidden"; });
      p.addEventListener("keydown", function (e) { if (e.key === "Enter") p.click(); });
    });
    box.querySelector(".lb-close").addEventListener("click", close);
    box.querySelector(".lb-prev").addEventListener("click", function () { show(index - 1); });
    box.querySelector(".lb-next").addEventListener("click", function () { show(index + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
    box.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  // Fade sections in as they scroll into view, and back out as they leave
  var reveal = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle("shown", en.isIntersecting); });
    }, { threshold: 0.12 });
    reveal.forEach(function (el) { io.observe(el); });
  } else {
    reveal.forEach(function (el) { el.classList.add("shown"); });
  }
})();
