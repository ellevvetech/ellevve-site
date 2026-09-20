(function () {
  var box = document.querySelector('.hero-bg');
  var cv = box.querySelector('canvas');
  var ctx = cv.getContext('2d');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cols = ['#1E252A', '#252D33', '#2E383E', '#3A464C'];
  var px = [], W = 0, H = 0, raf = 0, last = 0;
  var rand = function (a, b) { return Math.random() * (b - a) + a; };

  function build() {
    var r = box.getBoundingClientRect();
    if (!r.width || !r.height) { requestAnimationFrame(build); return; }
    var d = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = W * d; cv.height = H * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    var gap = W < 640 ? 9 : 7, cx = W / 2, cy = H / 2;
    px = [];
    for (var x = 0; x < W; x += gap) {
      for (var y = 0; y < H; y += gap) {
        var dist = Math.hypot(x - cx, y - cy), cyan = Math.random() < 0.09;
        var max = rand(0.5, 2);
        px.push({
          x: x, y: y,
          color: cyan ? '#17D3F5' : cols[Math.floor(Math.random() * 4)],
          a: cyan ? 0.85 : 0.7,
          size: reduce ? max : 0, max: max, min: 0.5,
          delay: reduce ? 0 : dist * 0.6,
          speedIn: reduce ? 0 : rand(1.8, 3.2) + (W + H) * 0.008,
          grow: reduce ? 0 : rand(0.16, 0.34),
          tw: reduce ? 0 : rand(0.08, 0.4) * 0.11,
          dir: 1, ready: reduce, counter: 0, sparkle: reduce
        });
      }
    }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function step(p) {
    if (!p.ready) { p.counter += p.speedIn; if (p.counter >= p.delay) p.ready = true; return; }
    if (!p.sparkle) { p.size += p.grow; if (p.size >= p.max) { p.size = p.max; p.sparkle = true; } return; }
    p.size += p.dir * p.tw;
    if (p.size >= p.max) { p.size = p.max; p.dir = -1; }
    else if (p.size <= p.min) { p.size = p.min; p.dir = 1; }
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (t - last < 1000 / 60 - 1) return;
    last = t;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < px.length; i++) {
      var p = px[i];
      step(p);
      if (p.size <= 0) continue;
      ctx.globalAlpha = p.a;
      ctx.fillStyle = p.color;
      var o = (1 - p.size) / 2;
      ctx.fillRect(p.x + o, p.y + o, p.size, p.size);
    }
  }

  new ResizeObserver(function () {
    var r = box.getBoundingClientRect();
    if (Math.round(r.width) !== Math.round(W) || Math.round(r.height) !== Math.round(H)) build();
  }).observe(box);
  build();
})();
