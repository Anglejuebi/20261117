/* Lightbox viewer: fit-to-screen, cursor-anchored wheel zoom, drag pan,
   pinch on touch, keyboard navigation. No dependencies. */
(function () {
  'use strict';

  var links = Array.prototype.slice.call(document.querySelectorAll('a.zoomable'));
  if (!links.length) return;

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

  var cur = -1;
  var s = 1;          // absolute render scale (1 = source pixels)
  var tx = 0, ty = 0; // pan offset in px
  var fitS = 1;
  var token = 0;
  var drag = null;
  var pinch = null;
  var lastFocus = null;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function stageSize() {
    var r = stage.getBoundingClientRect();
    return { w: r.width, h: r.height, left: r.left, top: r.top };
  }

  function computeFit(it) {
    var r = stageSize();
    var pad = 28;
    var fs = Math.min((r.w - pad * 2) / it.w, (r.h - pad * 2) / it.h);
    fitS = clamp(fs, MIN_S, 1); // never upscale on open: keep source pixels honest
  }

  function clampPan() {
    var it = items[cur];
    if (!it) return;
    var r = stageSize();
    var w = it.w * s;
    var h = it.h * s;
    var mx = Math.max(0, (w - r.w) / 2) + 24;
    var my = Math.max(0, (h - r.h) / 2) + 24;
    if (w <= r.w) tx = 0; else tx = clamp(tx, -mx, mx);
    if (h <= r.h) ty = 0; else ty = clamp(ty, -my, my);
  }

  function apply() {
    var it = items[cur];
    if (!it) return;
    clampPan();
    img.style.width = (it.w * s) + 'px';
    img.style.height = 'auto';
    img.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
  }

  function zoomTo(next, clientX, clientY) {
    var it = items[cur];
    if (!it) return;
    next = clamp(next, MIN_S, MAX_S);
    if (next === s) return;
    var r = stageSize();
    var cx = (typeof clientX === 'number' ? clientX : r.left + r.w / 2) - r.left - r.w / 2;
    var cy = (typeof clientY === 'number' ? clientY : r.top + r.h / 2) - r.top - r.h / 2;
    var px = cx - tx;
    var py = cy - ty;
    var k = next / s;
    tx -= px * (k - 1);
    ty -= py * (k - 1);
    s = next;
    apply();
  }

  function show(i) {
    if (!items.length) return;
    cur = (i + items.length) % items.length;
    var it = items[cur];
    var my = ++token;

    elNum.textContent = 'Figure ' + it.n;
    elTitle.textContent = it.title;
    elCount.textContent = (cur + 1) + ' / ' + items.length;
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

    if (img.decode) {
      img.decode().then(ready, ready);
    } else if (img.complete) {
      ready();
    } else {
      img.onload = ready;
    }

    // preload neighbours for instant paging
    [cur - 1, cur + 1].forEach(function (j) {
      var nb = items[(j + items.length) % items.length];
      if (nb) { var p = new Image(); p.src = nb.full; }
    });
  }

  function open(i) {
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.classList.add('lb-open');
    show(i);
    document.getElementById('lb-close').focus({ preventScroll: true });
  }

  function close() {
    lb.hidden = true;
    document.body.classList.remove('lb-open');
    img.removeAttribute('src');
    cur = -1;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  links.forEach(function (a, i) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      open(i);
    });
  });

  document.getElementById('lb-close').addEventListener('click', close);
  document.getElementById('lb-prev').addEventListener('click', function () { show(cur - 1); });
  document.getElementById('lb-next').addEventListener('click', function () { show(cur + 1); });
  document.getElementById('lb-in').addEventListener('click', function () { zoomTo(s * 1.4); });
  document.getElementById('lb-out').addEventListener('click', function () { zoomTo(s / 1.4); });
  document.getElementById('lb-fit').addEventListener('click', function () { s = fitS; tx = 0; ty = 0; apply(); });
  document.getElementById('lb-actual').addEventListener('click', function () { zoomTo(1); });

  // click on empty stage closes; drag does not
  var moved = 0;
  stage.addEventListener('click', function (e) {
    if (e.target === stage && moved < 5) close();
  });

  stage.addEventListener('wheel', function (e) {
    if (lb.hidden) return;
    e.preventDefault();
    var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomTo(s * Math.exp(-dy * 0.0016), e.clientX, e.clientY);
  }, { passive: false });

  stage.addEventListener('pointerdown', function (e) {
    if (lb.hidden) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    stage.setPointerCapture(e.pointerId);
    if (pinch) return;
    drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty };
    moved = 0;
    stage.classList.add('grabbing');
  });

  stage.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    var dy = e.clientY - drag.y;
    moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
    tx = drag.tx + dx;
    ty = drag.ty + dy;
    apply();
  });

  function endPointer(e) {
    if (pinch && pinch.pointers > 1) { pinch.pointers -= 1; return; }
    if (e && e.pointerId != null && stage.hasPointerCapture && stage.hasPointerCapture(e.pointerId)) {
      try { stage.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
    }
    drag = null;
    pinch = null;
    stage.classList.remove('grabbing');
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  // two-finger pinch zoom
  var pts = {};
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  stage.addEventListener('pointerdown', function (e) {
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pts);
    if (ids.length === 2) {
      pinch = { pointers: 2, d0: dist(pts[ids[0]], pts[ids[1]]), s0: s };
      drag = null;
    }
  });

  stage.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId]) return;
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (!pinch) return;
    var ids = Object.keys(pts);
    if (ids.length < 2) return;
    var d = dist(pts[ids[0]], pts[ids[1]]);
    if (!pinch.d0) return;
    s = clamp(pinch.s0 * (d / pinch.d0), MIN_S, MAX_S);
    apply();
  });

  ['pointerup', 'pointercancel'].forEach(function (ev) {
    stage.addEventListener(ev, function (e) { delete pts[e.pointerId]; });
  });

  stage.addEventListener('dblclick', function (e) {
    if (e.target !== img && e.target !== stage) return;
    if (s > fitS * 1.05) { s = fitS; tx = 0; ty = 0; apply(); }
    else { s = 1; tx = 0; ty = 0; apply(); }
  });

  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    var k = e.key;
    if (k === 'Escape') { e.preventDefault(); close(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
    else if (k === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
    else if (k === '+' || k === '=') { e.preventDefault(); zoomTo(s * 1.4); }
    else if (k === '-' || k === '_') { e.preventDefault(); zoomTo(s / 1.4); }
    else if (k === '0') { e.preventDefault(); s = fitS; tx = 0; ty = 0; apply(); }
    else if (k === '1') { e.preventDefault(); zoomTo(1); }
    else if (k === 'Tab') { /* keep focus inside the dialog */ }
  });

  window.addEventListener('resize', function () {
    if (lb.hidden || cur < 0) return;
    var wasFit = Math.abs(s - fitS) < 1e-6;
    computeFit(items[cur]);
    if (wasFit) { s = fitS; tx = 0; ty = 0; }
    apply();
  });
})();
