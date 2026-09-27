/* Cat Run — original side-scroller for Cat's Meow Cat Rescue.
   No Nintendo characters, names, or assets. Drawn with canvas shapes.

   Controls
   - Run: Arrow keys or A / D. Touch: Left and Right buttons.
   - Jump: Space, W, or Up. Touch: Jump. Hold for a higher jump.
   - Hop on a dog or vacuum to stomp it, or jump over it.
   - R restarts from the first yard. Sound can be muted.
*/
(function () {
  'use strict';

  var TILE = 32;
  var GROUND_ROW = 13;
  var GROUND_Y = GROUND_ROW * TILE;
  var LEVEL_H = 15 * TILE;
  var PW = 22;
  var PH = 28;

  var GRAV = 2000;
  var JUMP = -680;
  var JUMP_CUT = -450;
  var STOMP_V = -520;
  var MAXRUN = 220;
  var ACCEL = 1700;
  var FRICTION = 2400;
  var MAXFALL = 980;
  var SINK = 0.6;

  var ADOPT = 'index.html#application';
  var DONATE = 'index.html#help';
  var FOSTER = 'https://app.sparkie.io/application?m=CAT_FOSTER&t=5fab11fbb83c8e002ea3b873';

  var LEVELS = [
    {
      name: 'Backyard Yarn',
      width: 100,
      ground: [[0, 18], [20, 38], [40, 58], [60, 78], [80, 100]],
      boxes: [[8, 12, 2], [24, 11, 4], [28, 10, 2], [46, 11, 3], [50, 10, 2], [64, 11, 3], [84, 11, 3], [88, 10, 2]],
      coins: [
        [5, 13, 'yarn'], [12, 13, 'yarn'], [9, 12, 'yarn'], [16, 13, 'yarn'],
        [25, 11, 'yarn'], [29, 10, 'fish'], [30, 13, 'yarn'], [34, 13, 'yarn'],
        [47, 11, 'yarn'], [51, 10, 'fish'], [55, 13, 'yarn'],
        [65, 11, 'yarn'], [70, 13, 'yarn'], [76, 13, 'yarn'],
        [85, 11, 'yarn'], [89, 10, 'fish'], [96, 13, 'yarn']
      ],
      foes: [['dog', 23, 36], ['vacuum', 44, 56], ['dog', 64, 76]],
      beds: [14, 21, 41, 61, 81],
      goal: 94,
      signs: []
    },
    {
      name: 'Foster Porch',
      width: 112,
      ground: [[0, 16], [18, 34], [36, 44], [52, 70], [72, 88], [90, 112]],
      boxes: [[6, 12, 2], [22, 11, 3], [26, 10, 2], [56, 11, 4], [74, 11, 3], [78, 10, 2], [96, 11, 3], [99, 10, 2]],
      raft: { x: 40, w: 5, travel: 7, speed: 0.9 },
      coins: [
        [4, 13, 'yarn'], [7, 12, 'yarn'], [12, 13, 'yarn'],
        [23, 11, 'yarn'], [27, 10, 'fish'], [30, 13, 'yarn'], [42, 13, 'yarn'],
        [57, 11, 'yarn'], [58, 11, 'fish'], [66, 13, 'yarn'],
        [75, 11, 'yarn'], [79, 10, 'fish'], [84, 13, 'yarn'],
        [97, 11, 'yarn'], [100, 10, 'fish'], [104, 13, 'yarn']
      ],
      foes: [['dog', 20, 32], ['vacuum', 56, 68], ['dog', 76, 86], ['vacuum', 94, 102]],
      beds: [14, 37, 53, 74, 92],
      goal: 108,
      signs: [{ tile: 37, text: 'Raft' }]
    }
  ];

  var canvas, ctx, frame, overlay, hud, touchEl, scoreEl, livesEl, levelEl, soundBtn, liveEl;
  var view = { dpr: 1, cssW: 960, cssH: 480, scale: 1, w: 960, h: 480 };
  var held = { left: false, right: false, jump: false };
  var jumpEdge = false;
  var mode = 'title';
  var paintedMode = '';
  var levelIndex = 0;
  var levelName = '';
  var levelWidth = 0;
  var score = 0;
  var lives = 3;
  var time = 0;
  var snapCam = true;
  var camX = 0;
  var camY = 0;
  var soundOn = true;
  var audio = null;
  var showHit = false;
  var reduce = false;

  var staticSolids = [];
  var grounds = [];
  var boxes = [];
  var gaps = [];
  var coins = [];
  var foes = [];
  var beds = [];
  var signs = [];
  var decor = [];
  var rafts = [];
  var goal = null;
  var spawn = { x: 64, y: 0 };
  var parts = [];
  var floats = [];
  var confetti = [];

  var player = {
    x: 64, y: 0, w: PW, h: PH, vx: 0, vy: 0,
    onGround: true, facing: 1, coyote: 0.12, buffer: 0,
    jumping: false, invuln: 0, stun: 0, squash: 0,
    phase: 0, groundId: null, riding: null, prevBottom: 0, dust: 0
  };

  function hash(n) {
    var x = Math.sin(n * 127.1) * 43758.5453;
    return x - Math.floor(x);
  }

  function clamp(v, a, b) {
    return v < a ? a : (v > b ? b : v);
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function storageGet(key) {
    try { return sessionStorage.getItem(key); } catch (err) { return null; }
  }
  function storageSet(key, val) {
    try { sessionStorage.setItem(key, val); } catch (err) { /* private mode */ }
  }

  function buildLevel(def) {
    staticSolids = [];
    grounds = [];
    boxes = [];
    gaps = [];
    coins = [];
    foes = [];
    beds = [];
    signs = def.signs ? def.signs.slice() : [];
    decor = [];
    rafts = [];
    parts = [];
    floats = [];

    def.ground.forEach(function (seg) {
      var solid = { x: seg[0] * TILE, y: GROUND_Y, w: (seg[1] - seg[0]) * TILE, h: LEVEL_H - GROUND_Y, kind: 'ground' };
      grounds.push(solid);
      staticSolids.push(solid);
    });
    for (var i = 0; i < grounds.length - 1; i++) {
      var left = grounds[i];
      var right = grounds[i + 1];
      var gx = left.x + left.w;
      var gw = right.x - gx;
      if (gw > 2) gaps.push({ x: gx, w: gw });
    }

    def.boxes.forEach(function (b) {
      var top = b[1] * TILE;
      var isCrate = top >= GROUND_Y - TILE;
      var solid = {
        x: b[0] * TILE,
        y: top,
        w: b[2] * TILE,
        h: isCrate ? TILE : 14,
        kind: isCrate ? 'crate' : 'shelf'
      };
      boxes.push(solid);
      staticSolids.push(solid);
    });

    def.coins.forEach(function (c) {
      var size = c[2] === 'fish' ? 18 : 16;
      coins.push({
        x: c[0] * TILE + (TILE - size) / 2,
        y: c[1] * TILE - size - 1,
        w: size,
        h: size,
        kind: c[2],
        got: false
      });
    });

    def.foes.forEach(function (f) {
      var kind = f[0];
      var w = kind === 'vacuum' ? 38 : 34;
      var h = 26;
      var minX = f[1] * TILE;
      var maxX = f[2] * TILE;
      foes.push({
        kind: kind, w: w, h: h,
        x: minX, y: GROUND_Y - h,
        minX: minX, maxX: maxX,
        vx: kind === 'vacuum' ? 112 : 76,
        alive: true, squish: 0
      });
    });

    def.beds.forEach(function (tile) {
      beds.push({
        x: tile * TILE + 2,
        y: GROUND_Y - 12,
        w: 28,
        h: 12,
        spawnX: tile * TILE + 6,
        spawnY: GROUND_Y - PH + SINK
      });
    });

    if (def.raft) {
      rafts.push({
        id: 'raft',
        origin: def.raft.x * TILE,
        x: def.raft.x * TILE,
        w: def.raft.w * TILE,
        travel: def.raft.travel * TILE,
        phase: -Math.PI / 2,
        speed: def.raft.speed,
        dx: 0
      });
      var raft = rafts[0];
      var reach = raft.origin + raft.travel + raft.w;
      var bank = grounds.filter(function (g) { return Math.abs(g.x - reach) < 3; })[0];
      if (!bank) console.warn('Cat Run raft does not meet the far bank', reach);
    }

    grounds.forEach(function (g, gi) {
      for (var x = g.x + 18; x < g.x + g.w - 16; x += 46) {
        if (hash(x * 0.013 + gi) > 0.62) decor.push({ x: x, y: GROUND_Y, blossom: hash(x) > 0.45 });
      }
    });

    goal = {
      x: def.goal * TILE + 6,
      y: GROUND_Y - 54,
      w: 40,
      h: 54
    };
    levelName = def.name;
    levelWidth = def.width * TILE;
    spawn = { x: 2 * TILE, y: GROUND_Y - PH + SINK };
    player.x = spawn.x;
    player.y = spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.facing = 1;
    player.coyote = 0.12;
    player.buffer = 0;
    player.jumping = false;
    player.invuln = 0;
    player.stun = 0;
    player.squash = 0;
    player.groundId = null;
    player.riding = null;
    snapCam = true;

    foes.forEach(function (f) {
      var onLeft = grounds.some(function (g) { return f.minX + 4 >= g.x && f.minX + 4 <= g.x + g.w; });
      var onRight = grounds.some(function (g) { return f.maxX - 4 >= g.x && f.maxX - 4 <= g.x + g.w; });
      if (!onLeft || !onRight) console.warn('Cat Run foe patrol leaves the ground', f.kind, f.minX, f.maxX);
    });
  }

  function activeSolids() {
    var list = staticSolids.slice();
    for (var i = 0; i < rafts.length; i++) {
      var r = rafts[i];
      list.push({ id: r.id, x: r.x, y: GROUND_Y, w: r.w, h: 48, kind: 'raft' });
    }
    return list;
  }

  function burst(x, y, color, n) {
    if (reduce) return;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = 30 + Math.random() * 120;
      parts.push({
        x: x, y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 30,
        life: 0.35 + Math.random() * 0.2,
        color: color,
        r: 1.5 + Math.random() * 2
      });
    }
    if (parts.length > 70) parts.splice(0, parts.length - 70);
  }

  function floater(text, x, y) {
    floats.push({ text: text, x: x, y: y, life: 0.7 });
    if (floats.length > 8) floats.shift();
  }

  function celebrate() {
    if (reduce) return;
    var colors = ['#B22222', '#D4A017', '#FFF9F2', '#E3873A', '#F3B7C0'];
    for (var i = 0; i < 28; i++) {
      confetti.push({
        x: Math.random(),
        y: -0.1 - Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 0.25,
        vy: 0.25 + Math.random() * 0.45,
        life: 1.4 + Math.random(),
        color: colors[i % colors.length],
        s: 4 + Math.random() * 4
      });
    }
  }

  function unlockAudio() {
    if (!soundOn) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!audio) audio = new AC();
      if (audio.state === 'suspended') audio.resume();
    } catch (err) { /* no audio output */ }
  }

  function tone(freq, dur, type, when, gain) {
    if (!soundOn || !audio) return;
    var t = audio.currentTime + (when || 0);
    var o = audio.createOscillator();
    var g = audio.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain || 0.04, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g);
    g.connect(audio.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function sfx(name) {
    if (name === 'jump') tone(540, 0.09, 'triangle');
    else if (name === 'yarn') { tone(660, 0.07, 'sine'); tone(880, 0.1, 'sine', 0.06); }
    else if (name === 'fish') { tone(720, 0.07, 'sine'); tone(980, 0.12, 'sine', 0.07); }
    else if (name === 'stomp') tone(170, 0.09, 'square', 0, 0.03);
    else if (name === 'hurt') { tone(240, 0.12, 'sawtooth', 0, 0.03); tone(110, 0.18, 'triangle', 0.08, 0.03); }
    else if (name === 'clear') { tone(523, 0.1, 'triangle'); tone(659, 0.12, 'triangle', 0.09); }
    else if (name === 'win') {
      tone(523, 0.1, 'triangle');
      tone(659, 0.1, 'triangle', 0.1);
      tone(784, 0.18, 'triangle', 0.2);
    }
  }

  function respawn() {
    player.x = spawn.x;
    player.y = spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.jumping = false;
    player.riding = null;
    player.groundId = null;
    player.stun = 0.28;
    player.invuln = 1.45;
    snapCam = true;
  }

  function hurt(fromPit) {
    if (mode !== 'play') return;
    if (!fromPit && player.invuln > 0) return;
    lives -= 1;
    sfx('hurt');
    burst(player.x + PW / 2, player.y + PH / 2, '#E3873A', 8);
    if (lives <= 0) {
      mode = 'over';
      syncUI();
      return;
    }
    respawn();
  }

  function tick(dt) {
    time += dt;
    for (var pi = parts.length - 1; pi >= 0; pi--) {
      var p = parts[pi];
      p.life -= dt;
      p.vy += 500 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) parts.splice(pi, 1);
    }
    for (var fi = floats.length - 1; fi >= 0; fi--) {
      floats[fi].life -= dt;
      floats[fi].y -= 28 * dt;
      if (floats[fi].life <= 0) floats.splice(fi, 1);
    }
    for (var ci = confetti.length - 1; ci >= 0; ci--) {
      var c = confetti[ci];
      c.life -= dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.life <= 0 || c.y > 1.2) confetti.splice(ci, 1);
    }
    player.squash += (0 - player.squash) * Math.min(1, dt * 8);

    if (mode !== 'play') return;

    if (player.invuln > 0) player.invuln -= dt;

    for (var ri = 0; ri < rafts.length; ri++) {
      var raft = rafts[ri];
      var prev = raft.x;
      raft.phase += dt * raft.speed;
      var u = (Math.sin(raft.phase) + 1) / 2;
      raft.x = raft.origin + u * raft.travel;
      raft.dx = raft.x - prev;
    }
    if (player.riding) {
      for (var rj = 0; rj < rafts.length; rj++) {
        if (rafts[rj].id === player.riding) player.x += rafts[rj].dx;
      }
    }

    if (player.stun > 0) {
      player.stun -= dt;
      player.vx = 0;
    } else {
      var dir = 0;
      if (held.left) dir -= 1;
      if (held.right) dir += 1;
      if (dir !== 0) {
        player.vx += (player.onGround ? ACCEL : ACCEL * 0.7) * dir * dt;
        player.facing = dir;
      } else if (player.onGround) {
        var drop = FRICTION * dt;
        if (Math.abs(player.vx) <= drop) player.vx = 0;
        else player.vx -= Math.sign(player.vx) * drop;
      }
      player.vx = clamp(player.vx, -MAXRUN, MAXRUN);

      if (jumpEdge) {
        player.buffer = 0.14;
        jumpEdge = false;
      } else {
        player.buffer = Math.max(0, player.buffer - dt);
      }
      if (player.buffer > 0 && (player.onGround || player.coyote > 0)) {
        if (player.riding) {
          for (var rk = 0; rk < rafts.length; rk++) {
            if (rafts[rk].id === player.riding) player.vx += (rafts[rk].dx / dt) * 0.35;
          }
          player.vx = clamp(player.vx, -MAXRUN, MAXRUN);
        }
        player.vy = JUMP;
        player.onGround = false;
        player.coyote = 0;
        player.buffer = 0;
        player.jumping = true;
        player.riding = null;
        player.squash = -0.16;
        sfx('jump');
      }
      if (player.jumping && !held.jump && player.vy < JUMP_CUT) player.vy = JUMP_CUT;
    }

    if (!player.onGround) player.vy = Math.min(MAXFALL, player.vy + GRAV * dt);
    else if (player.vy > 0) player.vy = 0;

    var solids = activeSolids();
    player.x += player.vx * dt;
    if (player.x < 0) { player.x = 0; player.vx = 0; }
    if (player.x + PW > levelWidth) { player.x = levelWidth - PW; player.vx = 0; }
    resolveX(solids);

    player.prevBottom = player.y + PH;
    var wasGround = player.onGround;
    player.y += player.vy * dt;
    player.onGround = false;
    player.groundId = null;
    resolveY(solids);
    if (player.onGround && player.vy >= 0) player.jumping = false;
    if (!wasGround && player.onGround) player.squash = 0.2;

    if (player.onGround) player.coyote = 0.12;
    else player.coyote = Math.max(0, player.coyote - dt);
    player.riding = player.groundId;

    if (player.onGround && Math.abs(player.vx) > 80 && !reduce) {
      player.dust -= dt;
      if (player.dust <= 0) {
        player.dust = 0.08;
        parts.push({
          x: player.x + PW / 2, y: GROUND_Y, vx: -player.facing * 16, vy: -12,
          life: 0.25, color: 'rgba(140,98,57,.55)', r: 2
        });
      }
    }
    if (Math.abs(player.vx) > 30 && player.onGround) player.phase += dt * Math.abs(player.vx) * 0.045;
    else player.phase += dt * 2;

    for (var ei = 0; ei < foes.length; ei++) {
      var foe = foes[ei];
      if (!foe.alive) {
        foe.squish = Math.max(0, foe.squish - dt);
        continue;
      }
      foe.x += foe.vx * dt;
      if (foe.x < foe.minX) { foe.x = foe.minX; foe.vx = Math.abs(foe.vx); }
      if (foe.x + foe.w > foe.maxX) { foe.x = foe.maxX - foe.w; foe.vx = -Math.abs(foe.vx); }
      var box = { x: foe.x + 3, y: foe.y + 2, w: foe.w - 6, h: foe.h - 2 };
      if (!overlap(player, box)) continue;
      var stomp = player.vy > 50 && player.prevBottom <= foe.y + 10;
      if (stomp) {
        foe.alive = false;
        foe.squish = 0.28;
        player.vy = STOMP_V;
        player.onGround = false;
        player.jumping = false;
        player.y = foe.y - PH;
        score += 50;
        sfx('stomp');
        burst(foe.x + foe.w / 2, foe.y, '#D4A017', 7);
        floater('+50', foe.x, foe.y - 8);
      } else {
        hurt(false);
        break;
      }
    }

    for (var ni = 0; ni < coins.length; ni++) {
      var coin = coins[ni];
      if (coin.got || !overlap(player, coin)) continue;
      coin.got = true;
      var pts = coin.kind === 'fish' ? 25 : 10;
      score += pts;
      sfx(coin.kind === 'fish' ? 'fish' : 'yarn');
      burst(coin.x + coin.w / 2, coin.y, coin.kind === 'fish' ? '#E2A31B' : '#B22222', 6);
      floater('+' + pts, coin.x, coin.y);
    }

    for (var bi = 0; bi < beds.length; bi++) {
      if (overlap(player, beds[bi]) && beds[bi].spawnX >= spawn.x - 2) {
        spawn.x = beds[bi].spawnX;
        spawn.y = beds[bi].spawnY;
      }
    }

    if (mode === 'play' && player.y > LEVEL_H) hurt(true);

    if (mode === 'play' && overlap(player, goal)) {
      score += 100;
      floater('+100', goal.x, goal.y);
      if (levelIndex < LEVELS.length - 1) {
        mode = 'clear';
        sfx('clear');
      } else {
        mode = 'win';
        sfx('win');
        celebrate();
      }
      syncUI();
    }
  }

  function resolveX(solids) {
    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < solids.length; i++) {
        var s = solids[i];
        if (!overlap(player, s)) continue;
        // A hair of overlap with a floor is not a wall.
        if (player.y + PH <= s.y + 8) continue;
        if (player.vx > 0) player.x = s.x - PW;
        else if (player.vx < 0) player.x = s.x + s.w;
        else {
          var penL = (player.x + PW) - s.x;
          var penR = (s.x + s.w) - player.x;
          player.x = penL < penR ? s.x - PW : s.x + s.w;
        }
        player.vx = 0;
      }
    }
  }

  function resolveY(solids) {
    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < solids.length; i++) {
        var s = solids[i];
        if (!overlap(player, s)) continue;
        if (player.vy >= 0 && player.prevBottom <= s.y + 10) {
          player.y = s.y - PH + SINK;
          player.vy = 0;
          player.onGround = true;
          if (s.id) player.groundId = s.id;
        } else if (player.vy < 0) {
          player.y = s.y + s.h;
          player.vy = 0;
          player.jumping = false;
        } else {
          player.y = s.y - PH + SINK;
          player.vy = 0;
          player.onGround = true;
          if (s.id) player.groundId = s.id;
        }
      }
    }
  }

  function followCamera(dt) {
    var targetX = player.x + PW / 2 - view.w * 0.38 + player.facing * Math.min(40, view.w * 0.05);
    var targetY = player.y - view.h * 0.62;
    var maxX = Math.max(0, levelWidth - view.w);
    targetX = clamp(targetX, 0, maxX);
    if (view.h >= LEVEL_H) targetY = LEVEL_H - view.h;
    else targetY = clamp(targetY, 0, LEVEL_H - view.h);
    if (snapCam || reduce) {
      camX = targetX;
      camY = targetY;
      snapCam = false;
    } else {
      var k = Math.min(1, dt * 7);
      camX += (targetX - camX) * k;
      camY += (targetY - camY) * k;
    }
  }

  function roundRect(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function draw() {
    var dpr = view.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sky = ctx.createLinearGradient(0, 0, 0, view.cssH);
    sky.addColorStop(0, '#F6D3A3');
    sky.addColorStop(0.42, '#F7E6D2');
    sky.addColorStop(1, '#B9D3DE');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, view.cssW, view.cssH);

    ctx.fillStyle = 'rgba(244,196,120,.9)';
    ctx.beginPath();
    ctx.arc(view.cssW - 68, 48, 26, 0, Math.PI * 2);
    ctx.fill();

    var scale = view.scale;
    var horizon = (GROUND_Y - camY) * scale;
    ctx.fillStyle = '#E6D2BA';
    for (var hi = -2; hi < 12; hi++) {
      var hx = (hi * 260 - camX * 0.28) * scale;
      ctx.beginPath();
      ctx.moveTo(hx, horizon);
      ctx.quadraticCurveTo(hx + 70, horizon - 64, hx + 150, horizon);
      ctx.lineTo(hx + 150, horizon + 90);
      ctx.lineTo(hx, horizon + 90);
      ctx.fill();
    }
    for (var ti = -1; ti < 16; ti++) {
      var tx = (ti * 150 - camX * 0.42) * scale;
      var ty = horizon + 6;
      ctx.fillStyle = ti % 2 ? '#345244' : '#3E5C48';
      ctx.beginPath();
      ctx.moveTo(tx, ty - 72);
      ctx.lineTo(tx + 16, ty);
      ctx.lineTo(tx - 16, ty);
      ctx.fill();
      ctx.fillStyle = '#2C4034';
      ctx.fillRect(tx - 2.5, ty, 5, 8);
    }
    for (var ho = 0; ho < 6; ho++) {
      var hsx = (ho * 380 - camX * 0.36) * scale;
      var hsy = horizon - 8;
      ctx.fillStyle = ho % 2 ? '#C96B5A' : '#D4A017';
      ctx.fillRect(hsx, hsy - 28, 54, 28);
      ctx.fillStyle = '#8C3A32';
      ctx.beginPath();
      ctx.moveTo(hsx - 6, hsy - 26);
      ctx.lineTo(hsx + 27, hsy - 48);
      ctx.lineTo(hsx + 60, hsy - 26);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,236,190,.8)';
      ctx.fillRect(hsx + 8, hsy - 18, 8, 8);
      ctx.fillRect(hsx + 34, hsy - 18, 8, 8);
    }

    if (!reduce) {
      ctx.strokeStyle = 'rgba(45,24,16,.4)';
      ctx.lineWidth = 1.4;
      for (var bdi = 0; bdi < 3; bdi++) {
        var bx = ((time * 16 + bdi * 200) % (view.cssW + 50)) - 20;
        var by = 26 + bdi * 18 + Math.sin(time * 2 + bdi) * 3;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + 6, by - 4);
        ctx.lineTo(bx + 12, by);
        ctx.stroke();
      }
    }

    var s = scale * dpr;
    ctx.setTransform(s, 0, 0, s, -Math.round(camX) * s, -Math.round(camY) * s);

    for (var gi = 0; gi < gaps.length; gi++) {
      var gap = gaps[gi];
      ctx.fillStyle = '#6EA3B0';
      ctx.fillRect(gap.x, GROUND_Y + 10, gap.w, 80);
      ctx.fillStyle = '#8FBFCA';
      ctx.beginPath();
      for (var wx = 0; wx <= gap.w; wx += 8) {
        var wy = GROUND_Y + 20 + Math.sin((wx + time * 50) * 0.08) * 2;
        if (wx === 0) ctx.moveTo(gap.x + wx, wy);
        else ctx.lineTo(gap.x + wx, wy);
      }
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (var gdi = 0; gdi < grounds.length; gdi++) {
      var ground = grounds[gdi];
      ctx.fillStyle = '#8A5E3B';
      ctx.fillRect(ground.x, ground.y + 8, ground.w, ground.h - 8);
      ctx.fillStyle = '#6E9A4E';
      ctx.fillRect(ground.x, ground.y, ground.w, 10);
      ctx.fillStyle = '#87B15E';
      ctx.fillRect(ground.x, ground.y, ground.w, 4);
      ctx.fillStyle = '#6B442C';
      ctx.fillRect(ground.x, ground.y, 5, 18);
      ctx.fillRect(ground.x + ground.w - 5, ground.y, 5, 18);
    }

    for (var di = 0; di < decor.length; di++) {
      var flower = decor[di];
      ctx.fillStyle = '#5C843F';
      ctx.fillRect(flower.x, flower.y - 7, 2, 7);
      if (flower.blossom) {
        ctx.fillStyle = hash(flower.x) > 0.5 ? '#E07A8C' : '#F0C24B';
        ctx.beginPath();
        ctx.arc(flower.x + 1, flower.y - 9, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (var bi = 0; bi < boxes.length; bi++) drawBox(boxes[bi]);

    for (var bdi2 = 0; bdi2 < beds.length; bdi2++) {
      var bed = beds[bdi2];
      ctx.fillStyle = '#E7A3B0';
      ctx.beginPath();
      ctx.ellipse(bed.x + bed.w / 2, bed.y + 6, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F6D5DC';
      ctx.beginPath();
      ctx.ellipse(bed.x + bed.w / 2, bed.y + 5, 8, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (var si = 0; si < signs.length; si++) drawSign(signs[si]);
    for (var rfi = 0; rfi < rafts.length; rfi++) drawRaft(rafts[rfi]);

    for (var ci2 = 0; ci2 < coins.length; ci2++) {
      if (!coins[ci2].got) drawCoin(coins[ci2]);
    }
    for (var fi2 = 0; fi2 < foes.length; fi2++) {
      if (foes[fi2].alive || foes[fi2].squish > 0) drawFoe(foes[fi2]);
    }
    drawGoal();

    if (!(player.invuln > 0 && Math.sin(time * 28) > 0)) drawCat();

    for (var pj = 0; pj < parts.length; pj++) {
      var bit = parts[pj];
      ctx.globalAlpha = Math.max(0, bit.life * 2);
      ctx.fillStyle = bit.color;
      ctx.beginPath();
      ctx.arc(bit.x, bit.y, bit.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#2D1810';
    ctx.font = '700 13px Fredoka, Montserrat, sans-serif';
    ctx.textAlign = 'center';
    for (var fl = 0; fl < floats.length; fl++) {
      ctx.globalAlpha = Math.max(0, floats[fl].life);
      ctx.fillText(floats[fl].text, floats[fl].x, floats[fl].y);
    }
    ctx.globalAlpha = 1;

    if (showHit) {
      ctx.strokeStyle = '#0a0';
      ctx.strokeRect(player.x, player.y, PW, PH);
      ctx.strokeStyle = '#c00';
      foes.forEach(function (f) { if (f.alive) ctx.strokeRect(f.x, f.y, f.w, f.h); });
      ctx.strokeStyle = '#00c';
      ctx.strokeRect(goal.x, goal.y, goal.w, goal.h);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (var cf = 0; cf < confetti.length; cf++) {
      var piece = confetti[cf];
      ctx.globalAlpha = Math.max(0, Math.min(1, piece.life));
      ctx.fillStyle = piece.color;
      ctx.fillRect(piece.x * view.cssW, piece.y * view.cssH, piece.s, piece.s * 0.6);
    }
    ctx.globalAlpha = 1;
  }

  function drawBox(box) {
    if (box.kind === 'crate') {
      ctx.fillStyle = 'rgba(45,24,16,.12)';
      ctx.fillRect(box.x + 3, box.y + box.h - 2, box.w, 5);
      ctx.fillStyle = '#E4C48A';
      roundRect(ctx, box.x, box.y, box.w, box.h, 4);
      ctx.fill();
      ctx.strokeStyle = '#C4A066';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = '#F4E7C8';
      ctx.beginPath();
      ctx.moveTo(box.x + 6, box.y + box.h / 2);
      ctx.lineTo(box.x + box.w - 6, box.y + box.h / 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#A87444';
      roundRect(ctx, box.x, box.y, box.w, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#C4925A';
      roundRect(ctx, box.x, box.y, box.w, 5, 3);
      ctx.fill();
      ctx.fillStyle = '#8C6239';
      ctx.fillRect(box.x + 6, box.y + 10, 4, 10);
      ctx.fillRect(box.x + box.w - 10, box.y + 10, 4, 10);
    }
  }

  function drawSign(sign) {
    var x = sign.tile * TILE;
    ctx.fillStyle = '#8C6239';
    ctx.fillRect(x + 18, GROUND_Y - 28, 4, 28);
    ctx.fillStyle = '#F6E7CF';
    roundRect(ctx, x, GROUND_Y - 44, 40, 18, 3);
    ctx.fill();
    ctx.fillStyle = '#2D1810';
    ctx.font = '700 11px Fredoka, Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sign.text, x + 20, GROUND_Y - 31);
  }

  function drawRaft(raft) {
    ctx.fillStyle = 'rgba(45,24,16,.15)';
    ctx.beginPath();
    ctx.ellipse(raft.x + raft.w / 2, GROUND_Y + 8, raft.w / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E4C48A';
    roundRect(ctx, raft.x, GROUND_Y - 8, raft.w, 14, 6);
    ctx.fill();
    ctx.strokeStyle = '#C4A066';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#F4E7C8';
    ctx.beginPath();
    ctx.moveTo(raft.x + 10, GROUND_Y - 1);
    ctx.lineTo(raft.x + raft.w - 10, GROUND_Y - 1);
    ctx.stroke();
    var dir = Math.cos(raft.phase);
    ctx.fillStyle = '#8C3A32';
    ctx.beginPath();
    var ax = raft.x + raft.w / 2 + (dir >= 0 ? 8 : -8);
    ctx.moveTo(ax + (dir >= 0 ? 8 : -8), GROUND_Y - 1);
    ctx.lineTo(ax, GROUND_Y - 6);
    ctx.lineTo(ax, GROUND_Y + 4);
    ctx.fill();
  }

  function drawCoin(coin) {
    var bob = reduce ? 0 : Math.sin(time * 3 + coin.x * 0.05) * 2;
    var x = coin.x + coin.w / 2;
    var y = coin.y + coin.h / 2 + bob;
    if (coin.kind === 'fish') {
      ctx.fillStyle = '#E2A31B';
      ctx.beginPath();
      ctx.ellipse(x - 1, y, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x - 13, y - 5);
      ctx.lineTo(x - 13, y + 5);
      ctx.fill();
      ctx.fillStyle = '#2D1810';
      ctx.beginPath();
      ctx.arc(x + 3, y - 1, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * 1.4 + coin.x * 0.01);
      ctx.fillStyle = '#B22222';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#F4E7C8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0.4, 2.2);
      ctx.stroke();
      ctx.strokeStyle = '#D4A017';
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 2, 4.4);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawFoe(foe) {
    var face = foe.vx >= 0 ? 1 : -1;
    ctx.save();
    ctx.translate(foe.x + foe.w / 2, foe.y + foe.h);
    ctx.scale(face, foe.alive ? 1 : 0.45);
    if (foe.kind === 'dog') drawDog();
    else drawVacuum();
    ctx.restore();
  }

  function drawDog() {
    ctx.fillStyle = 'rgba(45,24,16,.15)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8A5A38';
    ctx.beginPath();
    ctx.ellipse(-2, -12, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E6C7A8';
    ctx.beginPath();
    ctx.ellipse(0, -10, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8A5A38';
    ctx.beginPath();
    ctx.arc(10, -16, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, -22, 4, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5C3A24';
    ctx.beginPath();
    ctx.ellipse(15, -15, 5, 3.5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2D1810';
    ctx.beginPath();
    ctx.arc(12, -17, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2D1810';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(8, -20);
    ctx.lineTo(13, -18);
    ctx.stroke();
    ctx.fillStyle = '#F6E7CF';
    ctx.beginPath();
    ctx.moveTo(16, -13);
    ctx.lineTo(18, -10);
    ctx.lineTo(14, -11);
    ctx.fill();
    ctx.fillStyle = '#6E4428';
    ctx.fillRect(-8, -6, 4, 6);
    ctx.fillRect(4, -6, 4, 6);
  }

  function drawVacuum() {
    var wobble = Math.sin(time * 16) * 1.5;
    ctx.fillStyle = 'rgba(45,24,16,.15)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#C43737';
    roundRect(ctx, -14, -22, 26, 18, 6);
    ctx.fill();
    ctx.fillStyle = '#E7E0D8';
    roundRect(ctx, -10, -26, 18, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#8FD4DE';
    ctx.beginPath();
    ctx.arc(-2, -16, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5C5A57';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, -14);
    ctx.quadraticCurveTo(20, -8 + wobble, 18, -2);
    ctx.stroke();
    ctx.fillStyle = '#2D1810';
    ctx.beginPath();
    ctx.arc(18, -2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2A2422';
    ctx.beginPath();
    ctx.arc(-8, -4, 3.5, 0, Math.PI * 2);
    ctx.arc(6, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGoal() {
    var x = goal.x - 8;
    var base = GROUND_Y;
    ctx.fillStyle = '#F3E6D4';
    ctx.fillRect(x, base - 52, 52, 52);
    ctx.fillStyle = '#B22222';
    ctx.beginPath();
    ctx.moveTo(x - 6, base - 50);
    ctx.lineTo(x + 26, base - 74);
    ctx.lineTo(x + 58, base - 50);
    ctx.fill();
    ctx.fillStyle = '#2D1810';
    roundRect(ctx, x + 16, base - 28, 18, 28, 3);
    ctx.fill();
    ctx.fillStyle = '#F6D58A';
    ctx.beginPath();
    ctx.arc(x + 25, base - 16, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E7C98A';
    ctx.fillRect(x + 8, base - 6, 34, 6);
    var wave = reduce ? 0 : Math.sin(time * 4) * 4;
    ctx.strokeStyle = '#8C6239';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 54, base);
    ctx.lineTo(x + 54, base - 58);
    ctx.stroke();
    ctx.fillStyle = '#D4A017';
    ctx.beginPath();
    ctx.moveTo(x + 54, base - 56);
    ctx.lineTo(x + 70, base - 50 + wave);
    ctx.lineTo(x + 54, base - 44);
    ctx.fill();
    ctx.fillStyle = '#FFF9F2';
    roundRect(ctx, x + 6, base - 46, 28, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#B22222';
    ctx.font = '700 8px Fredoka, Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOME', x + 20, base - 37);
  }

  function drawCat() {
    var blink = Math.sin(time * 1.7) > 0.92;
    ctx.save();
    ctx.translate(player.x + PW / 2, player.y + PH);
    ctx.scale(player.facing, 1);
    var sq = player.squash || 0;
    ctx.scale(1 - sq * 0.45, 1 + sq);
    ctx.fillStyle = 'rgba(45,24,16,.16)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    var wag = Math.sin(player.phase * 2) * 5;
    ctx.strokeStyle = '#C46A28';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -16);
    ctx.quadraticCurveTo(-16, -24 - wag * 0.3, -12, -28 - wag);
    ctx.stroke();

    var step = Math.sin(player.phase) * 3;
    ctx.fillStyle = '#E3873A';
    ctx.beginPath();
    ctx.ellipse(-5, -4, 3, 4.5, 0, 0, Math.PI * 2);
    ctx.ellipse(5, -4 + step * 0.15, 3, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#E3873A';
    ctx.beginPath();
    ctx.ellipse(0, -15, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F6D2B0';
    ctx.beginPath();
    ctx.ellipse(2, -14, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#E3873A';
    ctx.beginPath();
    ctx.arc(7, -26, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(1, -30);
    ctx.lineTo(4, -40);
    ctx.lineTo(9, -30);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -31);
    ctx.lineTo(12, -41);
    ctx.lineTo(16, -29);
    ctx.fill();
    ctx.fillStyle = '#F3B7C0';
    ctx.beginPath();
    ctx.moveTo(3, -31);
    ctx.lineTo(4.5, -37);
    ctx.lineTo(7, -31);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9.5, -31);
    ctx.lineTo(12, -37);
    ctx.lineTo(14.5, -30);
    ctx.fill();

    ctx.fillStyle = '#F8E0CC';
    ctx.beginPath();
    ctx.ellipse(10, -24, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2D1810';
    if (blink || mode === 'win' || mode === 'clear') {
      ctx.strokeStyle = '#2D1810';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(4, -27);
      ctx.quadraticCurveTo(6, -29, 8, -27);
      ctx.moveTo(9, -27);
      ctx.quadraticCurveTo(11, -29, 13, -27);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(6, -27, 1.3, 1.7, 0, 0, Math.PI * 2);
      ctx.ellipse(11, -27, 1.3, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#E07A8C';
    ctx.beginPath();
    ctx.moveTo(9, -24);
    ctx.lineTo(7.6, -22.4);
    ctx.lineTo(10.4, -22.4);
    ctx.fill();
    ctx.strokeStyle = '#2D1810';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(11, -23);
    ctx.lineTo(16, -22);
    ctx.moveTo(11, -24.2);
    ctx.lineTo(16, -25);
    ctx.stroke();
    ctx.fillStyle = '#B22222';
    ctx.fillRect(4, -20, 8, 2.4);
    ctx.fillStyle = '#D4A017';
    ctx.beginPath();
    ctx.arc(8, -18.2, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function cardHTML() {
    var fine = '<p class="fine"><a href="' + ADOPT + '">Adopt</a> · <a href="' + esc(FOSTER) + '" target="_blank" rel="noopener">Foster</a> · <a href="' + DONATE + '">Donate</a></p>';
    if (mode === 'title') {
      return '<div class="cr-card"><p class="kicker">Cat\'s Meow Cat Rescue</p><h2>Ready, Miso?</h2><p>Run the backyard, scoop yarn and fish, and reach the porch. Hop on grumpy dogs and runaway vacuums — or jump over them.</p><button type="button" class="btn btn--pri" data-act="start">Start</button><p class="fine">Arrows or A/D to run. Space, W, or Up to jump. Hold the jump for more height.</p></div>';
    }
    if (mode === 'clear') {
      return '<div class="cr-card"><p class="kicker">' + esc(levelName) + '</p><h2>Yard clear</h2><p class="cr-scoreline">Score ' + score + '</p><p>The foster porch is the next yard. Miso keeps the same lives.</p><button type="button" class="btn btn--pri" data-act="next">On to the porch</button></div>';
    }
    if (mode === 'win') {
      return '<div class="cr-card"><p class="kicker">Cat\'s Meow Cat Rescue</p><h2>Miso made it home</h2><p class="cr-scoreline">Score ' + score + '</p><p>That porch feeling is what foster kittens are waiting on. Whenever you want the real thing:</p><div class="cr-grid"><a class="btn btn--outline" href="' + ADOPT + '">Adopt</a><a class="btn btn--outline" href="' + esc(FOSTER) + '" target="_blank" rel="noopener">Foster</a><a class="btn btn--gold" href="' + DONATE + '">Donate</a><button type="button" class="btn btn--pri" data-act="again">Play again</button></div>' + fine + '</div>';
    }
    return '<div class="cr-card"><p class="kicker">Cat\'s Meow Cat Rescue</p><h2>Miso needs a nap</h2><p class="cr-scoreline">Score ' + score + '</p><p>Three lives go quickly. The porch will still be there.</p><div class="cr-grid"><button type="button" class="btn btn--pri" data-act="again">Play again</button><a class="btn btn--outline" href="' + ADOPT + '">Adopt</a><a class="btn btn--outline" href="' + esc(FOSTER) + '" target="_blank" rel="noopener">Foster</a><a class="btn btn--gold" href="' + DONATE + '">Donate</a></div>' + fine + '</div>';
  }

  function liveText() {
    if (mode === 'title') return 'Cat Run ready. Start to play.';
    if (mode === 'clear') return 'Yard clear. Score ' + score + '.';
    if (mode === 'win') return 'Miso made it home. Score ' + score + '.';
    if (mode === 'over') return 'Out of lives. Score ' + score + '.';
    return levelName + '. Score ' + score + '. Lives ' + lives + '.';
  }

  function syncUI() {
    if (!overlay) return;
    if (paintedMode !== mode) {
      paintedMode = mode;
      overlay.hidden = mode === 'play';
      hud.hidden = mode !== 'play';
      touchEl.classList.toggle('is-off', mode !== 'play');
      overlay.innerHTML = cardHTML();
      if (liveEl) liveEl.textContent = liveText();
    }
    if (levelEl) levelEl.textContent = levelName + ' · ' + (levelIndex + 1) + ' of ' + LEVELS.length;
    paintHud();
  }

  function paintHud() {
    if (scoreEl) scoreEl.textContent = String(score);
    if (!livesEl) return;
    if (livesEl.getAttribute('data-n') === String(lives)) return;
    livesEl.setAttribute('data-n', String(lives));
    var html = '';
    for (var i = 0; i < 3; i++) html += '<i class="' + (i < lives ? 'on' : '') + '"></i>';
    livesEl.innerHTML = html;
    livesEl.setAttribute('aria-label', lives + (lives === 1 ? ' life' : ' lives'));
  }

  function paintHold() {
    var leftBtn = document.getElementById('cr-left');
    var rightBtn = document.getElementById('cr-right');
    var jumpBtn = document.getElementById('cr-jump');
    if (leftBtn) leftBtn.classList.toggle('is-down', held.left);
    if (rightBtn) rightBtn.classList.toggle('is-down', held.right);
    if (jumpBtn) jumpBtn.classList.toggle('is-down', held.jump);
  }

  function startRun() {
    unlockAudio();
    levelIndex = 0;
    score = 0;
    lives = 3;
    confetti = [];
    buildLevel(LEVELS[0]);
    mode = 'play';
    paintedMode = '';
    syncUI();
    if (canvas) canvas.focus({ preventScroll: true });
  }

  function nextLevel() {
    unlockAudio();
    levelIndex += 1;
    buildLevel(LEVELS[levelIndex]);
    mode = 'play';
    paintedMode = '';
    syncUI();
    if (canvas) canvas.focus({ preventScroll: true });
  }

  function fit() {
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
    var target = cssW < 640 ? 44 : 54;
    view.scale = target / PH;
    view.w = cssW / view.scale;
    view.h = cssH / view.scale;
  }

  function typingOrSearch() {
    var search = document.getElementById('site-search');
    if (search && search.classList.contains('is-open')) return true;
    var ae = document.activeElement;
    if (!ae) return false;
    var tag = ae.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || ae.isContentEditable;
  }

  function focusIsGame() {
    if (typingOrSearch()) return false;
    var ae = document.activeElement;
    if (!ae || ae === document.body || ae === document.documentElement || ae === canvas) return true;
    return false;
  }

  function codeToHeld(code, down, repeat) {
    var left = code === 'ArrowLeft' || code === 'KeyA';
    var right = code === 'ArrowRight' || code === 'KeyD';
    var jump = code === 'ArrowUp' || code === 'KeyW' || code === 'Space';
    if (left) held.left = down;
    if (right) held.right = down;
    if (jump) {
      held.jump = down;
      if (down && !repeat) jumpEdge = true;
    }
  }

  function bindHold(btn, key) {
    if (!btn) return;
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      held[key] = true;
      if (key === 'jump') jumpEdge = true;
    });
    function release() { held[key] = false; }
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function boot() {
    canvas = document.getElementById('cat-run-canvas');
    frame = document.getElementById('cr-frame');
    overlay = document.getElementById('cr-overlay');
    hud = document.getElementById('cr-hud');
    touchEl = document.getElementById('cr-touch');
    scoreEl = document.getElementById('cr-score');
    livesEl = document.getElementById('cr-lives');
    levelEl = document.getElementById('cr-level');
    soundBtn = document.getElementById('cr-sound');
    liveEl = document.getElementById('cr-live');
    if (!canvas || !frame || !overlay) return;
    ctx = canvas.getContext('2d');
    showHit = /(?:\?|&)hitboxes=1(?:&|$)/.test(location.search);
    reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    soundOn = storageGet('catrun-sound') !== 'off';
    if (soundBtn) {
      soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      soundBtn.textContent = soundOn ? 'Sound' : 'Muted';
    }

    buildLevel(LEVELS[0]);
    mode = 'title';
    syncUI();
    fit();

    if (window.ResizeObserver) new ResizeObserver(fit).observe(frame);
    window.addEventListener('resize', fit);

    overlay.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'start' || act === 'again') startRun();
      else if (act === 'next') nextLevel();
    });

    if (soundBtn) {
      soundBtn.addEventListener('click', function () {
        soundOn = !soundOn;
        soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
        soundBtn.textContent = soundOn ? 'Sound' : 'Muted';
        storageSet('catrun-sound', soundOn ? 'on' : 'off');
        if (soundOn) unlockAudio();
        canvas.focus({ preventScroll: true });
      });
    }
    var restartBtn = document.getElementById('cr-restart');
    if (restartBtn) restartBtn.addEventListener('click', startRun);

    bindHold(document.getElementById('cr-left'), 'left');
    bindHold(document.getElementById('cr-right'), 'right');
    bindHold(document.getElementById('cr-jump'), 'jump');

    canvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

    window.addEventListener('keydown', function (e) {
      if (typingOrSearch()) return;
      if (!focusIsGame()) return;
      if (mode === 'title' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        startRun();
        return;
      }
      if (e.code === 'KeyR' && mode !== 'title') {
        e.preventDefault();
        startRun();
        return;
      }
      if (mode === 'clear' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        nextLevel();
        return;
      }
      if ((mode === 'win' || mode === 'over') && e.code === 'Enter') {
        e.preventDefault();
        startRun();
        return;
      }
      var gameKey = e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'ArrowUp' ||
        e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'KeyW' || e.code === 'Space';
      if (mode === 'play' && gameKey) {
        e.preventDefault();
        codeToHeld(e.code, true, e.repeat);
      }
    });
    window.addEventListener('keyup', function (e) { codeToHeld(e.code, false, false); });
    window.addEventListener('blur', function () {
      held.left = false;
      held.right = false;
      held.jump = false;
    });

    window.CatRun = {
      state: function () {
        return {
          mode: mode,
          score: score,
          lives: lives,
          level: levelIndex,
          levelName: levelName,
          player: { x: player.x, y: player.y, w: PW, h: PH, vx: player.vx, vy: player.vy, onGround: player.onGround },
          goal: { x: goal.x, y: goal.y, w: goal.w, h: goal.h },
          solids: activeSolids().map(function (s) { return { x: s.x, y: s.y, w: s.w, h: s.h, kind: s.kind }; }),
          foes: foes.map(function (f) { return { x: f.x, y: f.y, w: f.w, h: f.h, alive: f.alive, kind: f.kind }; }),
          rafts: rafts.map(function (r) { return { x: r.x, y: GROUND_Y, w: r.w, h: 14 }; }),
          width: levelWidth
        };
      }
    };

    var last = 0;
    var acc = 0;
    var step = 1 / 60;
    function frameLoop(now) {
      if (!last) last = now;
      var dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1;
      acc += dt;
      if (acc > 0.1) acc = 0.1;
      var n = 0;
      while (acc >= step && n < 4) {
        tick(step);
        acc -= step;
        n++;
      }
      fit();
      if (view.cssW > 2 && view.cssH > 2) {
        followCamera(dt || step);
        draw();
      }
      if (mode === 'play') paintHud();
      paintHold();
      requestAnimationFrame(frameLoop);
    }
    requestAnimationFrame(frameLoop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
