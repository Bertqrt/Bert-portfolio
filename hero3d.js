// The 3D circuit board in the home page hero.
// Parts drop onto the board, current flows along the copper traces and
// lights the LEDs, every part can be clicked to make it jump, the chip and
// the button send a shockwave through the whole board, and scrolling away
// pulls it apart into an exploded view.
// script.js only loads this on capable devices, without reduced motion.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function start(stage, options) {
  options = options || {};
  var mobile = !!options.mobile;
  var onReady = options.onReady || function () {};
  var onPlay = options.onPlay || function () {};

  // ---------- Renderer, scene, camera ----------
  var renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'stage-canvas';
  stage.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  var camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);
  var camTarget = new THREE.Vector3(0, 0, 0.3);

  scene.add(new THREE.HemisphereLight(0xfff3e6, 0x2a2420, 0.6));
  var sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(5, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  var sc = sun.shadow.camera;
  sc.left = -11; sc.right = 11; sc.top = 11; sc.bottom = -11; sc.near = 1; sc.far = 40;
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 6;
  scene.add(sun);

  // a warm light that follows the cursor across the board
  var cursorLight = new THREE.PointLight(0xff8a4c, 0, 9, 1.6);
  cursorLight.position.set(0, 2.2, 0);
  scene.add(cursorLight);

  // the shadow falls on an invisible floor
  var floorMat = new THREE.ShadowMaterial({ opacity: 0.18 });
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.6;
  floor.receiveShadow = true;
  scene.add(floor);

  // everything on the board tilts and floats together
  var rig = new THREE.Group();
  scene.add(rig);

  // ---------- Materials ----------
  var COPPER = 0xc8743f;
  var mats = {
    board: new THREE.MeshStandardMaterial({ color: 0x1c1916, roughness: 0.82, metalness: 0.05 }),
    copper: new THREE.MeshStandardMaterial({ color: COPPER, roughness: 0.32, metalness: 0.9 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd8b36a, roughness: 0.25, metalness: 1 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xc9c5bd, roughness: 0.28, metalness: 1 }),
    black: new THREE.MeshStandardMaterial({ color: 0x121110, roughness: 0.55, metalness: 0.1 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x0f0e0d, roughness: 0.7 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xfffaf4, roughness: 0.9 }),
    tape: new THREE.MeshStandardMaterial({ color: 0xf1e7d4, roughness: 0.9, transparent: true, opacity: 0.82 }),
    capBlue: new THREE.MeshStandardMaterial({ color: 0x2c4e72, roughness: 0.45, metalness: 0.15 }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0xc9853f, roughness: 0.55 })
  };

  var shadowed = function (mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  var BOARD_W = 12, BOARD_D = 8, BOARD_T = 0.32, TOP = BOARD_T / 2;

  // ---------- The board ----------
  var board = shadowed(new THREE.Mesh(new RoundedBoxGeometry(BOARD_W, BOARD_T, BOARD_D, 4, 0.28), mats.board));
  rig.add(board);

  // Silkscreen: part outlines and labels, drawn on a canvas
  var silk = document.createElement('canvas');
  silk.width = 1536; silk.height = 1024;
  var silkTex = new THREE.CanvasTexture(silk);
  silkTex.colorSpace = THREE.SRGBColorSpace;
  silkTex.anisotropy = 4;
  var silkPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(BOARD_W - 0.1, BOARD_D - 0.1),
    new THREE.MeshStandardMaterial({ map: silkTex, transparent: true, roughness: 0.9, depthWrite: false })
  );
  silkPlane.rotation.x = -Math.PI / 2;
  silkPlane.position.y = TOP + 0.002;
  silkPlane.receiveShadow = true;
  rig.add(silkPlane);

  var toSilk = function (x, z) { return [(x + BOARD_W / 2) / BOARD_W * silk.width, (z + BOARD_D / 2) / BOARD_D * silk.height]; };
  var silkLabels = [];
  var drawSilk = function () {
    var g = silk.getContext('2d');
    var s = silk.width / BOARD_W;
    g.clearRect(0, 0, silk.width, silk.height);
    g.strokeStyle = 'rgba(236, 230, 219, 0.7)';
    g.fillStyle = 'rgba(236, 230, 219, 0.75)';
    g.lineWidth = 3;
    g.font = '700 30px "Space Mono", ui-monospace, monospace';
    silkLabels.forEach(function (l) {
      var p = toSilk(l.x - l.w / 2, l.z - l.d / 2);
      g.strokeRect(p[0], p[1], l.w * s, l.d * s);
      if (l.label) {
        var q = toSilk(l.lx, l.lz);
        g.fillText(l.label, q[0], q[1]);
      }
    });
    // board marking
    g.font = '700 34px "Space Mono", ui-monospace, monospace';
    var m = toSilk(1.2, 3.75);
    g.fillText('BERT-BOSU  REV 2026  ACCRA, GH', m[0], m[1]);
    // a field of tiny dots, like test points
    g.fillStyle = 'rgba(236, 230, 219, 0.12)';
    for (var gx = 40; gx < silk.width; gx += 48) {
      for (var gy = 40; gy < silk.height; gy += 48) g.fillRect(gx, gy, 3, 3);
    }
    silkTex.needsUpdate = true;
  };

  // mounting holes in the corners
  var ringGeo = new THREE.RingGeometry(0.16, 0.3, 32);
  [[-5.45, -3.45], [5.45, -3.45], [-5.45, 3.45], [5.45, 3.45]].forEach(function (p) {
    var ring = new THREE.Mesh(ringGeo, mats.copper);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p[0], TOP + 0.004, p[1]);
    rig.add(ring);
  });

  // ---------- Copper traces (x, z on the board), with 45 degree bends ----------
  var TRACES = [
    { pts: [[1.8, -1.1], [2.3, -1.1], [2.8, -1.6], [3.1, -1.6]], to: 'r2' },
    { pts: [[1.4, -1.5], [1.4, -2.0], [2.0, -2.6], [3.1, -2.6]], to: 'r1' },
    { pts: [[4.7, -2.6], [5.4, -2.6], [5.4, 0.0], [5.0, 0.4]], to: 'c1' },
    { pts: [[1.8, 0.1], [3.0, 0.1], [3.4, 0.5]], to: 'c2' },
    { pts: [[1.8, 0.5], [2.0, 0.5], [2.3, 0.8], [2.3, 2.7]], to: 'd1' },
    { pts: [[3.4, 0.5], [3.4, 1.5], [3.5, 1.6], [3.5, 2.7]], to: 'd2' },
    { pts: [[5.0, 0.4], [5.0, 1.5], [4.7, 1.8], [4.7, 2.7]], to: 'd3' },
    { pts: [[0.6, 0.9], [0.6, 2.7]], to: 'sw' },
    { pts: [[-0.6, -0.3], [-1.4, -0.3], [-1.4, 2.4], [-2.2, 3.2]], to: 'j1' },
    { pts: [[-0.6, 0.5], [-0.9, 0.5], [-0.9, 1.9], [-0.2, 2.6], [0.1, 2.6]], to: 'sw' },
    { pts: [[0.2, -1.5], [0.2, -2.7], [0.0, -2.9]], to: 'y1' },
    { pts: [[-0.6, -1.1], [-1.6, -1.1], [-1.6, -2.8], [-2.2, -3.4], [-4.6, -3.4]], to: null },
    { pts: [[-0.2, -1.5], [-0.2, -2.2], [-0.8, -2.8], [-0.8, -3.5]], to: null },
    { pts: [[4.7, -1.6], [4.95, -1.6]], to: null }
  ];

  var segGeo = new THREE.BoxGeometry(1, 0.03, 0.1);
  segGeo.translate(0.5, 0, 0); // grows from its start point
  var jointGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12);
  var viaGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.035, 20);
  var traceSegs = [];

  TRACES.forEach(function (tr, ti) {
    var len = 0;
    tr.cum = [0];
    for (var i = 1; i < tr.pts.length; i++) {
      var a = tr.pts[i - 1], b = tr.pts[i];
      var dx = b[0] - a[0], dz = b[1] - a[1];
      var l = Math.hypot(dx, dz);
      var seg = new THREE.Mesh(segGeo, mats.copper);
      seg.position.set(a[0], TOP + 0.015, a[1]);
      seg.rotation.y = -Math.atan2(dz, dx);
      seg.scale.x = 0.0001;
      seg.receiveShadow = true;
      seg.userData = { len: l, delay: 0.9 + ti * 0.07 + len * 0.12 };
      rig.add(seg);
      traceSegs.push(seg);
      len += l;
      tr.cum.push(len);
    }
    tr.len = len;
    tr.pts.forEach(function (p, i) {
      var end = i === 0 || i === tr.pts.length - 1;
      var j = new THREE.Mesh(end ? viaGeo : jointGeo, end ? mats.gold : mats.copper);
      j.position.set(p[0], TOP + 0.017, p[1]);
      j.scale.setScalar(0.0001);
      j.userData = { delay: 1.0 + ti * 0.07 + (tr.cum[i] || 0) * 0.12 };
      rig.add(j);
      traceSegs.push(j);
    });
  });

  var pointOn = function (tr, d, out) {
    d = Math.max(0, Math.min(tr.len, d));
    for (var i = 1; i < tr.cum.length; i++) {
      if (d <= tr.cum[i] || i === tr.cum.length - 1) {
        var a = tr.pts[i - 1], b = tr.pts[i];
        var t = (d - tr.cum[i - 1]) / ((tr.cum[i] - tr.cum[i - 1]) || 1);
        out.set(a[0] + (b[0] - a[0]) * t, TOP + 0.09, a[1] + (b[1] - a[1]) * t);
        return out;
      }
    }
    return out;
  };

  // ---------- Parts ----------
  var parts = [];
  var partsById = {};
  var leds = [];

  var addPart = function (id, group, x, z, opts) {
    opts = opts || {};
    group.position.set(x, TOP, z);
    group.rotation.y = opts.rot || 0;
    group.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    var part = {
      id: id, group: group, x: x, z: z, rot: opts.rot || 0, kind: opts.kind || id,
      yo: 0, vy: 0, spin: 0, vspin: 0, flip: 0, vflip: 0, sq: 0, vsq: 0,
      lift: 0, liftT: 0, explode: opts.explode || 2.5, tiltX: (Math.random() - 0.5) * 0.8, tiltZ: (Math.random() - 0.5) * 0.8,
      hit: opts.hit || 1
    };
    group.userData.part = part;
    rig.add(group);
    parts.push(part);
    partsById[id] = part;
    if (opts.silk) silkLabels.push(opts.silk);
    return part;
  };

  // canvas textures
  var canvasTex = function (w, h, draw) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };

  // The chip (U1), with the B mark lasered on top
  (function () {
    var g = new THREE.Group();
    var top = canvasTex(512, 512, function (c, w, h) {
      c.fillStyle = '#161412'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 6;
      c.beginPath(); c.arc(70, 70, 22, 0, Math.PI * 2); c.stroke();
      c.save();
      c.translate(w / 2 - 92, h / 2 - 130);
      c.scale(1.9, 1.9);
      c.fillStyle = '#8f877a';
      c.fill(new Path2D('M12 8H32V92H12Z'));
      c.fill(new Path2D('M37 8H56A18.5 18.5 0 0 1 56 45H37Z'));
      c.fill(new Path2D('M37 50H60A21 21 0 0 1 60 92H37Z'));
      c.restore();
      c.fillStyle = '#8f877a';
      c.font = '700 40px "Space Mono", ui-monospace, monospace';
      c.textAlign = 'center';
      c.fillText('BB-2026', w / 2, h - 50);
    });
    var body = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.36, 2.4, 3, 0.05), [mats.black, mats.black, new THREE.MeshStandardMaterial({ map: top, roughness: 0.45 }), mats.black, mats.black, mats.black]);
    body.position.y = 0.28;
    g.add(body);
    var legGeo = new THREE.BoxGeometry(0.34, 0.06, 0.12);
    for (var side = 0; side < 4; side++) {
      for (var i = 0; i < 5; i++) {
        var leg = new THREE.Mesh(legGeo, mats.silver);
        var off = -0.8 + i * 0.4;
        var a = side * Math.PI / 2;
        var r = 1.3;
        leg.position.set(Math.cos(a) * r - Math.sin(a) * off, 0.16, Math.sin(a) * r + Math.cos(a) * off);
        leg.rotation.y = -a;
        g.add(leg);
      }
    }
    addPart('chip', g, 0.6, -0.3, { kind: 'chip', explode: 3.2, hit: 1.4, silk: { x: 0.6, z: -0.3, w: 3.0, d: 3.0, label: 'U1', lx: -0.9, lz: -1.95 } });
  })();

  // Resistors (R1, R2) with colour bands
  var resistor = function (id, x, z, bands, label) {
    var g = new THREE.Group();
    var tex = canvasTex(8, 128, function (c, w, h) {
      c.fillStyle = '#d8c29b'; c.fillRect(0, 0, w, h);
      bands.forEach(function (col, i) {
        c.fillStyle = col;
        c.fillRect(0, 22 + i * 20, w, 10);
      });
    });
    var body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.62, 6, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.32;
    g.add(body);
    var lead = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8), mats.silver);
    lead.rotation.z = Math.PI / 2;
    lead.position.y = 0.32;
    g.add(lead);
    [-0.8, 0.8].forEach(function (lx) {
      var down = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.34, 8), mats.silver);
      down.position.set(lx, 0.16, 0);
      g.add(down);
    });
    addPart(id, g, x, z, { kind: 'resistor', explode: 2.2, silk: { x: x, z: z, w: 1.9, d: 0.55, label: label, lx: x - 0.95, lz: z - 0.4 } });
  };
  resistor('r1', 3.9, -2.6, ['#8a4b1f', '#111', '#c0392b', '#c9a24a'], 'R1');
  resistor('r2', 3.9, -1.6, ['#c9a24a', '#5a3d8a', '#8a4b1f', '#c9a24a'], 'R2');

  // Electrolytic capacitor (C1)
  (function () {
    var g = new THREE.Group();
    var sleeve = canvasTex(256, 64, function (c, w, h) {
      c.fillStyle = '#2c4e72'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#b9c6d6'; c.fillRect(0, 0, 46, h);
      c.fillStyle = '#2c4e72';
      for (var y = 10; y < h; y += 16) c.fillRect(16, y, 14, 4);
    });
    var can = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.3, 32), [new THREE.MeshStandardMaterial({ map: sleeve, roughness: 0.4, metalness: 0.1 }), mats.silver, mats.silver]);
    can.position.y = 0.7;
    g.add(can);
    var lip = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.03, 8, 32), mats.silver);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 1.35;
    g.add(lip);
    addPart('c1', g, 5.0, 0.4, { kind: 'capacitor', explode: 3.6, silk: { x: 5.0, z: 0.4, w: 1.15, d: 1.15, label: 'C1', lx: 4.35, lz: -0.35 } });
  })();

  // Ceramic capacitor (C2)
  (function () {
    var g = new THREE.Group();
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 24), mats.ceramic);
    disc.rotation.x = Math.PI / 2;
    disc.position.y = 0.62;
    g.add(disc);
    [-0.14, 0.14].forEach(function (lx) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.45, 8), mats.silver);
      leg.position.set(lx, 0.22, 0);
      g.add(leg);
    });
    addPart('c2', g, 3.4, 0.5, { kind: 'capacitor', explode: 2.8, silk: { x: 3.4, z: 0.5, w: 0.8, d: 0.45, label: 'C2', lx: 2.9, lz: 1.05 } });
  })();

  // LEDs (D1 to D3): they glow when current reaches them
  var glowTex = canvasTex(128, 128, function (c, w, h) {
    var gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,190,140,0.65)');
    gr.addColorStop(1, 'rgba(255,120,60,0)');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  var led = function (id, x, z, color, label) {
    var g = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.15, roughness: 0.15, transparent: true, opacity: 0.92 });
    var rim = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 24), mat);
    rim.position.y = 0.36;
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.34, 24), mat);
    body.position.y = 0.55;
    var dome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    dome.position.y = 0.72;
    g.add(rim, body, dome);
    [-0.09, 0.09].forEach(function (lx) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 8), mats.silver);
      leg.position.set(lx, 0.16, 0);
      g.add(leg);
    });
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.y = 0.7;
    glow.scale.setScalar(2.2);
    g.add(glow);
    var light = new THREE.PointLight(color, 0, 3.5, 2);
    light.position.y = 0.8;
    g.add(light);
    var part = addPart(id, g, x, z, { kind: 'led', explode: 3 + Math.random(), silk: { x: x, z: z, w: 0.7, d: 0.7, label: label, lx: x - 0.3, lz: z + 0.75 } });
    part.led = { mat: mat, glow: glow, light: light, level: 0 };
    leds.push(part);
  };
  led('d1', 2.3, 2.7, 0xff6a2b, 'D1');
  led('d2', 3.5, 2.7, 0xffa040, 'D2');
  led('d3', 4.7, 2.7, 0xff3d2e, 'D3');

  // Push button (SW1)
  (function () {
    var g = new THREE.Group();
    var base = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.32, 1.0, 2, 0.06), mats.plastic);
    base.position.y = 0.2;
    var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.22, 28), mats.copper);
    cap.position.y = 0.46;
    g.add(base, cap);
    var p = addPart('sw', g, 0.6, 2.7, { kind: 'button', explode: 2.4, hit: 1.4, silk: { x: 0.6, z: 2.7, w: 1.3, d: 1.3, label: 'SW1', lx: -0.15, lz: 3.6 } });
    p.cap = cap;
  })();

  // Pin header (J1)
  (function () {
    var g = new THREE.Group();
    var strip = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.26, 0.3), mats.plastic);
    strip.position.y = 0.13;
    g.add(strip);
    for (var i = 0; i < 6; i++) {
      var pin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.75, 0.07), mats.gold);
      pin.position.set(-1.5 + i * 0.6, 0.45, 0);
      g.add(pin);
    }
    addPart('j1', g, -3.7, 3.2, { kind: 'header', explode: 2, silk: { x: -3.7, z: 3.2, w: 3.9, d: 0.55, label: 'J1', lx: -5.6, lz: 2.75 } });
  })();

  // Crystal (Y1)
  (function () {
    var g = new THREE.Group();
    var can = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.55, 6, 16), mats.silver);
    can.rotation.z = Math.PI / 2;
    can.scale.set(1, 1, 0.6);
    can.position.y = 0.25;
    g.add(can);
    addPart('y1', g, 0.6, -2.9, { kind: 'crystal', explode: 2.6, silk: { x: 0.6, z: -2.9, w: 1.3, d: 0.5, label: 'Y1', lx: 1.45, lz: -2.75 } });
  })();

  // My photo, taped to the board
  (function () {
    var g = new THREE.Group();
    var card = new THREE.Mesh(new RoundedBoxGeometry(3.0, 0.04, 3.9, 2, 0.02), mats.paper);
    card.position.y = 0.05;
    g.add(card);
    var photoMat = new THREE.MeshStandardMaterial({ color: 0xdedad2, roughness: 0.7 });
    var photo = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 3.6), photoMat);
    photo.rotation.x = -Math.PI / 2;
    photo.position.set(0, 0.075, -0.06);
    g.add(photo);
    new THREE.TextureLoader().load(options.photo || 'photo.jpg', function (t) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      photoMat.map = t;
      photoMat.color.set(0xffffff);
      photoMat.needsUpdate = true;
    });
    [[-1.25, -1.75, 0.7], [1.25, -1.75, -0.7]].forEach(function (p) {
      var tape = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.32), mats.tape);
      tape.position.set(p[0], 0.09, p[1]);
      tape.rotation.y = p[2];
      g.add(tape);
    });
    addPart('photo', g, -3.7, -0.6, { kind: 'photo', rot: 0.05, explode: 2.2 });
  })();

  document.fonts && document.fonts.ready ? document.fonts.ready.then(drawSilk) : drawSilk();
  drawSilk();

  // ---------- Current: glowing particles along the traces ----------
  var MAX_P = 64;
  var pGeo = new THREE.BufferGeometry();
  var pPos = new Float32Array(MAX_P * 3);
  var pSize = new Float32Array(MAX_P);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1));
  var pMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: glowTex }, color: { value: new THREE.Color(0xffa060) }, scale: { value: 1 } },
    vertexShader: 'attribute float size; uniform float scale; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D map; uniform vec3 color; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(color * 1.6, 1.0) * t; }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  var points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  rig.add(points);

  var particles = [];
  for (var i = 0; i < MAX_P; i++) particles.push({ on: false, tr: null, d: 0, speed: 0, rev: false });
  var tmp = new THREE.Vector3();

  var spawn = function (trIndex, speed, rev) {
    for (var i = 0; i < MAX_P; i++) {
      var p = particles[i];
      if (!p.on) {
        p.on = true;
        p.tr = TRACES[trIndex];
        p.d = 0;
        p.speed = speed;
        p.rev = !!rev;
        return p;
      }
    }
    return null;
  };

  var flashLed = function (id, amount) {
    var part = partsById[id];
    if (part && part.led) part.led.level = Math.min(2.5, part.led.level + amount);
  };

  // ---------- Physics: jumps, spins, squash and stretch ----------
  var shake = 0;
  var jump = function (part, power) {
    power = power || 1;
    part.vy = (7 + Math.random() * 3) * power * (1 / part.hit);
    part.vspin = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 7) * power;
    if (part.kind === 'photo') part.vflip = 14 * power;
    part.vsq += 3 * power; // stretch on take-off
    if (part.led) part.led.level = 2.5;
    // current shoots out along the traces that touch it
    TRACES.forEach(function (tr, ti) {
      if (tr.to === part.id) spawn(ti, 9, true);
    });
  };

  var surge = function (from) {
    shake = 0.5;
    if (from.cap) from.press = 1;
    parts.forEach(function (p) {
      var dist = Math.hypot(p.x - from.x, p.z - from.z);
      setTimeout(function () { jump(p, p === from ? 0.8 : 1.15); }, dist * 45);
    });
    TRACES.forEach(function (tr, ti) {
      for (var k = 0; k < 3; k++) setTimeout(function () { spawn(ti, 10, false); }, k * 120);
    });
    leds.forEach(function (l) { setTimeout(function () { l.led.level = 2.5; }, 300); });
  };

  // ---------- Intro: the board rises and the parts drop in ----------
  var clock = new THREE.Clock();
  var t0 = 0;
  parts.forEach(function (p, i) {
    p.yo = 9 + i * 1.4;
    p.vy = 0;
    p.spin = (Math.random() - 0.5) * 3;
  });
  var rigY = -7, rigVY = 0, rigRot = 1.2, rigVR = 0;

  // ---------- Pointer: hover, click, drag to spin, tilt ----------
  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2(9, 9);
  var pointerIn = false;
  var hovered = null;
  var tiltX = 0, tiltZ = 0, tTiltX = 0, tTiltZ = 0;
  var yaw = 0, yawV = 0;
  var drag = null;
  var played = false;

  var boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TOP);
  var hitPoint = new THREE.Vector3();
  var meshes = [];
  parts.forEach(function (p) { p.group.traverse(function (o) { if (o.isMesh) meshes.push(o); }); });

  var partFrom = function (obj) {
    while (obj && !(obj.userData && obj.userData.part)) obj = obj.parent;
    return obj ? obj.userData.part : null;
  };

  var canvas = renderer.domElement;
  var setPointer = function (e) {
    var r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    tTiltX = -ndc.y * 0.14;
    tTiltZ = -ndc.x * 0.1;
  };

  var pick = function () {
    raycaster.setFromCamera(ndc, camera);
    var hit = raycaster.intersectObjects(meshes, false)[0];
    return hit ? partFrom(hit.object) : null;
  };

  canvas.addEventListener('pointermove', function (e) {
    pointerIn = true;
    setPointer(e);
    if (drag) {
      var dx = e.clientX - drag.x;
      drag.x = e.clientX;
      if (Math.abs(e.clientX - drag.sx) > 6) drag.moved = true;
      yawV = dx * 0.006;
      yaw += yawV;
    }
  });
  canvas.addEventListener('pointerleave', function () { pointerIn = false; tTiltX = 0; tTiltZ = 0; ndc.set(9, 9); });
  canvas.addEventListener('pointerdown', function (e) {
    setPointer(e);
    drag = { x: e.clientX, sx: e.clientX, moved: false, part: pick() };
    canvas.classList.add('grabbing');
  });
  window.addEventListener('pointerup', function () {
    if (!drag) return;
    canvas.classList.remove('grabbing');
    var d = drag;
    drag = null;
    if (d.moved) { markPlayed(); return; }
    var part = d.part;
    if (!part) return;
    markPlayed();
    if (part.kind === 'chip' || part.kind === 'button') surge(part);
    else jump(part, 1);
  });

  var markPlayed = function () {
    if (played) return;
    played = true;
    onPlay();
  };

  // ---------- Sizing ----------
  var resize = function () {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    var vfov = THREE.MathUtils.degToRad(camera.fov);
    var hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    var el = THREE.MathUtils.degToRad(48);
    var needH = 7.4 / Math.tan(hfov / 2);
    var needV = 5.6 / Math.tan(vfov / 2);
    var d = Math.max(needH, needV) * 1.08;
    camera.position.set(0, Math.sin(el) * d, Math.cos(el) * d + 0.3);
    camera.lookAt(camTarget);
    camera.updateProjectionMatrix();
    pMat.uniforms.scale.value = h * 0.9 * renderer.getPixelRatio();
  };
  var ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  // Theme: a lighter shadow on light paper, a deeper one on dark. In the
  // dark the traces glow and the LEDs burn brighter.
  var ledBase = 0.12;
  var paintTheme = function () {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    floorMat.opacity = dark ? 0.45 : 0.2;
    mats.copper.emissive.set(dark ? 0x7a2e0c : 0x000000);
    mats.copper.emissiveIntensity = dark ? 0.55 : 0;
    ledBase = dark ? 0.4 : 0.12;
  };
  paintTheme();
  var mo = new MutationObserver(paintTheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ---------- Scroll: the exploded view ----------
  var explodeP = 0;
  var readScroll = function () {
    var h = stage.parentElement.offsetHeight || window.innerHeight;
    explodeP = Math.max(0, Math.min(1, window.pageYOffset / (h * 0.9)));
  };
  window.addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  // ---------- The loop ----------
  var running = false;
  var raf = 0;
  var ambientTimer = 0;
  var readyFired = false;
  var camBase = new THREE.Vector3();

  var frame = function () {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(clock.getDelta(), 1 / 20);
    t0 += dt;
    var t = t0;

    // the rig rises into place on a spring
    rigVY += (-rigY * 60 - rigVY * 9) * dt; rigY += rigVY * dt;
    rigVR += (-rigRot * 40 - rigVR * 8) * dt; rigRot += rigVR * dt;

    // tilt toward the cursor, drag to spin, settle back slowly
    tiltX += (tTiltX - tiltX) * Math.min(1, dt * 4);
    tiltZ += (tTiltZ - tiltZ) * Math.min(1, dt * 4);
    if (!drag) { yawV *= Math.exp(-dt * 2.5); yaw += yawV; yaw += (0 - yaw) * Math.min(1, dt * 0.6); }

    var e = explodeP * explodeP * (3 - 2 * explodeP); // eased
    // exploded view: the board drops and turns toward you, the parts spread
    // out and up above it, so it all stays in sight as the hero scrolls away
    rig.position.y = rigY + Math.sin(t * 1.3) * 0.08 - e * 2.2;
    rig.position.z = e * 3;
    rig.rotation.set(
      tiltX + e * 0.55 + Math.sin(t * 0.7) * 0.015,
      yaw + rigRot + Math.sin(t * 0.35) * 0.04 + e * 0.5,
      tiltZ + e * -0.12
    );

    // traces etch in after the parts land
    traceSegs.forEach(function (s) {
      var k = THREE.MathUtils.clamp((t - s.userData.delay) / 0.35, 0, 1);
      k = 1 - Math.pow(1 - k, 3);
      if (s.userData.len) s.scale.x = Math.max(0.0001, s.userData.len * k);
      else s.scale.setScalar(Math.max(0.0001, k));
    });

    // hover: the part under the cursor lifts and the cursor changes
    var over = (pointerIn && !drag) ? pick() : null;
    if (over !== hovered) {
      hovered = over;
      canvas.style.cursor = hovered ? 'pointer' : '';
      stage.classList.toggle('over-part', !!hovered);
    }
    if (pointerIn) {
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(boardPlane, hitPoint)) {
        rig.worldToLocal(hitPoint);
        cursorLight.position.set(hitPoint.x, 2, hitPoint.z);
        rig.localToWorld(cursorLight.position);
      }
      cursorLight.intensity += (14 - cursorLight.intensity) * Math.min(1, dt * 3);
    } else {
      cursorLight.intensity += (0 - cursorLight.intensity) * Math.min(1, dt * 3);
    }

    parts.forEach(function (p, i) {
      // gravity and bounce
      p.vy -= 30 * dt;
      p.yo += p.vy * dt;
      if (p.yo < 0) {
        p.yo = 0;
        if (p.vy < -2) {
          var impact = -p.vy;
          p.vy = impact * 0.4;
          p.vsq -= impact * 0.09;
          if (impact > 6) shake = Math.max(shake, Math.min(0.25, impact * 0.01));
        } else {
          p.vy = 0;
        }
      }
      // squash and stretch as a wobbly spring
      p.vsq += (-p.sq * 260 - p.vsq * 9) * dt;
      p.sq += p.vsq * dt;
      var sq = THREE.MathUtils.clamp(p.sq, -0.45, 0.45);
      // spin, then settle back to how it sat
      p.spin += p.vspin * dt;
      p.vspin *= Math.exp(-dt * 2.2);
      if (p.yo === 0 && Math.abs(p.vspin) < 1.5) {
        var target = Math.round(p.spin / (Math.PI * 2)) * Math.PI * 2;
        p.vspin += (target - p.spin) * 30 * dt - p.vspin * 6 * dt;
      }
      p.flip += p.vflip * dt;
      p.vflip *= Math.exp(-dt * 2.5);
      if (p.yo === 0 && Math.abs(p.vflip) < 2) {
        var ft = Math.round(p.flip / (Math.PI * 2)) * Math.PI * 2;
        p.vflip += (ft - p.flip) * 30 * dt - p.vflip * 6 * dt;
      }
      // hover lift
      p.liftT = (p === hovered) ? 0.35 : 0;
      p.lift += (p.liftT - p.lift) * Math.min(1, dt * 10);

      var ex = e * p.explode;
      var spread = 1 + e * 0.45;
      p.group.position.set(p.x * spread, TOP + p.yo + p.lift + ex, p.z * spread);
      p.group.rotation.set(p.flip + e * p.tiltX, p.rot + p.spin, e * p.tiltZ);
      p.group.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);

      if (p.cap) {
        p.press = (p.press || 0) * Math.exp(-dt * 6);
        p.cap.position.y = 0.46 - p.press * 0.12;
      }
    });

    // ambient current from the chip outward; LEDs light when it arrives
    ambientTimer -= dt;
    if (t > 2.2 && ambientTimer <= 0) {
      ambientTimer = 0.18 + Math.random() * 0.25;
      spawn((Math.random() * TRACES.length) | 0, 2.2 + Math.random() * 1.6, false);
    }
    var n = 0;
    for (var i = 0; i < MAX_P; i++) {
      var p = particles[i];
      if (!p.on) { pSize[i] = 0; continue; }
      p.d += p.speed * dt;
      if (p.d >= p.tr.len) {
        p.on = false;
        pSize[i] = 0;
        if (!p.rev && p.tr.to) flashLed(p.tr.to, 0.9);
        continue;
      }
      pointOn(p.tr, p.rev ? p.tr.len - p.d : p.d, tmp);
      pPos[i * 3] = tmp.x; pPos[i * 3 + 1] = tmp.y; pPos[i * 3 + 2] = tmp.z;
      pSize[i] = p.speed > 5 ? 0.9 : 0.62;
      n++;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.size.needsUpdate = true;

    leds.forEach(function (l) {
      var s = l.led;
      s.level *= Math.exp(-dt * 3.2);
      var lv = ledBase + s.level + Math.max(0, Math.sin(t * 2 + l.x)) * 0.08;
      s.mat.emissiveIntensity = 0.2 + lv * 2.2;
      s.glow.material.opacity = Math.min(1, lv * 0.75);
      s.glow.scale.setScalar(1.6 + lv * 1.2);
      s.light.intensity = lv * 3;
    });

    // camera shake on big impacts
    shake *= Math.exp(-dt * 5);
    camBase.copy(camera.position);
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    renderer.render(scene, camera);
    camera.position.copy(camBase);

    if (!readyFired) { readyFired = true; onReady(); }
  };

  var play = function () {
    if (running) return;
    running = true;
    clock.getDelta();
    raf = requestAnimationFrame(frame);
  };
  var pause = function () {
    running = false;
    cancelAnimationFrame(raf);
  };

  // only run while the hero is on screen and the tab is visible
  var visible = true;
  var io = new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (visible && !document.hidden) play(); else pause();
  });
  io.observe(stage);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause(); else if (visible) play();
  });
  play();

  return {
    dispose: function () {
      pause();
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      renderer.dispose();
    }
  };
}
