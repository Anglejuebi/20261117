/* Deck paging + figure lightbox. No dependencies. */
(function () {
  'use strict';

  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('.dot'));
  var barTitle = document.getElementById('barTitle');
  var count = document.getElementById('count');
  var prevBtn = document.getElementById('prev');
  var nextBtn = document.getElementById('next');
  var figCount = dots.length ? dots.length - 1 : 0;

  var cur = 0;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  function setActive(i) {
    if (i === cur && barTitle.textContent !== '') return;
    cur = Math.max(0, Math.min(i, slides.length - 1));
    var s = slides[cur];
    var label = s.getAttribute('data-label') || '';
    var n = parseInt(s.getAttribute('data-i'), 10);
    barTitle.textContent = label;
    count.textContent = n === 0 ? '封面' : pad(n) + ' / ' + pad(figCount);
    dots.forEach(function (d) {
      var on = parseInt(d.getAttribute('data-i'), 10) === n;
      d.classList.toggle('is-active', on);
      if (on) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
    prevBtn.disabled = cur === 0;
    nextBtn.disabled = cur === slides.length - 1;
  }

  function goTo(i, smooth) {
    i = Math.max(0, Math.min(i, slides.length - 1));
    slides[i].scrollIntoView({ behavior: smooth === false ? 'auto' : 'smooth', block: 'start' });
  }

  // active slide tracking
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          setActive(parseInt(en.target.getAttribute('data-i'), 10));
        }
      });
    }, { threshold: 0.55 });
    slides.forEach(function (s) { io.observe(s); });
  } else {
    window.addEventListener('scroll', function () {
      var h = window.innerHeight;
      setActive(Math.round(window.scrollY / h));
    }, { passive: true });
  }

  prevBtn.addEventListener('click', function () { goTo(cur - 1); });
  nextBtn.addEventListener('click', function () { goTo(cur + 1); });

  document.addEventListener('keydown', function (e) {
    if (!lb.hidden) return;                 // lightbox owns the keyboard while open
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    var k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown' || k === ' ') {
      e.preventDefault();
      goTo(cur + 1);
    } else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') {
      e.preventDefault();
      goTo(cur - 1);
    } else if (k === 'Home') {
      e.preventDefault();
      goTo(0);
    } else if (k === 'End') {
      e.preventDefault();
      goTo(slides.length - 1);
    }
  });

  /* ---------------- lightbox ---------------- */

  var links = Array.prototype.slice.call(document.querySelectorAll('a.zoomable'));
  var lb = document.getElementById('lb');
  var stage = document.getElementById('lb-stage');
  var img = document.getElementById('lb-img');
  var elNum = document.getElementById('lb-num');
  var elTitle = document.getElementById('lb-title');
  var elCount = document.getElementById('lb-count');
  var elOrig = document.getElementById('lb-orig');

  var items = links.map(function (a, i) {
    return {
      i: i,
      full: a.getAttribute('data-full'),
      orig: a.getAttribute('data-orig'),
      w: parseInt(a.getAttribute('data-w'), 10),
      h: parseInt(a.getAttribute('data-h'), 10),
      n: a.getAttribute('data-n'),
      title: a.getAttribute('data-title') || ''
    };
  });

  var MIN_S = 0.08;
  var MAX_S = 6;
  var lcur = -1;
  var s = 1, tx = 0, ty = 0, fitS = 1;
  var token = 0, drag = null, pinch = null, lastFocus = null, moved = 0;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function stageSize() {
    var r = stage.getBoundingClientRect();
    return { w: r.width, h: r.height, left: r.left, top: r.top };
  }

  function computeFit(it) {
    var r = stageSize();
    var padp = 28;
    var fs = Math.min((r.w - padp * 2) / it.w, (r.h - padp * 2) / it.h);
    fitS = clamp(fs, MIN_S, 1);
  }

  function clampPan() {
    var it = items[lcur];
    if (!it) return;
    var r = stageSize();
    var w = it.w * s, h = it.h * s;
    var mx = Math.max(0, (w - r.w) / 2) + 24;
    var my = Math.max(0, (h - r.h) / 2) + 24;
    tx = w <= r.w ? 0 : clamp(tx, -mx, mx);
    ty = h <= r.h ? 0 : clamp(ty, -my, my);
  }

  function apply() {
    var it = items[lcur];
    if (!it) return;
    clampPan();
    img.style.width = (it.w * s) + 'px';
    img.style.height = 'auto';
    img.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
  }

  function zoomTo(next, clientX, clientY) {
    var it = items[lcur];
    if (!it) return;
    next = clamp(next, MIN_S, MAX_S);
    if (next === s) return;
    var r = stageSize();
    var cx = (typeof clientX === 'number' ? clientX : r.left + r.w / 2) - r.left - r.w / 2;
    var cy = (typeof clientY === 'number' ? clientY : r.top + r.h / 2) - r.top - r.h / 2;
    var px = cx - tx, py = cy - ty, k = next / s;
    tx -= px * (k - 1);
    ty -= py * (k - 1);
    s = next;
    apply();
  }

  function show(i) {
    if (!items.length) return;
    lcur = (i + items.length) % items.length;
    var it = items[lcur];
    var my = ++token;

    elNum.textContent = 'Figure ' + it.n;
    elTitle.textContent = it.title;
    elCount.textContent = (lcur + 1) + ' / ' + items.length;
    elOrig.href = it.orig;
    img.alt = 'Figure ' + it.n + '：' + it.title;

    s = 1; tx = 0; ty = 0;
    img.style.visibility = 'hidden';
    img.src = it.full;

    function ready() {
      if (my !== token) return;
      computeFit(it);
      s = fitS;
      tx = 0; ty = 0;
      apply();
      img.style.visibility = 'visible';
    }

    if (img.decode) img.decode().then(ready, ready);
    else if (img.complete) ready();
    else img.onload = ready;

    [lcur - 1, lcur + 1].forEach(function (j) {
      var nb = items[(j + items.length) % items.length];
      if (nb) { var p = new Image(); p.src = nb.full; }
    });
  }

  function open(i) {
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.documentElement.classList.add('lb-open');
    show(i);
    document.getElementById('lb-close').focus({ preventScroll: true });
  }

  function close() {
    lb.hidden = true;
    document.documentElement.classList.remove('lb-open');
    img.removeAttribute('src');
    lcur = -1;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  links.forEach(function (a, i) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      open(i);
    });
  });

  document.getElementById('lb-close').addEventListener('click', close);
  document.getElementById('lb-prev').addEventListener('click', function () { show(lcur - 1); });
  document.getElementById('lb-next').addEventListener('click', function () { show(lcur + 1); });
  document.getElementById('lb-in').addEventListener('click', function () { zoomTo(s * 1.4); });
  document.getElementById('lb-out').addEventListener('click', function () { zoomTo(s / 1.4); });
  document.getElementById('lb-fit').addEventListener('click', function () { s = fitS; tx = 0; ty = 0; apply(); });
  document.getElementById('lb-actual').addEventListener('click', function () { zoomTo(1); });

  stage.addEventListener('click', function (e) {
    if (e.target === stage && moved < 5) close();
  });

  stage.addEventListener('wheel', function (e) {
    if (lb.hidden) return;
    e.preventDefault();
    var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomTo(s * Math.exp(-dy * 0.0016), e.clientX, e.clientY);
  }, { passive: false });

  var pts = {};
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  stage.addEventListener('pointerdown', function (e) {
    if (lb.hidden) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    stage.setPointerCapture(e.pointerId);
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pts);
    if (ids.length === 2) {
      pinch = { d0: dist(pts[ids[0]], pts[ids[1]]), s0: s };
      drag = null;
      return;
    }
    if (pinch) return;
    drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty };
    moved = 0;
    stage.classList.add('grabbing');
  });

  stage.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId]) return;
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (pinch) {
      var ids = Object.keys(pts);
      if (ids.length < 2 || !pinch.d0) return;
      var d = dist(pts[ids[0]], pts[ids[1]]);
      s = clamp(pinch.s0 * (d / pinch.d0), MIN_S, MAX_S);
      apply();
      return;
    }
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
    tx = drag.tx + dx;
    ty = drag.ty + dy;
    apply();
  });

  function endPointer(e) {
    if (e && e.pointerId != null) {
      delete pts[e.pointerId];
      if (stage.hasPointerCapture && stage.hasPointerCapture(e.pointerId)) {
        try { stage.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
      }
    }
    if (pinch && Object.keys(pts).length === 1) return; // still one finger down
    drag = null;
    pinch = null;
    stage.classList.remove('grabbing');
  }

  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  stage.addEventListener('dblclick', function (e) {
    if (e.target !== img && e.target !== stage) return;
    if (s > fitS * 1.05) { s = fitS; tx = 0; ty = 0; apply(); }
    else { s = 1; tx = 0; ty = 0; apply(); }
  });

  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    var k = e.key;
    if (k === 'Escape') { e.preventDefault(); close(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); show(lcur - 1); }
    else if (k === 'ArrowRight') { e.preventDefault(); show(lcur + 1); }
    else if (k === '+' || k === '=') { e.preventDefault(); zoomTo(s * 1.4); }
    else if (k === '-' || k === '_') { e.preventDefault(); zoomTo(s / 1.4); }
    else if (k === '0') { e.preventDefault(); s = fitS; tx = 0; ty = 0; apply(); }
    else if (k === '1') { e.preventDefault(); zoomTo(1); }
  });

  window.addEventListener('resize', function () {
    if (lb.hidden || lcur < 0) return;
    var wasFit = Math.abs(s - fitS) < 1e-6;
    computeFit(items[lcur]);
    if (wasFit) { s = fitS; tx = 0; ty = 0; }
    apply();
  });

  setActive(0);
})();
