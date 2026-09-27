/* Laser Cats — original slingshot game for Cat's Meow Cat Rescue.
   No third-party physics library. Cats, vacuums, statues, and cardboard only. */
(function () {
  'use strict';

  var WORLD_W = 1280;
  var WORLD_H = 540;
  var GROUND = 468;
  var GRAV = 1040;
  var SLING = { x: 156, y: 386 };
  var PULL_MAX = 102;
  var POWER = 7.6;
  var STEP = 1 / 120;
  var IMPACT_J = 180;
  var IMPACT_SCALE = 0.1;
  var ADOPT = 'https://app.sparkie.io/application?t=5fab11fbb83c8e002ea3b873&amp;m=CAT_ADOPT';
  var DONATE = 'index.html#help';
  var FOSTER = 'https://app.sparkie.io/application?m=CAT_FOSTER&t=5fab11fbb83c8e002ea3b873';
  var NAMES = ['Pepper', 'Nori', 'Bean', 'Soot'];
  var COATS = ['#E2873A', '#B7B3AE', '#F3D7B5', '#3C2C2A'];

  var MAT = {
    wood: { density: 0.0022, rest: 0.06, fric: 0.62, hp: 100, kind: 'wood' },
    card: { density: 0.0011, rest: 0.04, fric: 0.55, hp: 48, kind: 'card' },
    stone: { density: 0.0058, rest: 0.02, fric: 0.75, hp: 260, kind: 'stone' },
    vac: { density: 0.0017, rest: 0.1, fric: 0.45, hp: 36, kind: 'vacuum', target: true },
    statue: { density: 0.0042, rest: 0.02, fric: 0.65, hp: 100, kind: 'statue', target: true },
    pest: { density: 0.0009, rest: 0.04, fric: 0.5, hp: 28, kind: 'pest', target: true },
    cat: { density: 0.0034, rest: 0.22, fric: 0.32, hp: 9999, kind: 'cat' }
  };

  var canvas, ctx, frame, overlay, hud, scoreEl, levelEl, catsEl, liveEl, laserBtn;
  var view = { dpr: 1, cssW: 960, cssH: 480, scale: 1, w: 960 };
  var bodies = [];
  var particles = [];
  var floaters = [];
  var beam = null;
  var cat = null;
  var mode = 'title';
  var phase = 'ready';
  var levelIndex = 0;
  var score = 0;
  var scoreMark = 0;
  var totalStars = 0;
  var starsMark = 0;
  var levelStars = 0;
  var stock = 3;
  var pull = { x: 0, y: 0 };
  var dragging = false;
  var lasering = false;
  var aimSet = false;
  var aimAngle = 0;
  var camX = 0;
  var acceptDamage = false;
  var settling = false;
  var clearArmed = false;
  var clearDelay = 0;
  var emptyT = 0;
  var flightT = 0;
  var calm = 0;
  var gapT = 0;
  var hasDragged = false;
  var paintedMode = '';
  var soundOn = true;
  var audioCtx = null;
  var acc = 0;
  var lastT = 0;
  var clock = 0;
  var reduceMotion = false;
  var recentHits = [];
  var pointerId = null;

  var LEVELS = [
    {
      name: 'Porch Crate',
      cats: 3,
      build: function () {
        var left = boxOnGround(640, 18, 112, MAT.wood);
        boxOnGround(800, 18, 112, MAT.wood);
        var top = boxOn(720, 190, 18, MAT.wood, left);
        circleOn(720, 17, MAT.vac, top);
      }
    },
    {
      name: 'Statue Window',
      cats: 3,
      build: function () {
        boxOnGround(520, 26, 76, MAT.pest);
        var p1 = boxOnGround(660, 16, 96, MAT.card);
        boxOnGround(760, 16, 96, MAT.card);
        boxOn(710, 130, 16, MAT.card, p1);
        var ped = boxOnGround(860, 56, 22, MAT.stone);
        boxOn(860, 38, 50, MAT.statue, ped);
      }
    },
    {
      name: 'Cardboard Shed',
      cats: 4,
      build: function () {
        var c1 = boxOnGround(540, 40, 40, MAT.card);
        boxOn(540, 40, 40, MAT.card, c1);
        var wallL = boxOnGround(660, 18, 118, MAT.wood);
        boxOnGround(840, 18, 118, MAT.wood);
        var roof = boxOn(750, 210, 18, MAT.wood, wallL);
        circleOn(750, 17, MAT.vac, null);
        boxOn(750, 24, 56, MAT.pest, roof);
      }
    },
    {
      name: 'Yard Tower',
      cats: 4,
      build: function () {
        boxOnGround(500, 24, 68, MAT.pest);
        var s1 = boxOnGround(640, 64, 28, MAT.stone);
        boxOnGround(800, 64, 28, MAT.stone);
        var floor1 = boxOn(720, 210, 18, MAT.wood, s1);
        boxOn(650, 36, 46, MAT.statue, floor1);
        var postL = boxOn(730, 14, 72, MAT.wood, floor1);
        boxOn(810, 14, 72, MAT.wood, floor1);
        var floor2 = boxOn(770, 120, 16, MAT.wood, postL);
        circleOn(760, 16, MAT.vac, floor2);
      }
    }
  ];

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function makeBox(x, y, w, h, mat) {
    var mass = Math.max(0.45, w * h * mat.density);
    var inertia = Math.max(1, mass * (w * w + h * h) / 12);
    return {
      shape: 'box', x: x, y: y, w: w, h: h, hw: w / 2, hh: h / 2, r: 0,
      angle: 0, vx: 0, vy: 0, av: 0,
      invMass: 1 / mass, invI: 0, baseInvI: 1 / inertia, mass: mass,
      rest: mat.rest, fric: mat.fric, hp: mat.hp, maxHp: mat.hp,
      kind: mat.kind, target: !!mat.target, loose: false, awake: true,
      still: 0, static: false, dead: false, peakJ: 0, isActive: false,
      laserUsed: false, coat: '#E2873A'
    };
  }

  function makeCircle(x, y, r, mat) {
    var mass = Math.max(0.45, Math.PI * r * r * mat.density);
    var inertia = Math.max(1, 0.5 * mass * r * r);
    var b = makeBox(x, y, r * 2, r * 2, mat);
    b.shape = 'circle';
    b.r = r;
    b.hw = r;
    b.hh = r;
    b.invMass = 1 / mass;
    b.mass = mass;
    b.baseInvI = 1 / inertia;
    b.invI = mat.kind === 'cat' ? b.baseInvI : 0;
    b.loose = mat.kind === 'cat';
    return b;
  }

  function spawnBox(x, y, w, h, mat) {
    var b = makeBox(x, y, w, h, mat);
    bodies.push(b);
    return b;
  }

  function spawnCircle(x, y, r, mat) {
    var b = makeCircle(x, y, r, mat);
    bodies.push(b);
    return b;
  }

  function boxOnGround(x, w, h, mat) {
    return spawnBox(x, GROUND - h / 2, w, h, mat);
  }

  function boxOn(x, w, h, mat, support) {
    var y = support.y - support.hh - h / 2 + 1.25;
    return spawnBox(x, y, w, h, mat);
  }

  function circleOn(x, r, mat, support) {
    var y = support ? (support.y - support.hh - r + 1.2) : (GROUND - r);
    return spawnCircle(x, y, r, mat);
  }

  function addBounds() {
    var g = makeBox(WORLD_W / 2, GROUND + 120, WORLD_W + 900, 240, MAT.stone);
    g.static = true;
    g.invMass = 0;
    g.invI = 0;
    g.baseInvI = 0;
    g.awake = false;
    g.kind = 'ground';
    g.hp = 1e9;
    g.maxHp = 1e9;
    g.rest = 0.04;
    g.fric = 0.86;
    bodies.push(g);
    var w = makeBox(-40, 280, 80, 900, MAT.stone);
    w.static = true;
    w.invMass = 0;
    w.invI = 0;
    w.baseInvI = 0;
    w.awake = false;
    w.kind = 'wall';
    w.hp = 1e9;
    w.maxHp = 1e9;
    w.rest = 0.05;
    w.fric = 0.5;
    bodies.push(w);
  }

  function corners(b) {
    var c = Math.cos(b.angle), s = Math.sin(b.angle);
    var pts = [[-b.hw, -b.hh], [b.hw, -b.hh], [b.hw, b.hh], [-b.hw, b.hh]];
    var out = [];
    for (var i = 0; i < 4; i++) {
      var x = pts[i][0], y = pts[i][1];
      out.push({ x: b.x + x * c - y * s, y: b.y + x * s + y * c });
    }
    return out;
  }

  function obbAxes(b) {
    var c = Math.cos(b.angle), s = Math.sin(b.angle);
    return [{ x: c, y: s }, { x: -s, y: c }];
  }

  function project(vs, ax, ay) {
    var min = Infinity, max = -Infinity;
    for (var i = 0; i < vs.length; i++) {
      var d = vs[i].x * ax + vs[i].y * ay;
      if (d < min) min = d;
      if (d > max) max = d;
    }
    return { min: min, max: max };
  }

  function boundsOf(b) {
    if (b.shape === 'circle') return { l: b.x - b.r, r: b.x + b.r, t: b.y - b.r, b: b.y + b.r };
    if (!b.loose) return { l: b.x - b.hw, r: b.x + b.hw, t: b.y - b.hh, b: b.y + b.hh };
    var v = corners(b);
    var l = v[0].x, r = v[0].x, t = v[0].y, bt = v[0].y;
    for (var i = 1; i < 4; i++) {
      if (v[i].x < l) l = v[i].x;
      if (v[i].x > r) r = v[i].x;
      if (v[i].y < t) t = v[i].y;
      if (v[i].y > bt) bt = v[i].y;
    }
    return { l: l, r: r, t: t, b: bt };
  }

  function aabbHit(a, b) {
    var A = boundsOf(a), B = boundsOf(b);
    return A.l - 2 < B.r && A.r + 2 > B.l && A.t - 2 < B.b && A.b + 2 > B.t;
  }

  function bestFace(body, nx, ny) {
    var v = corners(body);
    var best = -Infinity, idx = 0;
    for (var i = 0; i < 4; i++) {
      var v1 = v[i], v2 = v[(i + 1) % 4];
      var dx = v2.x - v1.x, dy = v2.y - v1.y;
      var len = Math.hypot(dx, dy) || 1;
      var d = (dy / len) * nx + (-dx / len) * ny;
      if (d > best) { best = d; idx = i; }
    }
    return { v1: v[idx], v2: v[(idx + 1) % 4] };
  }

  function clipSeg(pts, nx, ny, off) {
    if (pts.length < 2) return pts.slice();
    var a = pts[0], b = pts[1];
    var da = a.x * nx + a.y * ny - off;
    var db = b.x * nx + b.y * ny - off;
    var out = [];
    if (da >= -1e-6) out.push(a);
    if (db >= -1e-6) out.push(b);
    if (da * db < 0) {
      var t = da / (da - db);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    return out;
  }

  function boxes(a, b, out) {
    var axesA = obbAxes(a);
    var axesB = obbAxes(b);
    var axes = [axesA[0], axesA[1], axesB[0], axesB[1]];
    var va = corners(a), vb = corners(b);
    var minPen = Infinity, nx = 0, ny = 0, ownerA = true;
    for (var i = 0; i < 4; i++) {
      var ax = axes[i].x, ay = axes[i].y;
      var pa = project(va, ax, ay);
      var pb = project(vb, ax, ay);
      var overlap = Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min);
      if (overlap <= 0) return;
      if (overlap < minPen - 1e-6) {
        minPen = overlap;
        nx = ax;
        ny = ay;
        ownerA = i < 2;
      }
    }
    var dx = b.x - a.x, dy = b.y - a.y;
    if (dx * nx + dy * ny < 0) { nx = -nx; ny = -ny; }
    var nrx = ownerA ? nx : -nx;
    var nry = ownerA ? ny : -ny;
    var ref = bestFace(ownerA ? a : b, nrx, nry);
    var inc = bestFace(ownerA ? b : a, -nrx, -nry);
    var tx = ref.v2.x - ref.v1.x, ty = ref.v2.y - ref.v1.y;
    var tlen = Math.hypot(tx, ty) || 1;
    tx /= tlen;
    ty /= tlen;
    var pts = clipSeg([inc.v1, inc.v2], tx, ty, ref.v1.x * tx + ref.v1.y * ty);
    if (pts.length >= 2) pts = clipSeg(pts, -tx, -ty, -(ref.v2.x * tx + ref.v2.y * ty));
    var added = 0;
    for (var k = 0; k < pts.length && added < 2; k++) {
      var p = pts[k];
      var sep = (p.x - ref.v1.x) * nrx + (p.y - ref.v1.y) * nry;
      if (sep <= 0.9) {
        out.push({ a: a, b: b, nx: nx, ny: ny, pen: Math.max(0.01, -sep), px: p.x, py: p.y });
        added++;
      }
    }
    if (!added) out.push({ a: a, b: b, nx: nx, ny: ny, pen: minPen, px: (a.x + b.x) / 2, py: (a.y + b.y) / 2 });
  }

  function circles(a, b, out) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var dist = Math.hypot(dx, dy);
    var pen = a.r + b.r - dist;
    if (pen <= 0) return;
    var nx = 1, ny = 0;
    if (dist > 1e-6) { nx = dx / dist; ny = dy / dist; }
    out.push({ a: a, b: b, nx: nx, ny: ny, pen: pen, px: a.x + nx * (a.r - pen * 0.5), py: a.y + ny * (a.r - pen * 0.5) });
  }

  function circleVsBox(circle, box, out) {
    var dx = circle.x - box.x, dy = circle.y - box.y;
    var co = Math.cos(box.angle), si = Math.sin(box.angle);
    var lx = dx * co + dy * si;
    var ly = -dx * si + dy * co;
    var cx = clamp(lx, -box.hw, box.hw);
    var cy = clamp(ly, -box.hh, box.hh);
    var ddx = lx - cx, ddy = ly - cy;
    var dist = Math.hypot(ddx, ddy);
    var nxl, nyl, pen;
    if (dist > 1e-6) {
      if (dist > circle.r) return;
      nxl = ddx / dist;
      nyl = ddy / dist;
      pen = circle.r - dist;
    } else {
      var left = box.hw - Math.abs(lx);
      var down = box.hh - Math.abs(ly);
      if (left < down) {
        nxl = lx < 0 ? -1 : 1;
        nyl = 0;
        pen = left + circle.r;
        cx = nxl > 0 ? box.hw : -box.hw;
        cy = clamp(ly, -box.hh, box.hh);
      } else {
        nxl = 0;
        nyl = ly < 0 ? -1 : 1;
        pen = down + circle.r;
        cy = nyl > 0 ? box.hh : -box.hh;
        cx = clamp(lx, -box.hw, box.hw);
      }
    }
    var nx = nxl * co - nyl * si;
    var ny = nxl * si + nyl * co;
    var px = box.x + cx * co - cy * si;
    var py = box.y + cx * si + cy * co;
    out.push({ a: circle, b: box, nx: -nx, ny: -ny, pen: pen, px: px, py: py });
  }

  function collidePair(a, b, out) {
    if (a.shape === 'circle' && b.shape === 'circle') return circles(a, b, out);
    if (a.shape === 'circle' && b.shape === 'box') return circleVsBox(a, b, out);
    if (a.shape === 'box' && b.shape === 'circle') return circleVsBox(b, a, out);
    return boxes(a, b, out);
  }

  function collect() {
    var out = [];
    var n = bodies.length;
    for (var i = 0; i < n; i++) {
      var a = bodies[i];
      if (a.dead) continue;
      for (var j = i + 1; j < n; j++) {
        var b = bodies[j];
        if (b.dead) continue;
        if (a.static && b.static) continue;
        var aLive = !a.static && a.awake;
        var bLive = !b.static && b.awake;
        if (!aLive && !bLive) continue;
        if (!aabbHit(a, b)) continue;
        collidePair(a, b, out);
      }
    }
    return out;
  }

  function applyImpulse(b, jx, jy, px, py) {
    if (!b || b.static) return;
    b.vx += jx * b.invMass;
    b.vy += jy * b.invMass;
    if (b.invI) {
      var rx = px - b.x, ry = py - b.y;
      b.av += (rx * jy - ry * jx) * b.invI;
    }
  }

  function applyPos(b, jx, jy, px, py) {
    if (!b || b.static) return;
    var rx = px - b.x, ry = py - b.y;
    b.x += jx * b.invMass;
    b.y += jy * b.invMass;
    if (b.loose && b.invI) b.angle += (rx * jy - ry * jx) * b.invI;
  }

  function noteHit(b, j) {
    if (!acceptDamage || settling || !b || b.static || b.kind === 'cat' || b.kind === 'ground' || b.kind === 'wall') return;
    b.peakJ = (b.peakJ || 0) + j;
    if (j > 8) { b.awake = true; b.still = 0; }
  }

  function solveVelocity(c) {
    var a = c.a, b = c.b;
    var nx = c.nx, ny = c.ny;
    var rax = c.px - a.x, ray = c.py - a.y;
    var rbx = c.px - b.x, rby = c.py - b.y;
    var avx = a.vx - a.av * ray;
    var avy = a.vy + a.av * rax;
    var bvx = b.vx - b.av * rby;
    var bvy = b.vy + b.av * rbx;
    var rvx = bvx - avx, rvy = bvy - avy;
    var velN = rvx * nx + rvy * ny;
    var raN = rax * ny - ray * nx;
    var rbN = rbx * ny - rby * nx;
    var inv = a.invMass + b.invMass + raN * raN * a.invI + rbN * rbN * b.invI;
    if (inv <= 1e-8) return;
    var jn = 0;
    if (velN < 0) {
      var e = Math.min(a.rest, b.rest);
      if (velN > -55) e = 0;
      jn = -(1 + e) * velN / inv;
      if (jn > 2500) jn = 2500;
      applyImpulse(a, -jn * nx, -jn * ny, c.px, c.py);
      applyImpulse(b, jn * nx, jn * ny, c.px, c.py);
      noteHit(a, jn);
      noteHit(b, jn);
    }
    avx = a.vx - a.av * ray;
    avy = a.vy + a.av * rax;
    bvx = b.vx - b.av * rby;
    bvy = b.vy + b.av * rbx;
    rvx = bvx - avx;
    rvy = bvy - avy;
    var tx = -ny, ty = nx;
    var velT = rvx * tx + rvy * ty;
    var jt = -velT / inv;
    var mu = Math.sqrt(Math.max(0, a.fric * b.fric));
    var jFriction = jn;
    if (jFriction < 28 && c.pen > 0.15) jFriction = 28;
    var maxF = mu * jFriction;
    if (jt > maxF) jt = maxF;
    else if (jt < -maxF) jt = -maxF;
    applyImpulse(a, -jt * tx, -jt * ty, c.px, c.py);
    applyImpulse(b, jt * tx, jt * ty, c.px, c.py);
  }

  function solvePosition(c) {
    var a = c.a, b = c.b;
    var rax = c.px - a.x, ray = c.py - a.y;
    var rbx = c.px - b.x, rby = c.py - b.y;
    var raN = rax * c.ny - ray * c.nx;
    var rbN = rbx * c.ny - rby * c.nx;
    var inv = a.invMass + b.invMass + raN * raN * a.invI + rbN * rbN * b.invI;
    if (inv <= 1e-8) return;
    var pen = Math.min(c.pen, 24);
    var corr = Math.max(pen - 0.7, 0) * 0.62 / inv;
    if (corr > 80) corr = 80;
    applyPos(a, -corr * c.nx, -corr * c.ny, c.px, c.py);
    applyPos(b, corr * c.nx, corr * c.ny, c.px, c.py);
  }

  function wakeNear(dead) {
    var db = boundsOf(dead);
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b === dead || b.static || b.dead) continue;
      var bb = boundsOf(b);
      var xOverlap = bb.l < db.r + 10 && bb.r > db.l - 10;
      var nearY = bb.b >= db.t - 12 && bb.t <= db.b + 12;
      if (xOverlap && nearY) {
        b.awake = true;
        b.still = 0;
      }
    }
  }

  function wakeFloating() {
    if (settling) return;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.static || b.dead || b.awake || b.isActive) continue;
      var bb = boundsOf(b);
      if (bb.b >= GROUND - 4) continue;
      var supported = false;
      for (var j = 0; j < bodies.length; j++) {
        var o = bodies[j];
        if (o === b || o.dead) continue;
        var ob = boundsOf(o);
        var xOverlap = bb.l < ob.r - 1 && bb.r > ob.l + 1;
        if (xOverlap && bb.b >= ob.t - 3 && bb.b <= ob.t + 10) {
          supported = true;
          break;
        }
      }
      if (!supported) {
        b.awake = true;
        b.still = 0;
      }
    }
  }

  function loosen(b) {
    if (!acceptDamage || settling || !b || b.static || b.kind === 'cat' || b.loose) return;
    if (b.kind === 'ground' || b.kind === 'wall') return;
    b.loose = true;
    b.invI = b.baseInvI;
    b.awake = true;
    b.still = 0;
  }

  function burst(x, y, color) {
    if (reduceMotion) return;
    for (var i = 0; i < 7; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = 30 + Math.random() * 110;
      particles.push({
        x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20,
        life: 0.45 + Math.random() * 0.2, max: 0.65, color: color, r: 1.6 + Math.random() * 2.2
      });
    }
  }

  function floater(x, y, text) {
    floaters.push({ x: x, y: y, text: text, life: 0.8 });
  }

  function scoreFor(b) {
    if (b.target) return 500;
    if (b.kind === 'stone') return 70;
    if (b.kind === 'wood') return 40;
    return 25;
  }

  function chipColor(kind) {
    if (kind === 'vacuum') return '#8E949A';
    if (kind === 'statue' || kind === 'stone') return '#B7B2AC';
    if (kind === 'pest' || kind === 'card') return '#E4C79A';
    return '#D2A56E';
  }

  function hurt(b, amount) {
    if (!acceptDamage || !b || b.dead || b.static || b.kind === 'cat' || b.kind === 'ground' || b.kind === 'wall') return;
    b.hp -= amount;
    b.awake = true;
    loosen(b);
    if (b.hp > 0) return;
    b.dead = true;
    wakeNear(b);
    var pts = scoreFor(b);
    score += pts;
    floater(b.x, b.y - 16, '+' + pts);
    burst(b.x, b.y, chipColor(b.kind));
    beep(b.target ? 520 : 140, 0.09, 'triangle', 0.045);
    recentHits.push({ kind: b.kind, hp: 0, dmg: Math.round(amount) });
    if (recentHits.length > 10) recentHits.shift();
  }

  function flushHits() {
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      var j = b.peakJ || 0;
      b.peakJ = 0;
      if (!acceptDamage || settling || j <= 0) continue;
      if (b.static || b.kind === 'cat') continue;
      if (j > 90) loosen(b);
      if (j > IMPACT_J) {
        var dmg = Math.min(120, (j - IMPACT_J) * IMPACT_SCALE);
        recentHits.push({ kind: b.kind, j: Math.round(j), dmg: Math.round(dmg) });
        if (recentHits.length > 10) recentHits.shift();
        hurt(b, dmg);
      }
    }
  }

  function integrate(dt) {
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.static || !b.awake || b.dead) continue;
      b.vy += GRAV * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.loose) b.angle += b.av * dt;
      else { b.angle = 0; b.av = 0; }
      b.av *= Math.exp(-0.9 * dt);
      var sp = Math.hypot(b.vx, b.vy);
      if (sp > 980) { b.vx *= 980 / sp; b.vy *= 980 / sp; }
      if (b.av > 14) b.av = 14;
      if (b.av < -14) b.av = -14;
    }
  }

  function sleepCheck(dt) {
    if (settling) return;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.static || b.dead || b.isActive) continue;
      var sp = Math.hypot(b.vx, b.vy);
      if (sp < 10 && Math.abs(b.av) < 0.45) b.still += dt;
      else { b.still = 0; b.awake = true; }
      if (b.still > 0.45) {
        b.awake = false;
        b.vx = 0;
        b.vy = 0;
        b.av = 0;
        if (!b.loose) b.angle = 0;
      }
    }
  }

  function solve(dt) {
    if (cat && cat.isActive) cat.awake = true;
    integrate(dt);
    var contacts = collect();
    for (var i = 0; i < 7; i++) {
      for (var k = 0; k < contacts.length; k++) solveVelocity(contacts[k]);
    }
    flushHits();
    for (var p = 0; p < 3; p++) {
      contacts = collect();
      for (var n = 0; n < contacts.length; n++) solvePosition(contacts[n]);
    }
    for (var s = 0; s < bodies.length; s++) {
      var body = bodies[s];
      if (!body.loose && !body.static) { body.angle = 0; body.av = 0; }
    }
    sleepCheck(dt);
    wakeFloating();
  }

  function reap() {
    for (var i = bodies.length - 1; i >= 0; i--) if (bodies[i].dead) bodies.splice(i, 1);
  }

  function targetsLeft() {
    var n = 0;
    for (var i = 0; i < bodies.length; i++) if (bodies[i].target && !bodies[i].dead) n++;
    return n;
  }

  function worldStill() {
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.static || b.dead) continue;
      if (b.awake && (Math.hypot(b.vx, b.vy) > 14 || Math.abs(b.av) > 0.5)) return false;
    }
    return true;
  }

  function freeze() {
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.static) continue;
      b.vx = 0;
      b.vy = 0;
      b.av = 0;
      b.awake = false;
      b.still = 1;
      b.peakJ = 0;
      if (!b.loose) b.angle = 0;
    }
  }

  function laserDamageFor(kind) {
    if (kind === 'stone') return 22;
    if (kind === 'statue') return 36;
    if (kind === 'wood') return 46;
    return 70;
  }

  function rayCircle(b, ox, oy, dx, dy) {
    var lx = ox - b.x, ly = oy - b.y;
    var bb = lx * dx + ly * dy;
    var c = lx * lx + ly * ly - b.r * b.r;
    var disc = bb * bb - c;
    if (disc < 0) return null;
    var s = Math.sqrt(disc);
    var t = -bb - s;
    if (t < 0) t = -bb + s;
    if (t < 0) return null;
    return t;
  }

  function rayBox(b, ox, oy, dx, dy) {
    var co = Math.cos(b.angle), si = Math.sin(b.angle);
    var lx = ox - b.x, ly = oy - b.y;
    var oLx = lx * co + ly * si;
    var oLy = -lx * si + ly * co;
    var dLx = dx * co + dy * si;
    var dLy = -dx * si + dy * co;
    var tmin = -1e9, tmax = 1e9;
    function slab(o, d, minB, maxB) {
      if (Math.abs(d) < 1e-8) return o >= minB && o <= maxB;
      var t1 = (minB - o) / d;
      var t2 = (maxB - o) / d;
      if (t1 > t2) { var tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      return tmin <= tmax;
    }
    if (!slab(oLx, dLx, -b.hw, b.hw)) return null;
    if (!slab(oLy, dLy, -b.hh, b.hh)) return null;
    if (tmax < 0) return null;
    var t = tmin >= 0 ? tmin : 0;
    return t;
  }

  function raycast(x, y, dx, dy, maxDist, ignore) {
    var best = null;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b === ignore || b.dead || b.kind === 'wall') continue;
      var t = b.shape === 'circle' ? rayCircle(b, x, y, dx, dy) : rayBox(b, x, y, dx, dy);
      if (t === null || t < 0 || t > maxDist) continue;
      if (!best || t < best.t) best = { t: t, body: b, x: x + dx * t, y: y + dy * t };
    }
    return best;
  }

  function faceAngleOf(c) {
    if (!c) return 0;
    if (c.isActive && aimSet) return aimAngle;
    var sp = Math.hypot(c.vx, c.vy);
    if (sp > 40) return Math.atan2(c.vy, c.vx);
    return c.lastFace || 0;
  }

  function fireLaser() {
    if (mode !== 'play' || phase !== 'flight' || !cat || cat.laserUsed) return false;
    cat.laserUsed = true;
    var ang = aimSet ? aimAngle : faceAngleOf(cat);
    aimAngle = ang;
    var dx = Math.cos(ang), dy = Math.sin(ang);
    var x = cat.x + dx * (cat.r + 2);
    var y = cat.y + dy * (cat.r * 0.15);
    var left = 270;
    var endX = x + dx * left, endY = y + dy * left;
    var guard = 0;
    while (left > 6 && guard < 4) {
      guard++;
      var hit = raycast(x, y, dx, dy, left, cat);
      if (!hit) break;
      endX = hit.x;
      endY = hit.y;
      if (hit.body.kind === 'ground' || hit.body.kind === 'wall') break;
      loosen(hit.body);
      applyImpulse(hit.body, dx * 360, dy * 360, hit.x, hit.y);
      hit.body.awake = true;
      hit.body.still = 0;
      hurt(hit.body, laserDamageFor(hit.body.kind));
      if (!hit.body.dead) break;
      var adv = hit.t + 5;
      if (adv >= left) break;
      x += dx * adv;
      y += dy * adv;
      left -= adv;
    }
    beam = { x1: cat.x + dx * (cat.r * 0.2), y1: cat.y + dy * (cat.r * 0.05), x2: endX, y2: endY, life: 0.2, max: 0.2, ang: ang };
    beep(760, 0.07, 'square', 0.03);
    syncHUD();
    return true;
  }

  function coatIndexReady() {
    return LEVELS[levelIndex].cats - stock;
  }

  function spawnFlyingCat(x, y, vx, vy, coat) {
    var b = makeCircle(x, y, 16, MAT.cat);
    b.vx = vx;
    b.vy = vy;
    b.awake = true;
    b.loose = true;
    b.invI = b.baseInvI;
    b.isActive = true;
    b.laserUsed = false;
    b.coat = coat;
    b.lastFace = Math.atan2(vy, vx);
    bodies.push(b);
    cat = b;
    phase = 'flight';
    flightT = 0;
    calm = 0;
    aimSet = false;
    aimAngle = b.lastFace;
    pull.x = 0;
    pull.y = 0;
    beep(190, 0.1, 'sine', 0.05);
    syncHUD();
  }

  function launchVelocity(vx, vy) {
    if (mode !== 'play' || phase !== 'ready' || stock <= 0) return false;
    var sp = Math.hypot(vx, vy);
    if (sp < 70) { pull.x = 0; pull.y = 0; return false; }
    var max = PULL_MAX * POWER;
    if (sp > max) { vx *= max / sp; vy *= max / sp; }
    var coat = COATS[coatIndexReady() % COATS.length];
    stock -= 1;
    hasDragged = true;
    spawnFlyingCat(SLING.x, SLING.y, vx, vy, coat);
    return true;
  }

  function tryLaunch() {
    return launchVelocity(-pull.x * POWER, -pull.y * POWER);
  }

  function setPullFrom(wx, wy) {
    var dx = wx - SLING.x;
    var dy = wy - SLING.y;
    if (dx > 36) dx = 36;
    var len = Math.hypot(dx, dy);
    if (len > PULL_MAX) {
      dx = dx / len * PULL_MAX;
      dy = dy / len * PULL_MAX;
    }
    pull.x = dx;
    pull.y = dy;
  }

  function setAim(wx, wy) {
    if (!cat) return;
    aimAngle = Math.atan2(wy - cat.y, wx - cat.x);
    aimSet = true;
    cat.lastFace = aimAngle;
  }

  function endFlight() {
    if (cat) {
      cat.isActive = false;
      cat.lastFace = faceAngleOf(cat);
    }
    cat = null;
    phase = 'gap';
    gapT = 0.42;
    syncHUD();
  }

  function afterGap() {
    if (mode !== 'play') return;
    if (targetsLeft() === 0 || clearArmed) { phase = 'empty'; return; }
    if (stock > 0) phase = 'ready';
    else { phase = 'empty'; emptyT = 0; }
    syncHUD();
  }

  function starCount() {
    var total = LEVELS[levelIndex].cats;
    var used = total - stock;
    if (used <= 1) return 3;
    if (stock >= 1) return 2;
    return 1;
  }

  function starsGlyph(n) {
    return (n >= 1 ? '★' : '☆') + (n >= 2 ? '★' : '☆') + (n >= 3 ? '★' : '☆');
  }

  function openClear() {
    if (mode !== 'play') return;
    levelStars = starCount();
    totalStars += levelStars;
    score += levelStars * 100;
    phase = 'done';
    if (cat) cat.isActive = false;
    mode = levelIndex >= LEVELS.length - 1 ? 'win' : 'clear';
    beep(523, 0.08, 'sine', 0.04);
    setTimeout(function () { beep(659, 0.1, 'sine', 0.04); }, 90);
    sync(true);
  }

  function buildLevel(index) {
    levelIndex = index;
    bodies = [];
    particles = [];
    floaters = [];
    beam = null;
    cat = null;
    recentHits = [];
    stock = LEVELS[index].cats;
    phase = 'ready';
    pull.x = 0;
    pull.y = 0;
    dragging = false;
    lasering = false;
    aimSet = false;
    aimAngle = 0;
    clearArmed = false;
    clearDelay = 0;
    emptyT = 0;
    flightT = 0;
    calm = 0;
    gapT = 0;
    hasDragged = false;
    addBounds();
    settling = true;
    acceptDamage = false;
    LEVELS[index].build();
    for (var i = 0; i < 180; i++) solve(1 / 120);
    settling = false;
    freeze();
    acceptDamage = true;
    scoreMark = score;
    starsMark = totalStars;
    camX = 0;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function cardHTML() {
    var level = LEVELS[levelIndex];
    if (mode === 'play') return '';
    if (mode === 'title') {
      return '<div class="lc-card"><p class="kicker">Cat\'s Meow Cat Rescue</p><h2>Ready, Pepper?</h2><p>Drag the sling, launch a foster cat, and clear the yard. Once they are flying, fire a short laser from their eyes.</p><button type="button" class="btn btn--pri" data-act="start">Start</button><p class="fine">Drag back and let go. Space or Laser eyes fires the beam. Four short yards.</p></div>';
    }
    if (mode === 'clear') {
      var next = LEVELS[levelIndex + 1] ? LEVELS[levelIndex + 1].name : '';
      return '<div class="lc-card"><p class="kicker">' + esc(level.name) + '</p><h2>Yard clear</h2><p class="lc-stars" aria-label="' + levelStars + ' stars">' + starsGlyph(levelStars) + '</p><p class="lc-scoreline">Score ' + score + '</p><p>Next yard: ' + esc(next) + '.</p><button type="button" class="btn btn--pri" data-act="next">Next yard</button></div>';
    }
    if (mode === 'win') {
      return '<div class="lc-card"><p class="kicker">Cat\'s Meow Cat Rescue</p><h2>The yard is clear</h2><p class="lc-scoreline">Score ' + score + ' · Stars ' + totalStars + ' of 12</p><p>That cleared-yard feeling is what foster cats are waiting on. Whenever you want the real thing:</p><div class="lc-grid"><a class="btn btn--outline" href="' + ADOPT + '" target="_blank" rel="noopener">Adopt</a><a class="btn btn--outline" href="' + esc(FOSTER) + '" target="_blank" rel="noopener">Foster</a><a class="btn btn--gold" href="' + DONATE + '">Donate</a><button type="button" class="btn btn--pri" data-act="again">Play again</button></div></div>';
    }
    return '<div class="lc-card"><p class="kicker">Cat\'s Meow Cat Rescue</p><h2>Out of cats</h2><p class="lc-scoreline">Score ' + score + '</p><p>The pests are still standing. The sling will still be there.</p><div class="lc-grid"><button type="button" class="btn btn--pri" data-act="again">Play again</button><a class="btn btn--outline" href="' + ADOPT + '" target="_blank" rel="noopener">Adopt</a><a class="btn btn--outline" href="' + esc(FOSTER) + '" target="_blank" rel="noopener">Foster</a><a class="btn btn--gold" href="' + DONATE + '">Donate</a></div></div>';
  }

  function liveText() {
    if (mode === 'title') return 'Laser Cats ready. Start to play.';
    if (mode === 'clear') return 'Yard clear. Score ' + score + '.';
    if (mode === 'win') return 'All yards clear. Score ' + score + '. Stars ' + totalStars + ' of 12.';
    if (mode === 'over') return 'Out of cats. Score ' + score + '.';
    return LEVELS[levelIndex].name + '. Score ' + score + '. Cats ' + stock + '.';
  }

  function sync(force) {
    if (!overlay) return;
    if (force || paintedMode !== mode) {
      paintedMode = mode;
      overlay.hidden = mode === 'play';
      hud.hidden = mode !== 'play';
      if (laserBtn) laserBtn.parentElement.classList.toggle('is-off', mode !== 'play');
      overlay.innerHTML = cardHTML();
      if (liveEl) liveEl.textContent = liveText();
    }
    syncHUD();
  }

  function syncHUD() {
    if (scoreEl) scoreEl.textContent = String(score);
    if (levelEl) levelEl.textContent = LEVELS[levelIndex].name + ' · ' + (levelIndex + 1) + ' of ' + LEVELS.length;
    if (catsEl) {
      var total = LEVELS[levelIndex].cats;
      var shown = stock + (phase === 'flight' && cat ? 1 : 0);
      if (catsEl.getAttribute('data-n') !== String(shown) + ':' + total) {
        catsEl.setAttribute('data-n', shown + ':' + total);
        var html = '';
        for (var i = 0; i < total; i++) html += '<i class="' + (i < shown ? 'on' : '') + '"></i>';
        catsEl.innerHTML = html;
      }
      catsEl.setAttribute('aria-label', shown + (shown === 1 ? ' cat left' : ' cats left'));
    }
    if (laserBtn) {
      var ready = phase === 'flight' && cat && !cat.laserUsed;
      laserBtn.classList.toggle('is-ready', !!ready);
      laserBtn.setAttribute('aria-disabled', ready ? 'false' : 'true');
    }
  }

  function startGame() {
    unlockAudio();
    score = 0;
    totalStars = 0;
    levelStars = 0;
    buildLevel(0);
    mode = 'play';
    paintedMode = '';
    sync(true);
    if (canvas) canvas.focus({ preventScroll: true });
  }

  function restartLevel() {
    unlockAudio();
    score = scoreMark;
    totalStars = starsMark;
    buildLevel(levelIndex);
    mode = 'play';
    paintedMode = '';
    sync(true);
    if (canvas) canvas.focus({ preventScroll: true });
  }

  function nextLevel() {
    unlockAudio();
    if (levelIndex >= LEVELS.length - 1) {
      mode = 'win';
      sync(true);
      return;
    }
    levelIndex += 1;
    buildLevel(levelIndex);
    mode = 'play';
    paintedMode = '';
    sync(true);
    if (canvas) canvas.focus({ preventScroll: true });
  }

  function tick(dt) {
    clock += dt;
    if (mode !== 'play') return;
    solve(dt);
    reap();
    if (beam) {
      beam.life -= dt;
      if (beam.life <= 0) beam = null;
    }
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt;
      p.vy += GRAV * 0.35 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (var f = floaters.length - 1; f >= 0; f--) {
      floaters[f].life -= dt;
      floaters[f].y -= 18 * dt;
      if (floaters[f].life <= 0) floaters.splice(f, 1);
    }
    if (phase === 'flight' && cat) {
      flightT += dt;
      var sp = Math.hypot(cat.vx, cat.vy);
      if (sp < 24 && Math.abs(cat.av) < 1) calm += dt;
      else calm = 0;
      if (!cat.lastFace || sp > 40) cat.lastFace = Math.atan2(cat.vy, cat.vx);
      if (calm > 1.05 || flightT > 8 || cat.y > WORLD_H + 60 || cat.x > WORLD_W + 40 || cat.x < -80) endFlight();
    }
    if (phase === 'gap') {
      gapT -= dt;
      if (gapT <= 0) afterGap();
    }
    if (mode === 'play' && !clearArmed && targetsLeft() === 0) {
      clearArmed = true;
      clearDelay = 0.8;
    }
    if (clearDelay > 0) {
      clearDelay -= dt;
      if (clearDelay <= 0) openClear();
    }
    if (phase === 'empty' && stock === 0 && !cat && !clearArmed && targetsLeft() > 0) {
      if (worldStill()) {
        emptyT += dt;
        if (emptyT > 0.55) {
          mode = 'over';
          sync(true);
        }
      } else emptyT = 0;
    } else emptyT = 0;
    syncHUD();
  }

  function updateCam(dt) {
    var focus = (phase === 'flight' && cat) ? cat.x : (SLING.x + 250);
    var desired = focus - view.w * 0.3;
    var max = Math.max(0, WORLD_W - view.w);
    desired = clamp(desired, 0, max);
    var k = 1 - Math.exp(-3.4 * Math.max(0.016, dt));
    camX += (desired - camX) * k;
  }

  function fit() {
    if (!frame || !canvas) return;
    var rect = frame.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var cssW = Math.max(1, rect.width);
    var cssH = Math.max(1, rect.height);
    var bw = Math.round(cssW * dpr);
    var bh = Math.round(cssH * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    view.dpr = dpr;
    view.cssW = cssW;
    view.cssH = cssH;
    view.scale = cssH / WORLD_H;
    view.w = cssW / view.scale;
  }

  function worldFromEvent(e) {
    var rect = canvas.getBoundingClientRect();
    var sx = (e.clientX - rect.left) / Math.max(1, rect.width);
    var sy = (e.clientY - rect.top) / Math.max(1, rect.height);
    return { x: camX + sx * view.w, y: sy * WORLD_H };
  }

  function drawCat(x, y, facing, r, coat, glow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(facing);
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(coat);
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 0.75);
    ctx.lineTo(-r * 0.05, -r * 1.35);
    ctx.lineTo(r * 0.22, -r * 0.62);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.15, -r * 0.7);
    ctx.lineTo(r * 0.55, -r * 1.32);
    ctx.lineTo(r * 0.72, -r * 0.45);
    ctx.fill();
    ctx.fillStyle = '#F3B7C0';
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, -r * 0.78);
    ctx.lineTo(-r * 0.02, -r * 1.12);
    ctx.lineTo(r * 0.12, -r * 0.7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.28, -r * 0.68);
    ctx.lineTo(r * 0.48, -r * 1.08);
    ctx.lineTo(r * 0.58, -r * 0.52);
    ctx.fill();
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, r * 0.15);
    ctx.quadraticCurveTo(-r * 1.55, -r * 0.2, -r * 1.15, -r * 0.85);
    ctx.quadraticCurveTo(-r * 0.7, -r * 0.2, -r * 0.7, r * 0.25);
    ctx.fill();
    ctx.fillStyle = '#FFF6EE';
    ctx.beginPath();
    ctx.ellipse(r * 0.45, r * 0.05, r * 0.38, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = glow ? '#FF3B2F' : '#E23A32';
    ctx.beginPath();
    ctx.ellipse(r * 0.22, -r * 0.18, r * 0.13, r * 0.16, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.58, -r * 0.16, r * 0.13, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    if (glow) {
      ctx.fillStyle = 'rgba(255,220,80,0.9)';
      ctx.beginPath();
      ctx.arc(r * 0.22, -r * 0.18, r * 0.05, 0, Math.PI * 2);
      ctx.arc(r * 0.58, -r * 0.16, r * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#E07A8C';
    ctx.beginPath();
    ctx.moveTo(r * 0.95, 0.02 * r);
    ctx.lineTo(r * 0.78, r * 0.12);
    ctx.lineTo(r * 0.95, r * 0.2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(45,24,16,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.02);
    ctx.lineTo(r * 1.15, -r * 0.12);
    ctx.moveTo(r * 0.72, r * 0.12);
    ctx.lineTo(r * 1.18, r * 0.14);
    ctx.stroke();
    ctx.fillStyle = '#B22222';
    ctx.fillRect(-r * 0.15, r * 0.22, r * 0.7, r * 0.16);
    ctx.fillStyle = '#D4A017';
    ctx.beginPath();
    ctx.arc(r * 0.22, r * 0.42, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function shade(hex) {
    if (hex === '#3C2C2A') return '#2A1E1C';
    if (hex === '#B7B3AE') return '#9A9691';
    if (hex === '#F3D7B5') return '#E2C19A';
    return '#C56A28';
  }

  function drawBoxBody(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    var cracked = b.hp < b.maxHp * 0.72;
    if (b.kind === 'stone') {
      ctx.fillStyle = '#8E8A86';
      ctx.fillRect(-b.hw, -b.hh, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(-b.hw + 3, -b.hh + 3, b.w * 0.35, 4);
    } else if (b.kind === 'card' || b.kind === 'pest') {
      ctx.fillStyle = b.kind === 'pest' ? '#E7C99A' : '#DEB67A';
      ctx.fillRect(-b.hw, -b.hh, b.w, b.h);
      ctx.strokeStyle = 'rgba(90,58,28,0.35)';
      ctx.strokeRect(-b.hw + 1, -b.hh + 1, b.w - 2, b.h - 2);
    } else if (b.kind === 'statue') {
      ctx.fillStyle = '#A7A29C';
      ctx.fillRect(-b.hw, -b.hh, b.w, b.h);
      ctx.fillStyle = '#8E8984';
      ctx.beginPath();
      ctx.moveTo(-b.hw * 0.45, -b.hh);
      ctx.lineTo(-b.hw * 0.15, -b.hh - b.hh * 0.45);
      ctx.lineTo(b.hw * 0.05, -b.hh);
      ctx.moveTo(b.hw * 0.1, -b.hh);
      ctx.lineTo(b.hw * 0.4, -b.hh - b.hh * 0.42);
      ctx.lineTo(b.hw * 0.62, -b.hh);
      ctx.fill();
      ctx.fillStyle = '#5C574F';
      ctx.fillRect(b.hw * 0.15, -b.hh * 0.15, b.hw * 0.7, b.hh * 0.22);
    } else {
      ctx.fillStyle = '#C4956A';
      ctx.fillRect(-b.hw, -b.hh, b.w, b.h);
      ctx.strokeStyle = 'rgba(90,52,24,0.28)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (b.w >= b.h) {
        ctx.moveTo(-b.hw + 4, -b.hh * 0.2);
        ctx.lineTo(b.hw - 4, -b.hh * 0.2);
        ctx.moveTo(-b.hw + 4, b.hh * 0.35);
        ctx.lineTo(b.hw - 4, b.hh * 0.35);
      } else {
        ctx.moveTo(-b.hw * 0.2, -b.hh + 4);
        ctx.lineTo(-b.hw * 0.2, b.hh - 4);
      }
      ctx.stroke();
    }
    if (cracked) {
      ctx.strokeStyle = 'rgba(45,24,16,0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-b.hw * 0.3, -b.hh * 0.4);
      ctx.lineTo(b.hw * 0.1, b.hh * 0.05);
      ctx.lineTo(-b.hw * 0.05, b.hh * 0.55);
      ctx.stroke();
    }
    if (b.kind === 'pest') {
      ctx.fillStyle = '#2D1810';
      ctx.beginPath();
      ctx.arc(-b.hw * 0.25, -b.hh * 0.15, 2.2, 0, Math.PI * 2);
      ctx.arc(b.hw * 0.28, -b.hh * 0.12, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2D1810';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-b.hw * 0.2, b.hh * 0.28);
      ctx.quadraticCurveTo(0, b.hh * 0.05, b.hw * 0.28, b.hh * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawVacuum(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle * 0.4);
    ctx.fillStyle = '#6E7378';
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4E5358';
    ctx.fillRect(-b.r * 0.2, -b.r * 0.95, b.r * 0.45, b.r * 0.7);
    ctx.strokeStyle = '#3E4348';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-b.r * 0.2, b.r * 0.1, b.r * 0.85, 0.4, 2.4);
    ctx.stroke();
    ctx.fillStyle = b.hp < b.maxHp ? '#888' : '#C23B3B';
    ctx.beginPath();
    ctx.arc(b.r * 0.25, -b.r * 0.2, b.r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSling() {
    var pouchX = SLING.x + (phase === 'ready' ? pull.x : 0);
    var pouchY = SLING.y + (phase === 'ready' ? pull.y : 0);
    var tipL = { x: SLING.x - 26, y: SLING.y - 20 };
    var tipR = { x: SLING.x + 30, y: SLING.y - 6 };
    ctx.strokeStyle = '#6B3A24';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(SLING.x + 2, GROUND);
    ctx.lineTo(SLING.x + 2, SLING.y + 28);
    ctx.lineTo(tipL.x, tipL.y);
    ctx.moveTo(SLING.x + 2, SLING.y + 28);
    ctx.lineTo(tipR.x, tipR.y);
    ctx.stroke();
    ctx.strokeStyle = '#8C4A2F';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tipL.x, tipL.y);
    ctx.lineTo(pouchX, pouchY);
    ctx.moveTo(tipR.x, tipR.y);
    ctx.lineTo(pouchX, pouchY);
    ctx.stroke();
    if (phase === 'ready' && mode === 'play') {
      var facing = Math.hypot(pull.x, pull.y) > 6 ? Math.atan2(-pull.y, -pull.x) : 0;
      var idx = coatIndexReady();
      drawCat(pouchX, pouchY, facing, 16, COATS[idx % COATS.length], false);
    }
  }

  function drawWaiting() {
    var total = LEVELS[levelIndex].cats;
    var start = phase === 'ready' ? (total - stock + 1) : (total - stock);
    var count = phase === 'ready' ? Math.max(0, stock - 1) : (phase === 'flight' || phase === 'gap' ? stock : 0);
    for (var i = 0; i < count; i++) {
      drawCat(SLING.x - 62 - i * 30, GROUND - 14, 0, 11, COATS[(start + i) % COATS.length], false);
    }
  }

  function drawTrajectory() {
    if (phase !== 'ready' || !dragging) return;
    if (Math.hypot(pull.x, pull.y) < 12) return;
    var vx = -pull.x * POWER;
    var vy = -pull.y * POWER;
    var x = SLING.x + pull.x;
    var y = SLING.y + pull.y;
    for (var i = 0; i < 14; i++) {
      vy += GRAV * 0.055;
      x += vx * 0.055;
      y += vy * 0.055;
      if (y > GROUND - 4) break;
      ctx.fillStyle = 'rgba(45,24,16,' + (0.4 - i * 0.02) + ')';
      ctx.beginPath();
      ctx.arc(x, y, 3.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBeam() {
    if (!beam) return;
    var t = Math.max(0, beam.life / beam.max);
    var ang = beam.ang;
    var px = -Math.sin(ang), py = Math.cos(ang);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,60,48,' + (0.85 * t) + ')';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(beam.x1 + px * 5, beam.y1 + py * 5);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.moveTo(beam.x1 - px * 5, beam.y1 - py * 5);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,120,' + (0.7 * t) + ')';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
    ctx.restore();
  }

  function drawAimPreview() {
    if (mode !== 'play' || phase !== 'flight' || !cat || cat.laserUsed) return;
    var ang = aimSet ? aimAngle : faceAngleOf(cat);
    var dx = Math.cos(ang), dy = Math.sin(ang);
    ctx.save();
    ctx.strokeStyle = 'rgba(178,34,34,0.45)';
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cat.x + dx * 18, cat.y + dy * 18);
    ctx.lineTo(cat.x + dx * 78, cat.y + dy * 78);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    if (!ctx) return;
    fit();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (view.cssH < 20 || view.scale <= 0) return;
    var s = view.dpr * view.scale;
    ctx.setTransform(s, 0, 0, s, -camX * s, 0);
    var sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#F6E7D4');
    sky.addColorStop(1, '#D5E6EA');
    ctx.fillStyle = sky;
    ctx.fillRect(camX - 20, -40, view.w + 40, WORLD_H + 80);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(280, 78, 46, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(520, 110, 60, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(980, 70, 50, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E7D3BE';
    ctx.beginPath();
    ctx.ellipse(860, GROUND + 8, 280, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#C6A37A';
    ctx.fillRect(-40, GROUND, WORLD_W + 80, WORLD_H - GROUND + 40);
    ctx.fillStyle = '#8EA36A';
    ctx.fillRect(-40, GROUND - 8, WORLD_W + 80, 14);
    drawWaiting();
    drawSling();
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.kind === 'ground' || b.kind === 'wall' || b.kind === 'cat') continue;
      if (b.kind === 'vacuum') drawVacuum(b);
      else drawBoxBody(b);
    }
    for (var c = 0; c < bodies.length; c++) {
      var cb = bodies[c];
      if (cb.kind !== 'cat') continue;
      var face = cb.isActive ? faceAngleOf(cb) : (cb.lastFace || 0);
      drawCat(cb.x, cb.y, face, cb.r, cb.coat, cb.isActive && !cb.laserUsed);
    }
    drawTrajectory();
    drawAimPreview();
    drawBeam();
    for (var p = 0; p < particles.length; p++) {
      var part = particles[p];
      ctx.globalAlpha = Math.max(0, part.life / part.max);
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#B22222';
    ctx.font = '700 18px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    for (var fl = 0; fl < floaters.length; fl++) {
      ctx.globalAlpha = Math.max(0, floaters[fl].life / 0.8);
      ctx.fillText(floaters[fl].text, floaters[fl].x, floaters[fl].y);
      ctx.globalAlpha = 1;
    }
    if (mode === 'play' && phase === 'ready' && !hasDragged) {
      ctx.fillStyle = 'rgba(45,24,16,0.75)';
      ctx.font = '700 20px Fredoka, sans-serif';
      ctx.fillText('Drag back', SLING.x + 10, SLING.y - 78);
    }
    if (mode === 'play' && phase === 'ready') {
      var nm = NAMES[coatIndexReady() % NAMES.length];
      ctx.fillStyle = '#2D1810';
      ctx.font = '700 15px Fredoka, sans-serif';
      ctx.fillText(nm, SLING.x + (pull.x || 0), SLING.y + (pull.y || 0) + 28);
    }
  }

  function frameLoop(now) {
    var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0;
    lastT = now;
    acc += dt;
    var steps = 0;
    while (acc >= STEP && steps < 5) {
      acc -= STEP;
      steps++;
      tick(STEP);
    }
    if (steps === 5) acc = 0;
    updateCam(dt || 0.016);
    draw();
    requestAnimationFrame(frameLoop);
  }

  function typingOrSearch() {
    var search = document.getElementById('site-search');
    if (search && search.classList.contains('is-open')) return true;
    var ae = document.activeElement;
    if (!ae) return false;
    var tag = ae.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || ae.isContentEditable;
  }

  function keysOk() {
    if (typingOrSearch()) return false;
    var ae = document.activeElement;
    if (!ae || ae === document.body || ae === document.documentElement || ae === canvas) return true;
    if (ae.id === 'lc-laser' || ae.id === 'lc-sound' || ae.id === 'lc-restart') return true;
    return false;
  }

  function unlockAudio() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (err) { audioCtx = null; }
  }

  function beep(freq, dur, type, gain) {
    if (!soundOn || !audioCtx) return;
    try {
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.value = gain || 0.04;
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + dur);
    } catch (err) { /* ignore audio */ }
  }

  function onPointerDown(e) {
    if (mode !== 'play') return;
    if (e.button !== undefined && e.button !== 0) return;
    if (e.cancelable) e.preventDefault();
    pointerId = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    var p = worldFromEvent(e);
    if (phase === 'ready') {
      dragging = true;
      lasering = false;
      setPullFrom(p.x, p.y);
    } else if (phase === 'flight' && cat && !cat.laserUsed) {
      lasering = true;
      dragging = false;
      setAim(p.x, p.y);
    }
  }

  function onPointerMove(e) {
    if (pointerId !== null && e.pointerId !== pointerId) return;
    var p = worldFromEvent(e);
    if (dragging && phase === 'ready') setPullFrom(p.x, p.y);
    else if (lasering && phase === 'flight') setAim(p.x, p.y);
  }

  function onPointerUp(e) {
    if (pointerId !== null && e.pointerId !== undefined && e.pointerId !== pointerId) return;
    pointerId = null;
    if (dragging) {
      dragging = false;
      tryLaunch();
    } else if (lasering) {
      lasering = false;
      if (e.clientX) setAim(worldFromEvent(e).x, worldFromEvent(e).y);
      fireLaser();
    }
  }

  function onKey(e) {
    if (!keysOk()) return;
    if (e.code === 'KeyR' && mode !== 'title') {
      e.preventDefault();
      if (mode === 'win' || mode === 'over') startGame();
      else restartLevel();
      return;
    }
    if ((e.code === 'Enter' || e.code === 'Space') && mode === 'title') {
      e.preventDefault();
      startGame();
      return;
    }
    if ((e.code === 'Enter' || e.code === 'Space') && mode === 'clear') {
      e.preventDefault();
      nextLevel();
      return;
    }
    if (mode !== 'play' || phase !== 'flight' || !cat || cat.laserUsed) return;
    if (e.code === 'ArrowLeft') { aimAngle = Math.PI; aimSet = true; e.preventDefault(); }
    else if (e.code === 'ArrowRight') { aimAngle = 0; aimSet = true; e.preventDefault(); }
    else if (e.code === 'ArrowUp') { aimAngle = -Math.PI / 2; aimSet = true; e.preventDefault(); }
    else if (e.code === 'ArrowDown') { aimAngle = Math.PI / 2; aimSet = true; e.preventDefault(); }
    else if (e.code === 'Space' || e.code === 'KeyF') {
      e.preventDefault();
      fireLaser();
    }
  }

  function state() {
    var list = [];
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.kind === 'ground' || b.kind === 'wall') continue;
      list.push({
        kind: b.kind, target: !!b.target, x: Math.round(b.x), y: Math.round(b.y),
        hp: Math.round(b.hp), w: Math.round(b.w), h: Math.round(b.h), r: b.r || 0,
        angle: Math.round(b.angle * 100) / 100, loose: !!b.loose, awake: !!b.awake
      });
    }
    return {
      mode: mode,
      phase: phase,
      levelIndex: levelIndex,
      levelName: LEVELS[levelIndex].name,
      score: score,
      totalStars: totalStars,
      levelStars: levelStars,
      stock: stock,
      targets: targetsLeft(),
      laserReady: !!(phase === 'flight' && cat && !cat.laserUsed),
      sling: { x: SLING.x, y: SLING.y },
      camX: Math.round(camX),
      viewW: Math.round(view.w),
      worldH: WORLD_H,
      ground: GROUND,
      pull: { x: Math.round(pull.x), y: Math.round(pull.y) },
      cat: cat ? {
        x: Math.round(cat.x), y: Math.round(cat.y), vx: Math.round(cat.vx), vy: Math.round(cat.vy),
        laserUsed: !!cat.laserUsed, r: cat.r
      } : null,
      bodies: list,
      hits: recentHits.slice()
    };
  }

  function boot() {
    canvas = document.getElementById('laser-cats-canvas');
    frame = document.getElementById('lc-frame');
    overlay = document.getElementById('lc-overlay');
    hud = document.getElementById('lc-hud');
    scoreEl = document.getElementById('lc-score');
    levelEl = document.getElementById('lc-level');
    catsEl = document.getElementById('lc-cats');
    liveEl = document.getElementById('lc-live');
    laserBtn = document.getElementById('lc-laser');
    if (!canvas || !frame) return;
    ctx = canvas.getContext('2d');
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) reduceMotion = true;
      soundOn = sessionStorage.getItem('lasercats-sound') !== '0';
    } catch (err) { soundOn = true; }
    var soundBtn = document.getElementById('lc-sound');
    if (soundBtn) {
      soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      soundBtn.addEventListener('click', function () {
        soundOn = !soundOn;
        soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
        try { sessionStorage.setItem('lasercats-sound', soundOn ? '1' : '0'); } catch (err) { /* ignore */ }
        if (soundOn) { unlockAudio(); beep(520, 0.06, 'sine', 0.04); }
      });
    }
    var restartBtn = document.getElementById('lc-restart');
    if (restartBtn) restartBtn.addEventListener('click', function () { restartLevel(); });
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('[data-act]') : null;
        if (!btn) return;
        var act = btn.getAttribute('data-act');
        if (act === 'start' || act === 'again') startGame();
        else if (act === 'next') nextLevel();
      });
    }
    if (laserBtn) {
      var fromPointer = false;
      laserBtn.addEventListener('pointerdown', function (e) {
        if (e.cancelable) e.preventDefault();
        fromPointer = true;
        laserBtn.classList.add('is-down');
        unlockAudio();
        fireLaser();
      });
      laserBtn.addEventListener('pointerup', function () { laserBtn.classList.remove('is-down'); });
      laserBtn.addEventListener('pointercancel', function () { laserBtn.classList.remove('is-down'); });
      laserBtn.addEventListener('click', function () {
        if (fromPointer) { fromPointer = false; return; }
        unlockAudio();
        fireLaser();
      });
    }
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', fit);
    document.addEventListener('visibilitychange', function () {
      lastT = 0;
      acc = 0;
    });
    buildLevel(0);
    mode = 'title';
    score = 0;
    totalStars = 0;
    sync(true);
    fit();
    requestAnimationFrame(frameLoop);
  }

  window.LaserCats = {
    state: state,
    start: startGame,
    restart: restartLevel,
    next: nextLevel,
    launch: launchVelocity,
    fire: function (angle) {
      if (typeof angle === 'number') { aimAngle = angle; aimSet = true; }
      return fireLaser();
    },
    fast: function (seconds) {
      var n = Math.max(0, Math.round((seconds || 0) / STEP));
      for (var i = 0; i < n; i++) tick(STEP);
      syncHUD();
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
