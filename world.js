/* ==========================================================================
   The Isle of Avalonia — persistent three.js scroll world.
   One scene, one renderer; native scroll (via window.__avProgress set by
   script.js) is the deterministic conductor. Decorative only: the DOM above
   carries the full story, so this module can bail out safely at any point.
   ========================================================================== */

// One trimmed, content-hashed bundle (tools/build-three.sh) instead of fifteen
// modules: a single request, and only the parts of three.js this world uses.
import * as THREE from "./vendor/three-av.e06c6fa89c.min.js";
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass } from "./vendor/three-av.e06c6fa89c.min.js";

const html = document.documentElement;
const canvas = document.getElementById("world");
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function webglAvailable() {
  try {
    const probe = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (probe.getContext("webgl2") || probe.getContext("webgl")));
  } catch {
    return false;
  }
}

if (!canvas || !webglAvailable()) {
  html.classList.add("no-webgl");
} else {
  try {
    boot();
  } catch (error) {
    console.error("Avalonia world failed to start:", error);
    html.classList.add("no-webgl");
  }
}

function boot() {
  /* ---------------------------------------------------------------- palette */
  const BRAND = new THREE.Color("#007df9");
  const BRAND_SOFT = new THREE.Color("#4aa8ff");
  const AURORA_TEAL = new THREE.Color("#19d9b4");
  const AURORA_VIOLET = new THREE.Color("#6a5cff");
  const EMBER = new THREE.Color("#ffb454");
  const SNOW_TINT = new THREE.Color("#dfe9ff");
  const ROCK = new THREE.Color("#16223c");
  const FOG_COLOR = new THREE.Color("#060b18");

  /* --------------------------------------------------------------- renderer */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance"
  });
  const isNarrow = () => window.innerWidth < 820;
  // Recomputed on every resize, so a page opened narrow and then widened is
  // not stuck on phone settings. The governor can only ever lower dprScale.
  let dprScale = 1;
  const pixelRatio = () =>
    Math.min(window.devicePixelRatio || 1, Math.max(1, (isNarrow() ? 1.5 : 2) * dprScale));
  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x04070f, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.012);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 320);
  camera.position.set(0, 5.4, 27);

  /* ------------------------------------------------------------- composer */
  // Bloom runs in linear light and OutputPass applies ACES + sRGB at the very
  // end, which is why tone mapping is not baked into the scene pass. The
  // target is multisampled so the thin ring geometry stops shimmering.
  // MSAA: 4x at 1x density; 2x at 2x density, where 4x would mean sixteen
  // samples per CSS pixel for no visible gain; none on narrow screens.
  const wantedSamples = () => (isNarrow() ? 0 : (window.devicePixelRatio || 1) >= 2 ? 2 : 4);
  const composerTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: wantedSamples()
  });
  const composer = new EffectComposer(renderer, composerTarget);
  composer.addPass(new RenderPass(scene, camera));

  const BLOOM_STRENGTH = 0.62;
  // strength, radius, threshold (linear light: only genuinely emissive things glow)
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), BLOOM_STRENGTH, 0.75, 0.85);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  // Always through the composer. Falling back to renderer.render() would move
  // tone mapping from OutputPass into the materials and visibly shift every
  // additive element; when bloom has to go, the pass fades out instead.
  let bloomLevel = 1;
  let bloomTarget = 1;

  function renderFrame() {
    composer.render();
  }

  function applySize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(width, height, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(width, height);
    // Bloom is soft by nature, so build it from CSS pixels, not device pixels:
    // at 2x density that is a quarter of the work with no visible difference.
    bloomPass.setSize(width, height);
    const samples = wantedSamples();
    [composer.renderTarget1, composer.renderTarget2].forEach((target) => {
      if (target.samples !== samples) {
        target.samples = samples;
        target.dispose();
      }
    });
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  applySize();

  /* ----------------------------------------------------------------- lights */
  const hemi = new THREE.HemisphereLight(0x2c4d8f, 0x040810, 0.62);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xbfd9ff, 0.9);
  const keyColor = new THREE.Color();
  key.position.set(20, 30, 12);
  scene.add(key);

  const portalLight = new THREE.PointLight(0x1e90ff, 60, 42, 2);
  portalLight.position.set(0, 5, 1.4);
  scene.add(portalLight);

  // Warm key on the speaker, cold spill from the screen onto the audience.
  const emberLight = new THREE.PointLight(0xffb454, 40, 11, 2);
  emberLight.position.set(-3.1, 2.9, -14.1);
  scene.add(emberLight);

  const screenSpill = new THREE.PointLight(0x66b5ff, 0, 18, 2);
  screenSpill.position.set(0, 5, -13.2);
  scene.add(screenSpill);

  /* --------------------------------------------------------------- textures */
  function canvasTexture(size, draw) {
    const surface = document.createElement("canvas");
    surface.width = surface.height = size;
    draw(surface.getContext("2d"), size);
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  const glowTexture = canvasTexture(128, (ctx, size) => {
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.28, "rgba(255,255,255,0.4)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  });

  const starTexture = canvasTexture(64, (ctx, size) => {
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(220,235,255,0.55)");
    gradient.addColorStop(1, "rgba(220,235,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  });

  const flakeTexture = canvasTexture(64, (ctx, size) => {
    const half = size / 2;
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.translate(half, half);
    for (let arm = 0; arm < 6; arm += 1) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.lineTo(0, half - 8);
      ctx.moveTo(0, half * 0.45);
      ctx.lineTo(7, half * 0.62);
      ctx.moveTo(0, half * 0.45);
      ctx.lineTo(-7, half * 0.62);
      ctx.stroke();
    }
  });

  /* ------------------------------------------------------------ environment */
  const environment = new THREE.Group();
  scene.add(environment);

  // Stars
  const STAR_COUNT = 850;
  const starGeometry = new THREE.BufferGeometry();
  {
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i += 1) {
      const radius = 95 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) * 0.9 - 8;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  }
  const starMaterial = new THREE.PointsMaterial({
    map: starTexture,
    size: 1.1,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  environment.add(stars);

  // Moon + halo
  // Moonlight from behind rims the island and the platform rocks, so their
  // silhouettes separate from the night instead of reading as black lumps.
  // A directional light is a single dot product per fragment: nearly free.
  const moonRim = new THREE.DirectionalLight(0x9fc4ff, 1.15);
  moonRim.position.set(30, 24, -52);
  scene.add(moonRim);

  // Moon surface: pale maria rather than a flat white disc.
  const moonTexture = canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = "#e4ecfb";
    ctx.fillRect(0, 0, size, size);
    [
      [0.3, 0.38, 0.13, 0.34],
      [0.46, 0.55, 0.09, 0.28],
      [0.58, 0.34, 0.07, 0.24],
      [0.38, 0.66, 0.06, 0.2],
      [0.66, 0.6, 0.05, 0.18]
    ].forEach(([x, y, r, alpha]) => {
      const maria = ctx.createRadialGradient(x * size, y * size, 0, x * size, y * size, r * size);
      maria.addColorStop(0, `rgba(122, 142, 186, ${alpha})`);
      maria.addColorStop(1, "rgba(122, 142, 186, 0)");
      ctx.fillStyle = maria;
      ctx.fillRect(0, 0, size, size);
    });
  });
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 24, 18),
    new THREE.MeshBasicMaterial({ map: moonTexture, fog: false })
  );
  moon.position.set(30, 24, -52);
  environment.add(moon);

  const moonHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x9fd1ff,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false
    })
  );
  moonHalo.scale.setScalar(18);
  moonHalo.position.copy(moon.position);
  environment.add(moonHalo);

  // Aurora ribbons
  const auroraUniforms = [];
  const auroraRibbons = [];
  const auroraConfigs = [
    { width: 150, height: 30, position: [-12, 34, -78], rotationY: 0.12, hueShift: 0 },
    { width: 120, height: 24, position: [34, 40, -92], rotationY: -0.34, hueShift: 0.35 },
    { width: 100, height: 20, position: [-52, 42, -96], rotationY: 0.5, hueShift: 0.65 }
  ];

  auroraConfigs.forEach((config) => {
    const uniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 0.85 },
      uShift: { value: config.hueShift },
      uTeal: { value: AURORA_TEAL },
      uBlue: { value: BRAND_SOFT },
      uViolet: { value: AURORA_VIOLET }
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          float sway = sin(uv.x * 9.42 + uTime * 0.35) * 1.4 + sin(uv.x * 17.0 - uTime * 0.52) * 0.7;
          p.y += sway * uv.y;
          p.z += sin(uv.x * 6.0 + uTime * 0.3) * 1.1 * uv.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uOpacity;
        uniform float uShift;
        uniform vec3 uTeal;
        uniform vec3 uBlue;
        uniform vec3 uViolet;
        varying vec2 vUv;
        void main() {
          float edge = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
          float rays = 0.76 + 0.24 * sin(vUv.x * 46.0 + sin(vUv.x * 13.0 + uTime * 0.12) * 3.4 + uTime * 0.3);
          float band = pow(smoothstep(1.0, 0.04, vUv.y), 2.3) * smoothstep(0.0, 0.18, vUv.y);
          float glow = band * rays * edge;
          vec3 color = mix(uTeal, uBlue, clamp(vUv.x * 1.3 - 0.15 + uShift * 0.4, 0.0, 1.0));
          color = mix(color, uViolet, vUv.y * 0.5);
          gl_FragColor = vec4(color * glow * uOpacity, glow * uOpacity);
        }
      `
    });
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(config.width, config.height, 96, 1), material);
    ribbon.position.set(...config.position);
    ribbon.rotation.y = config.rotationY;
    environment.add(ribbon);
    auroraUniforms.push(uniforms);
    auroraRibbons.push(ribbon);
  });

  /* ----------------------------------------------------------------- island */
  function makeRock(radius, plateauY, seed) {
    const source = new THREE.IcosahedronGeometry(radius, 2);
    const geometry = source.index ? source.toNonIndexed() : source;
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const hash = (x, y, z) => {
      const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 91.7) * 43758.5453;
      return s - Math.floor(s);
    };

    for (let i = 0; i < positions.count; i += 1) {
      vertex.fromBufferAttribute(positions, i);
      const jitter = hash(vertex.x, vertex.y, vertex.z);
      vertex.x *= 1 + (jitter - 0.5) * 0.34;
      vertex.z *= 1 + (hash(vertex.z, vertex.x, vertex.y) - 0.5) * 0.34;
      if (vertex.y > plateauY) {
        vertex.y = plateauY + (jitter - 0.5) * 0.25;
      } else if (vertex.y < -radius * 0.2) {
        vertex.y *= 1.45 + jitter * 0.5;
      }
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geometry.computeVertexNormals();

    // Per-face colors: snow on up-facing faces, rock elsewhere.
    const colors = new Float32Array(positions.count * 3);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const color = new THREE.Color();

    for (let face = 0; face < positions.count / 3; face += 1) {
      a.fromBufferAttribute(positions, face * 3);
      b.fromBufferAttribute(positions, face * 3 + 1);
      c.fromBufferAttribute(positions, face * 3 + 2);
      normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a)).normalize();
      const shade = 0.82 + hash(a.x, a.y, a.z) * 0.36;
      if (normal.y > 0.55) {
        color.copy(SNOW_TINT).multiplyScalar(shade);
      } else {
        color.copy(ROCK).multiplyScalar(shade * (normal.y > -0.2 ? 1 : 0.62));
      }
      for (let v = 0; v < 3; v += 1) {
        colors[(face * 3 + v) * 3] = color.r;
        colors[(face * 3 + v) * 3 + 1] = color.g;
        colors[(face * 3 + v) * 3 + 2] = color.b;
      }
    }

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.95,
        metalness: 0,
        // Faint cold lift so shadow-side silhouettes never collapse to black.
        emissive: 0x101a30,
        emissiveIntensity: 0.35
      })
    );
  }

  const island = new THREE.Group();
  scene.add(island);

  const mainRock = makeRock(7, 1.3, 1);
  island.add(mainRock);

  // A grove of snowy pines gives the island scale and makes it a place. Each
  // tree is three stacked cones of one instanced geometry. None stand behind
  // the ring's opening, or they would show through it and clutter the mark.
  const pineGeometry = new THREE.ConeGeometry(0.62, 1.25, 7, 1);
  {
    const position = pineGeometry.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const needles = new THREE.Color(0x0f2a3d);
    for (let i = 0; i < position.count; i += 1) {
      // Apex vertices are snow, base vertices are needles: each face grades
      // from a dusted tip to dark boughs.
      const tint = position.getY(i) > 0 ? SNOW_TINT : needles;
      colors.set([tint.r, tint.g, tint.b], i * 3);
    }
    pineGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }
  const PINES = [
    [-5.0, -0.6, 1.0], [-4.4, -2.5, 1.25], [-3.8, -3.9, 0.95], [3.9, -3.8, 1.3], [4.5, -2.3, 1.0],
    [5.1, -0.5, 1.2], [-5.2, 1.3, 0.85], [5.2, 1.4, 0.9], [-3.9, 1.9, 0.7], [4.0, 2.2, 0.75]
  ];
  const TIERS = [
    [0, 1],
    [0.55, 0.78],
    [1.0, 0.56]
  ];
  const pines = new THREE.InstancedMesh(
    pineGeometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.9,
      emissive: 0x0b1a2c,
      emissiveIntensity: 0.4
    }),
    PINES.length * TIERS.length
  );
  {
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const offset = new THREE.Vector3();
    let n = 0;
    PINES.forEach(([x, z, size], tree) => {
      rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tree * 1.9);
      TIERS.forEach(([rise, width]) => {
        scale.set(width * size, width * size, width * size);
        offset.set(x, 1.25 + (0.62 + rise) * size, z);
        matrix.compose(offset, rotation, scale);
        pines.setMatrixAt(n, matrix);
        n += 1;
      });
    });
  }
  island.add(pines);

  const spikeMaterial = new THREE.MeshStandardMaterial({ color: 0x101b33, flatShading: true, roughness: 1 });
  [
    [0, -8.5, 0, 2.6, 8],
    [-3.2, -6.5, 1.8, 1.5, 5],
    [2.8, -6, -2, 1.7, 5.5]
  ].forEach(([x, y, z, coneRadius, coneHeight]) => {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(coneRadius, coneHeight, 6), spikeMaterial);
    spike.rotation.x = Math.PI;
    spike.position.set(x, y, z);
    island.add(spike);
  });

  /* ------------------------------------------------------- platform islands */
  // Avalonia's promise laid out in space: the main island is the codebase and
  // every target platform is an island around it, flying its own flag. They
  // are revealed along the journey rather than all at once: the hero flies the
  // desktop platforms, and turning toward the day-dial reveals mobile and web.
  // Where each sits is not fixed in the world but worked out per viewport in
  // composeChapters(): anchored on screen beside its home subject, clear of
  // the copy, and yawed to face that chapter's camera. One navy cloth for all
  // six keeps the palette whole; the colour lives in each mark, and an
  // Avalonia-blue stripe at the hoist ties each flag back to the centre.
  // [name, home chapter, distance from that chapter's camera]
  const PLATFORMS = [
    ["Windows", "hero", 52],
    ["macOS", "hero", 44],
    ["Linux", "hero", 56],
    ["iOS", "dial", 44],
    ["Android", "dial", 46],
    ["WebAssembly", "dial", 48]
  ];

  const ellipse = (ctx, x, y, rx, ry, rotation = 0) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
    ctx.fill();
  };
  const roundedRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  // Icons are drawn on their own canvas so cut-outs (the apple's bite, the
  // Android eyes, the WebAssembly notch) cannot punch through the cloth.
  const cut = (ctx, draw) => {
    ctx.globalCompositeOperation = "destination-out";
    draw();
    ctx.globalCompositeOperation = "source-over";
  };

  function drawApple(ctx, cx, cy, s, color) {
    const r = s * 0.25;
    const y = cy + r * 0.2;
    ctx.fillStyle = color;
    ellipse(ctx, cx - r * 0.45, y, r * 0.85, r * 1.15);
    ellipse(ctx, cx + r * 0.45, y, r * 0.85, r * 1.15);
    ellipse(ctx, cx, y + r * 0.6, r * 1.05, r * 1.15);
    cut(ctx, () => {
      ellipse(ctx, cx, y - r * 1.08, r * 0.28, r * 0.28);
      ellipse(ctx, cx + r * 1.55, y - r * 0.1, r * 0.5, r * 0.5);
    });
    ellipse(ctx, cx + r * 0.22, y - r * 1.62, r * 0.2, r * 0.46, Math.PI / 4.5);
  }

  const ICONS = {
    Windows(ctx, cx, cy, s) {
      const gap = s * 0.06;
      const q = (s * 0.84 - gap) / 2;
      const x0 = cx - q - gap / 2;
      const y0 = cy - q - gap / 2;
      ctx.fillStyle = "#3aa0ff";
      for (let i = 0; i < 4; i += 1) ctx.fillRect(x0 + (i % 2) * (q + gap), y0 + Math.floor(i / 2) * (q + gap), q, q);
    },
    macOS(ctx, cx, cy, s) {
      drawApple(ctx, cx, cy, s, "#e8eef8");
    },
    iOS(ctx, cx, cy, s) {
      // A handset around the apple, so macOS and iOS are not twins.
      const w = s * 0.56;
      const h = s * 0.98;
      ctx.strokeStyle = "#e8eef8";
      ctx.lineWidth = s * 0.05;
      roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, w * 0.22);
      ctx.stroke();
      drawApple(ctx, cx, cy + s * 0.02, s * 0.44, "#e8eef8");
    },
    Linux(ctx, cx, cy, s) {
      const k = s / 150;
      ctx.lineWidth = 3 * k;
      ctx.strokeStyle = "#7f93bd"; // a black penguin disappears into navy cloth
      ctx.fillStyle = "#0a0c12";
      ellipse(ctx, cx, cy + 12 * k, 44 * k, 60 * k);
      ctx.stroke();
      ellipse(ctx, cx, cy - 40 * k, 30 * k, 28 * k);
      ctx.stroke();
      ctx.fillStyle = "#f2f4f8";
      ellipse(ctx, cx, cy + 20 * k, 29 * k, 46 * k);
      ellipse(ctx, cx - 9 * k, cy - 42 * k, 8 * k, 10 * k);
      ellipse(ctx, cx + 9 * k, cy - 42 * k, 8 * k, 10 * k);
      ctx.fillStyle = "#0a0c12";
      ellipse(ctx, cx - 8 * k, cy - 40 * k, 3.5 * k, 4.5 * k);
      ellipse(ctx, cx + 8 * k, cy - 40 * k, 3.5 * k, 4.5 * k);
      ctx.fillStyle = "#ffb000";
      ellipse(ctx, cx, cy - 28 * k, 12 * k, 6 * k);
      ellipse(ctx, cx - 22 * k, cy + 70 * k, 20 * k, 8 * k);
      ellipse(ctx, cx + 22 * k, cy + 70 * k, 20 * k, 8 * k);
    },
    Android(ctx, cx, cy, s) {
      const r = s * 0.46;
      const base = cy + r * 0.42;
      ctx.fillStyle = "#3ddc84";
      ctx.beginPath();
      ctx.arc(cx, base, r, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#3ddc84";
      ctx.lineWidth = s * 0.045;
      ctx.lineCap = "round";
      [Math.PI * 0.66, Math.PI * 0.34].forEach((a) => {
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.92 * Math.cos(a), base - r * 0.92 * Math.sin(a));
        ctx.lineTo(cx + r * 1.3 * Math.cos(a), base - r * 1.3 * Math.sin(a));
        ctx.stroke();
      });
      cut(ctx, () => {
        ellipse(ctx, cx - r * 0.42, base - r * 0.45, r * 0.1, r * 0.1);
        ellipse(ctx, cx + r * 0.42, base - r * 0.45, r * 0.1, r * 0.1);
      });
    },
    WebAssembly(ctx, cx, cy, s) {
      const w = s * 0.84;
      const x0 = cx - w / 2;
      const y0 = cy - w / 2;
      ctx.fillStyle = "#654ff0";
      roundedRect(ctx, x0, y0, w, w, w * 0.07);
      ctx.fill();
      cut(ctx, () => ellipse(ctx, cx, y0, w * 0.17, w * 0.17));
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${Math.round(w * 0.36)}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("WA", cx, y0 + w * 0.88);
    }
  };

  function flagTexture(name) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 340;
    const ctx = canvas.getContext("2d");
    const cloth = ctx.createLinearGradient(0, 0, 0, 340);
    cloth.addColorStop(0, "#14294c");
    cloth.addColorStop(1, "#0a1629");
    ctx.fillStyle = cloth;
    ctx.fillRect(0, 0, 512, 340);
    ctx.fillStyle = "#007df9";
    ctx.fillRect(0, 0, 24, 340);

    const icon = document.createElement("canvas");
    icon.width = icon.height = 230;
    ICONS[name](icon.getContext("2d"), 115, 115, 176);
    ctx.drawImage(icon, 268 - 115, 126 - 115);

    ctx.fillStyle = "#eaf2ff";
    ctx.textAlign = "center";
    ctx.font = `700 ${name.length > 8 ? 46 : 56}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillText(name, 268, 316);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  // Unlit so the flags read at night; the wave is displaced in the vertex
  // shader and its slope darkens the folds, so the cloth reads as cloth.
  // The clock is the ambient one, so flags calm down while the reader reads.
  const flagTime = { value: 0 };
  function makeFlagMaterial(texture, phase) {
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = flagTime;
      shader.uniforms.uPhase = { value: phase };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float uTime;\nuniform float uPhase;\nvarying float vFold;"
        )
        .replace(
          "#include <begin_vertex>",
          `vec3 transformed = vec3(position);
          float fly = uv.x; // 0 at the pole, 1 at the free end, which moves most
          float wind = uTime * 2.4 + uPhase;
          float amp = 0.5 * fly;
          transformed.z += sin(fly * 6.5 - wind) * amp + sin(fly * 13.0 - wind * 1.6 + uv.y * 2.2) * amp * 0.22;
          transformed.y -= fly * fly * 0.2;
          vFold = 0.78 + 0.22 * clamp(-cos(fly * 6.5 - wind) * 6.5 * amp * 0.6, -1.0, 1.0);`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vFold;")
        .replace("#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.rgb *= vFold;");
    };
    return material;
  }

  // Flags read as distant landmarks, not billboards: the whole island (rock,
  // pole and cloth, wave included) is built at full size and scaled down once.
  const ISLAND_SIZE = 0.7;
  const POLE_HEIGHT = 5.4;
  const CLOTH_W = 4.6;
  const CLOTH_H = 3.04;
  const poleGeometry = new THREE.CylinderGeometry(0.07, 0.09, POLE_HEIGHT, 8);
  const finialGeometry = new THREE.SphereGeometry(0.17, 14, 12);
  const clothGeometry = new THREE.PlaneGeometry(CLOTH_W, CLOTH_H, 32, 10);
  clothGeometry.translate(CLOTH_W / 2, 0, 0); // hoist edge on the pole
  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a3552,
    metalness: 0.6,
    roughness: 0.35,
    emissive: 0x0b1426,
    emissiveIntensity: 0.6,
    transparent: true
  });
  const finialMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a1430,
    emissive: BRAND,
    emissiveIntensity: 2.2,
    transparent: true
  });

  const ROCK_SCALE = 0.27;
  const platformIslands = PLATFORMS.map(([name, home, distance], index) => {
    const group = new THREE.Group();
    group.scale.setScalar(ISLAND_SIZE);
    const rock = makeRock(6, 1.2, index + 2);
    rock.material.transparent = true;
    rock.scale.setScalar(ROCK_SCALE);
    const top = 1.2 * ROCK_SCALE;
    // Pole and finial materials are per island so each trio fades on its own.
    const pole = new THREE.Mesh(poleGeometry, poleMaterial.clone());
    pole.position.set(-0.9, top + POLE_HEIGHT / 2 - 0.15, 0);
    const finial = new THREE.Mesh(finialGeometry, finialMaterial.clone());
    finial.position.set(-0.9, top + POLE_HEIGHT - 0.05, 0);
    const cloth = new THREE.Mesh(clothGeometry, makeFlagMaterial(flagTexture(name), index * 1.7));
    cloth.position.set(-0.83, top + POLE_HEIGHT - 0.25 - CLOTH_H / 2, 0);
    group.add(rock, pole, finial, cloth);
    scene.add(group);
    return {
      group,
      home,
      distance,
      baseY: 0,
      phase: index * 2.1,
      materials: [rock.material, cloth.material, pole.material, finial.material]
    };
  });

  // Visual extent of one island (rock to finial, pole to fly), measured once at
  // the origin so screen placement can reason in pixels.
  const islandBox = new THREE.Box3().setFromObject(platformIslands[0].group);
  const islandSize = islandBox.getSize(new THREE.Vector3());
  const islandCenter = islandBox.getCenter(new THREE.Vector3());

  /* ----------------------------------------------------------------- portal */
  const portal = new THREE.Group();
  portal.position.set(0, 5.7, 0);
  island.add(portal);
  const portalWorldPosition = new THREE.Vector3();

  // The conference logo as architecture: a dashed orbit ring with people
  // connecting on it (community tech event), plus the small orbit dots.
  const RING_RADIUS = 3.1;
  const DEG = Math.PI / 180;
  const ringMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a1430,
    emissive: BRAND,
    emissiveIntensity: 2.4,
    roughness: 0.4,
    metalness: 0.2
  });
  // Logo layout: 3 people nodes and 3 small dots alternating every 60°, with
  // the dashed arcs running exactly between them — every gap is centred on the
  // thing that sits in it.
  // Same angles as the flat logo (badge-*.svg), so 2D and 3D are one mark.
  const PEOPLE_ANGLES = [60, 185, 290];
  const DOT_ANGLES = [130, 235, 350];
  const PERSON_GAP = 11;
  const DOT_GAP = 6;

  const ringStops = [
    ...PEOPLE_ANGLES.map((angle) => ({ angle, gap: PERSON_GAP })),
    ...DOT_ANGLES.map((angle) => ({ angle, gap: DOT_GAP }))
  ].sort((a, b) => a.angle - b.angle);

  ringStops.forEach((stop, index) => {
    const next = ringStops[(index + 1) % ringStops.length];
    const from = stop.angle + stop.gap;
    const to = (next.angle < from ? next.angle + 360 : next.angle) - next.gap;
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(RING_RADIUS, 0.11, 10, 48, (to - from) * DEG),
      ringMaterial
    );
    arc.rotation.z = from * DEG;
    portal.add(arc);
  });

  const dotMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xdfe9ff,
    emissiveIntensity: 2.6,
    roughness: 0.3
  });
  const dotGeometry = new THREE.SphereGeometry(0.15, 14, 12);
  DOT_ANGLES.forEach((angle) => {
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.position.set(Math.cos(angle * DEG) * RING_RADIUS, Math.sin(angle * DEG) * RING_RADIUS, 0);
    portal.add(dot);
  });

  // A logo node: a filled brand-blue disc centred ON the ring, carrying a white
  // person glyph — the same construction as the flat mark.
  function makeRingNode() {
    const node = new THREE.Group();
    const discMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a1430,
      emissive: BRAND,
      emissiveIntensity: 2.2,
      roughness: 0.35,
      metalness: 0.15
    });
    const disc = new THREE.Mesh(new THREE.SphereGeometry(0.46, 22, 18), discMaterial);
    disc.scale.z = 0.5;

    const glyphMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xeaf2ff,
      emissiveIntensity: 1.9,
      roughness: 0.3
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), glyphMaterial);
    head.position.set(0, 0.12, 0.16);
    head.scale.z = 0.55;
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), glyphMaterial);
    shoulders.scale.set(1, 0.8, 0.3);
    shoulders.position.set(0, -0.17, 0.17);

    node.add(disc, head, shoulders);
    node.userData.material = discMaterial;
    node.userData.glyph = glyphMaterial;
    return node;
  }

  const ringPeople = [];
  PEOPLE_ANGLES.forEach((angle, index) => {
    const node = makeRingNode();
    node.userData.angle = angle * DEG;
    node.userData.phase = index * 2.1;
    portal.add(node);
    ringPeople.push(node);
  });

  // Light chords between the people: the "connecting" in the logo.
  const chordPositions = new Float32Array(18);
  const chordGeometry = new THREE.BufferGeometry();
  chordGeometry.setAttribute("position", new THREE.BufferAttribute(chordPositions, 3));
  const chordMaterial = new THREE.LineBasicMaterial({
    color: 0x2be4c6,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  portal.add(new THREE.LineSegments(chordGeometry, chordMaterial));

  const discUniforms = { uTime: { value: 0 }, uOpacity: { value: 0.4 }, uA: { value: BRAND }, uB: { value: AURORA_TEAL } };
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(2.95, 48),
    new THREE.ShaderMaterial({
      uniforms: discUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uA;
        uniform vec3 uB;
        varying vec2 vUv;
        void main() {
          vec2 centered = vUv - 0.5;
          float r = length(centered) * 2.0;
          float angle = atan(centered.y, centered.x);
          float swirl = 0.2 + 0.16 * sin(angle * 3.0 + r * 7.0 - uTime * 1.3);
          float mask = smoothstep(1.0, 0.15, r);
          vec3 color = mix(uA, uB, r);
          float alpha = swirl * mask * uOpacity;
          gl_FragColor = vec4(color * alpha, alpha);
        }
      `
    })
  );
  portal.add(disc);

  // The Avalonia teardrop at the centre of the mark: a circle whose bottom-right
  // quadrant squares off, hollowed by the same silhouette, with the counter dot
  // and the notch on the left edge.
  function teardropPath(path, radius) {
    path.absarc(0, 0, radius, 0, Math.PI * 1.5, false);
    path.lineTo(radius * 0.72, -radius);
    path.quadraticCurveTo(radius, -radius, radius, -radius * 0.72);
    path.lineTo(radius, 0);
    path.closePath();
    return path;
  }

  // Proportions taken from the flat mark: stroke and counter relative to the
  // outer radius, and the mark itself ~0.61 of the orbit.
  const MARK_RADIUS = RING_RADIUS * 0.65;
  const MARK_HOLE = 0.68;
  const markMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b1732,
    emissive: BRAND,
    emissiveIntensity: 1.9,
    roughness: 0.34,
    metalness: 0.18,
    transparent: true
  });

  const markShape = teardropPath(new THREE.Shape(), MARK_RADIUS);
  markShape.holes.push(teardropPath(new THREE.Path(), MARK_RADIUS * MARK_HOLE));
  const markGeometry = new THREE.ExtrudeGeometry(markShape, {
    depth: 0.3,
    curveSegments: 48,
    bevelEnabled: true,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    bevelSegments: 2
  });
  markGeometry.translate(0, 0, -0.15);

  const mark = new THREE.Group();
  mark.add(new THREE.Mesh(markGeometry, markMaterial));

  const counter = new THREE.Mesh(new THREE.SphereGeometry(MARK_RADIUS * 0.33, 22, 18), markMaterial);
  counter.scale.z = 0.62;
  mark.add(counter);

  // Reads as a hole punched in the stroke, exactly like the flat logo.
  const notchMaterial = new THREE.MeshBasicMaterial({ color: 0x070d1c, transparent: true });
  const notch = new THREE.Mesh(new THREE.SphereGeometry(MARK_RADIUS * (1 - MARK_HOLE) * 0.5, 16, 14), notchMaterial);
  notch.scale.z = 0.9;
  notch.position.set((-MARK_RADIUS * (1 + MARK_HOLE)) / 2, 0, 0);
  mark.add(notch);

  portal.add(mark);

  const portalGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x2a8cff,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  portalGlow.scale.setScalar(13);
  portal.add(portalGlow);

  /* ----------------------------------------------------- CFP topic crystals */
  const crystals = [];
  const crystalGroup = new THREE.Group();
  crystalGroup.position.copy(portal.position);
  island.add(crystalGroup);

  for (let i = 0; i < 6; i += 1) {
    const material = new THREE.MeshStandardMaterial({
      color: 0x14213f,
      emissive: BRAND,
      emissiveIntensity: 0.5,
      flatShading: true,
      roughness: 0.35,
      metalness: 0.1,
      transparent: true
    });
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.44, 0), material);
    crystal.scale.set(1, 1.7, 1);
    crystal.userData.topicIndex = i;
    crystalGroup.add(crystal);
    crystals.push({
      mesh: crystal,
      material,
      angle: (i / 6) * Math.PI * 2,
      // A crown above the ring. The old orbit ran at the mark's own height, so
      // every revolution carried a crystal straight across the front of the "a".
      radius: 4.3 + (i % 2) * 0.35,
      height: 4.25 + (i % 3) * 0.3,
      spin: 0.3 + (i % 3) * 0.17,
      hover: 0
    });
  }

  /* ------------------------------------------------------------------ stage */
  const stage = new THREE.Group();
  stage.position.set(0, 5.2, -15);
  scene.add(stage);

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a1226,
    roughness: 0.6,
    metalness: 0.3,
    transparent: true,
    opacity: 0
  });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(6.6, 3.9, 0.2), frameMaterial);
  stage.add(frame);

  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 640;
  screenCanvas.height = 360;
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;

  function drawScreen() {
    const strings = window.__avStrings || {
      live: "LIVE",
      session: "Avalonia session",
      speaker: "Speaker",
      duration: "45 min",
      break: "5 min break",
      pause: "14:00-15:00"
    };
    const ctx = screenCanvas.getContext("2d");
    const { width, height } = screenCanvas;
    ctx.clearRect(0, 0, width, height);

    const backdrop = ctx.createLinearGradient(0, 0, 0, height);
    backdrop.addColorStop(0, "#0c1730");
    backdrop.addColorStop(1, "#060d1e");
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(74,168,255,0.5)";
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, width - 12, height - 12);

    ctx.fillStyle = "#ffb454";
    ctx.beginPath();
    ctx.arc(42, 46, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "600 26px ui-monospace, Menlo, monospace";
    ctx.fillStyle = "#ffd9a0";
    ctx.fillText(strings.live, 62, 55);

    ctx.font = "700 44px ui-sans-serif, system-ui";
    ctx.fillStyle = "#eaf2ff";
    ctx.fillText(strings.session, 42, 172);
    ctx.font = "500 30px ui-sans-serif, system-ui";
    ctx.fillStyle = "#9fb2d6";
    ctx.fillText(`${strings.speaker} · ${strings.duration}`, 42, 218);

    ctx.font = "500 24px ui-monospace, Menlo, monospace";
    ctx.fillStyle = "#4aa8ff";
    ctx.fillText(`${strings.break}  ·  ${strings.pause}`, 42, 310);

    screenTexture.needsUpdate = true;
  }

  drawScreen();
  document.addEventListener("av:lang", drawScreen);

  const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture, transparent: true });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.5), screenMaterial);
  screen.position.z = 0.12;
  stage.add(screen);

  /* ------------------------------------------------------------ auditorium */
  // Raked rows of attendees facing the screen. The screen spill lights their
  // far side only, so from the camera they read as silhouettes against the
  // glow — that contrast is what makes it look like a session in progress.
  const deckMaterial = new THREE.MeshStandardMaterial({
    color: 0x0c1930,
    emissive: 0x16294a,
    emissiveIntensity: 0.4,
    roughness: 0.85,
    transparent: true,
    opacity: 0
  });
  const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x4aa8ff, transparent: true, opacity: 0 });
  const attendeeMaterial = new THREE.MeshStandardMaterial({
    color: 0x060c18,
    emissive: 0x16294a,
    emissiveIntensity: 0.2,
    roughness: 0.9,
    metalness: 0.05,
    transparent: true,
    opacity: 0
  });

  const audience = new THREE.Group();
  audience.position.y = 0.35;
  stage.add(audience);

  // Raked: each row back from the screen sits higher, so the tiers separate
  // instead of stacking into one line.
  const seats = [];
  [
    { z: 2.2, deckY: -3.1, halfWidth: 2.4, count: 6 },
    { z: 4, deckY: -2.75, halfWidth: 3, count: 7 },
    { z: 5.8, deckY: -2.4, halfWidth: 3.6, count: 8 }
  ].forEach((row, rowIndex) => {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(row.halfWidth * 2 + 1.1, 0.18, 0.95), deckMaterial);
    deck.position.set(0, row.deckY, row.z);
    audience.add(deck);

    const edge = new THREE.Mesh(new THREE.BoxGeometry(row.halfWidth * 2 + 1.1, 0.035, 0.05), edgeMaterial);
    edge.position.set(0, row.deckY + 0.1, row.z + 0.5);
    audience.add(edge);

    for (let i = 0; i < row.count; i += 1) {
      const spread = row.count === 1 ? 0.5 : i / (row.count - 1);
      const wobble = Math.sin(rowIndex * 3.7 + i * 2.3);
      const scale = 0.58 + Math.abs(wobble) * 0.08;
      seats.push({
        x: (spread - 0.5) * 2 * row.halfWidth + wobble * 0.12,
        y: row.deckY + 0.09 + 0.29 * scale,
        z: row.z + wobble * 0.08,
        scale,
        phase: rowIndex * 2.1 + i * 1.3
      });
    }
  });

  const bodyMesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.2, 0.18, 4, 12), attendeeMaterial, seats.length);
  const headMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 14, 12), attendeeMaterial, seats.length);
  bodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  headMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  audience.add(bodyMesh, headMesh);

  const LEAN_AXIS = new THREE.Vector3(0, 0, 1);
  const seatMatrix = new THREE.Matrix4();
  const seatPosition = new THREE.Vector3();
  const seatScale = new THREE.Vector3();
  const seatRotation = new THREE.Quaternion();
  const headOffset = new THREE.Vector3();

  function updateAudience(t) {
    seats.forEach((seat, index) => {
      // Out-of-phase lean and breath: attention, not choreography.
      const lean = Math.sin(t * 0.55 + seat.phase) * 0.035;
      const breath = Math.sin(t * 0.8 + seat.phase * 1.7) * 0.012;
      seatRotation.setFromAxisAngle(LEAN_AXIS, lean);
      seatScale.setScalar(seat.scale);

      seatPosition.set(seat.x, seat.y + breath, seat.z);
      seatMatrix.compose(seatPosition, seatRotation, seatScale);
      bodyMesh.setMatrixAt(index, seatMatrix);

      headOffset.set(0, 0.5 * seat.scale, 0).applyQuaternion(seatRotation);
      seatPosition.set(seat.x + headOffset.x, seat.y + breath + headOffset.y, seat.z + headOffset.z);
      seatMatrix.compose(seatPosition, seatRotation, seatScale);
      headMesh.setMatrixAt(index, seatMatrix);
    });
    bodyMesh.instanceMatrix.needsUpdate = true;
    headMesh.instanceMatrix.needsUpdate = true;
  }

  // A speaker on the platform beside the screen, warm-lit against the cold room.
  const speakerMaterial = new THREE.MeshStandardMaterial({
    color: 0x140f0a,
    emissive: 0x8a5a1e,
    emissiveIntensity: 0.35,
    roughness: 0.85,
    transparent: true,
    opacity: 0
  });
  const speaker = new THREE.Group();
  const speakerHead = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), speakerMaterial);
  speakerHead.position.y = 0.62;
  speaker.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 12), speakerMaterial), speakerHead);
  speaker.position.set(-2.9, -3, 0.6);
  speaker.scale.setScalar(0.95);
  stage.add(speaker);

  const podium = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.95, 0.55), deckMaterial);
  podium.position.set(-2.1, -2.98, 0.75);
  stage.add(podium);

  const stageFloor = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 2.4), deckMaterial);
  stageFloor.position.set(-2.7, -3.55, 0.6);
  stage.add(stageFloor);

  /* --------------------------------------------------------------- day dial */
  // Chapter 03 says "the timing framework is already set", so the 3D *is* that
  // framework: a 12-hour dial whose lit arc is built from the real slots. At
  // 45-minute talks with 5-minute gaps, six talks fill 09:00-13:55 exactly;
  // the 14:00-15:00 pause is the one ember arc. A hand runs 09:00 -> 17:00 as
  // the reader scrolls through the chapter, and slots light as it passes them.
  const DIAL_RADIUS = 2.5;
  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  // Clockwise from 12 o'clock. Deliberately not wrapped modulo 12h, so the
  // whole day is one continuous angle range and no arc straddles a seam.
  const clockAngle = (minutes) => (minutes / 720) * Math.PI * 2;
  const DAY_START = toMinutes("09:00");
  const DAY_END = toMinutes("17:00");
  const SLOT_INSET = THREE.MathUtils.degToRad(0.5); // keeps touching slots apart

  const dial = new THREE.Group();
  dial.position.set(7.83, 5.8, -23.39);
  dial.lookAt(-5.5, 6.5, -15); // square-on to the chapter-03 camera
  scene.add(dial);

  // A real face. The chapter-03 camera looks straight past an islet, so
  // without this the rock's facets show through the dial and clutter it.
  const faceTexture = canvasTexture(256, (ctx, size) => {
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half * 0.9, 0, half, half, half);
    gradient.addColorStop(0, "rgba(18, 34, 68, 1)");
    gradient.addColorStop(0.75, "rgba(8, 15, 32, 1)");
    gradient.addColorStop(1, "rgba(5, 9, 20, 1)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();
  });
  const faceMaterial = new THREE.MeshBasicMaterial({
    map: faceTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const face = new THREE.Mesh(new THREE.CircleGeometry(DIAL_RADIUS - 0.04, 72), faceMaterial);
  face.position.z = -0.2;
  dial.add(face);

  // The rest of the 12-hour face, so the lit day reads as part of a clock.
  const trackMaterial = new THREE.MeshBasicMaterial({ color: 0x4aa8ff, transparent: true, opacity: 0 });
  dial.add(new THREE.Mesh(new THREE.TorusGeometry(DIAL_RADIUS, 0.028, 6, 120), trackMaterial));

  const SLOT_STYLE = {
    talk: { emissive: BRAND, tube: 0.12 },
    pause: { emissive: EMBER, tube: 0.16 },
    close: { emissive: AURORA_TEAL, tube: 0.07 }
  };
  const dialSlots = [
    ["09:00", "09:45", "talk"],
    ["09:50", "10:35", "talk"],
    ["10:40", "11:25", "talk"],
    ["11:30", "12:15", "talk"],
    ["12:20", "13:05", "talk"],
    ["13:10", "13:55", "talk"],
    ["14:00", "15:00", "pause"],
    ["15:00", "15:45", "talk"],
    ["15:50", "16:35", "talk"],
    ["16:40", "17:00", "close"]
  ].map(([from, to, kind]) => {
    const start = toMinutes(from);
    const end = toMinutes(to);
    const c1 = clockAngle(start) + SLOT_INSET;
    const c2 = clockAngle(end) - SLOT_INSET;
    const material = new THREE.MeshStandardMaterial({
      color: 0x0a1430,
      emissive: SLOT_STYLE[kind].emissive,
      emissiveIntensity: 0,
      roughness: 0.4,
      metalness: 0.2
    });
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(DIAL_RADIUS, SLOT_STYLE[kind].tube, 10, 32, c2 - c1),
      material
    );
    // three.js arcs run counter-clockwise from +x; the clock runs clockwise from +y.
    arc.rotation.z = Math.PI / 2 - c2;
    dial.add(arc);
    return { start, end, material };
  });

  // Hour ticks. The conference hours are bright, the rest of the face is not,
  // and the first and last hour of the day are marked long.
  const tickBright = new THREE.MeshBasicMaterial({ color: 0x9fd1ff, transparent: true, opacity: 0 });
  const tickDim = new THREE.MeshBasicMaterial({ color: 0x4a6a99, transparent: true, opacity: 0 });
  for (let hour = 0; hour < 12; hour += 1) {
    const hour24 = hour < 6 ? hour + 12 : hour; // 12..17 afternoon, 6..11 morning
    const inDay = hour24 >= 9 && hour24 <= 17;
    const major = hour24 === 9 || hour24 === 17;
    const length = major ? 0.55 : 0.3;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(major ? 0.075 : 0.05, length, 0.05), inDay ? tickBright : tickDim);
    const angle = Math.PI / 2 - clockAngle(hour * 60);
    const radius = DIAL_RADIUS - 0.42 - length / 2;
    tick.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    tick.rotation.z = angle - Math.PI / 2;
    dial.add(tick);
  }

  const handMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a1430,
    emissive: 0xeaf2ff,
    emissiveIntensity: 0,
    roughness: 0.35
  });
  const hand = new THREE.Group();
  const HAND_LENGTH = DIAL_RADIUS - 0.62;
  const handBar = new THREE.Mesh(new THREE.BoxGeometry(0.07, HAND_LENGTH + 0.5, 0.06), handMaterial);
  handBar.position.y = (HAND_LENGTH - 0.5) / 2; // short tail behind the hub
  const handTip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), handMaterial);
  handTip.position.y = HAND_LENGTH;
  hand.add(handBar, handTip, new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), handMaterial));
  hand.position.z = 0.12;
  dial.add(hand);

  /* ---------------------------------------------------------- constellation */
  // The community chapter reads the sky, so the sky says something. Glyphs are
  // drawn on a 2x3 cell grid as stars plus the segments between them, spelling
  // DOTNET. Six glyphs is a wide word, so GLYPH_SCALE is smaller here than a
  // short word would allow — widen the word before enlarging the letters.
  const GLYPHS = {
    D: {
      width: 1.9,
      points: [[0, 0], [0, 1.5], [0, 3], [1.2, 3], [1.9, 2.1], [1.9, 0.9], [1.2, 0]],
      segments: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]]
    },
    // The one curve in the word, so it gets enough stars to read as a ring.
    O: { width: 2, points: [[1, 3], [1.707, 2.561], [2, 1.5], [1.707, 0.439], [1, 0], [0.293, 0.439], [0, 1.5], [0.293, 2.561]], segments: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0]] },
    T: { width: 2, points: [[0, 3], [1, 3], [2, 3], [1, 0]], segments: [[0, 1], [1, 2], [1, 3]] },
    N: {
      width: 2,
      points: [[0, 0], [0, 3], [1, 1.5], [2, 0], [2, 3]],
      segments: [[0, 1], [1, 2], [2, 3], [3, 4]]
    },
    E: {
      width: 1.7,
      points: [[0, 0], [0, 1.5], [0, 3], [1.7, 3], [1.4, 1.5], [1.7, 0]],
      segments: [[0, 1], [1, 2], [2, 3], [1, 4], [0, 5]]
    }
  };
  const WORD = ["D", "O", "T", "N", "E", "T"];
  const GLYPH_GAP = 0.55;
  const GLYPH_SCALE = 2.8;

  const constellation = new THREE.Group();
  // Raised clear of the moon, which otherwise sits on the foot of the last T.
  constellation.position.set(2.2, 27.2, -38);
  // Square-on to the chapter-04 camera, otherwise the word reads foreshortened.
  constellation.lookAt(-2.5, 8, -6);
  scene.add(constellation);

  // Inner group carries the drift so it cannot clobber the lookAt orientation.
  const constellationDrift = new THREE.Group();
  constellation.add(constellationDrift);

  const jitter = (amount) => (Math.random() - 0.5) * amount;
  // Drawn once per star, so switching layouts rearranges the same sky.
  const starJitter = WORD.map((letter) => GLYPHS[letter].points.map(() => [jitter(0.55), jitter(0.55), jitter(3)]));

  // Rows of letter indices -> star and segment positions. Stars stay in WORD
  // order whatever the rows, so both layouts fill the same buffers.
  function layoutWord(rows, scale) {
    const stars = [];
    const segments = [];
    const rowHeight = 3 + 1.5;
    rows.forEach((row, rowIndex) => {
      const width = row.reduce((total, i) => total + GLYPHS[WORD[i]].width + GLYPH_GAP, -GLYPH_GAP);
      const rowY = ((rows.length - 1) / 2 - rowIndex) * rowHeight;
      let cursor = 0;
      row.forEach((i) => {
        const glyph = GLYPHS[WORD[i]];
        // Placed once and shared, so the lines always land on the visible stars.
        const placed = glyph.points.map(([x, y], p) => [
          (cursor + x - width / 2) * scale + starJitter[i][p][0],
          (y - 1.5 + rowY) * scale + starJitter[i][p][1],
          starJitter[i][p][2]
        ]);
        placed.forEach((point) => stars.push(...point));
        glyph.segments.forEach(([a, b]) => segments.push(...placed[a], ...placed[b]));
        cursor += glyph.width + GLYPH_GAP;
      });
    });
    return { stars: new Float32Array(stars), segments: new Float32Array(segments) };
  }

  // One line on landscape screens; DOT over NET on portrait ones, where the
  // single line is wider than the view.
  const WORD_LAYOUTS = {
    wide: layoutWord([[0, 1, 2, 3, 4, 5]], GLYPH_SCALE),
    tall: layoutWord([[0, 1, 2], [3, 4, 5]], 2.5)
  };

  const nodeGeometry = new THREE.BufferGeometry();
  nodeGeometry.setAttribute("position", new THREE.BufferAttribute(WORD_LAYOUTS.wide.stars.slice(), 3));
  const nodeMaterial = new THREE.PointsMaterial({
    map: starTexture,
    color: 0xcfe4ff,
    size: 2.1,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false
  });
  constellationDrift.add(new THREE.Points(nodeGeometry, nodeMaterial));

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(WORD_LAYOUTS.wide.segments.slice(), 3));
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x7cc2ff,
    transparent: true,
    opacity: 0.06,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  constellationDrift.add(new THREE.LineSegments(lineGeometry, lineMaterial));

  let wordLayout = "wide";
  function syncWordLayout() {
    const next = window.innerWidth / window.innerHeight < 1 ? "tall" : "wide";
    if (next === wordLayout) return;
    wordLayout = next;
    const layout = WORD_LAYOUTS[next];
    [
      [nodeGeometry, layout.stars],
      [lineGeometry, layout.segments]
    ].forEach(([geometry, positions]) => {
      geometry.attributes.position.array.set(positions);
      geometry.attributes.position.needsUpdate = true;
      geometry.computeBoundingSphere();
    });
  }
  syncWordLayout();

  // Unconnected field around the word so it reads as a constellation found in
  // the sky rather than a logo pasted onto it.
  const SCATTER_COUNT = 40;
  const scatterPositions = new Float32Array(SCATTER_COUNT * 3);
  for (let i = 0; i < SCATTER_COUNT; i += 1) {
    scatterPositions[i * 3] = jitter(56);
    scatterPositions[i * 3 + 1] = jitter(26);
    scatterPositions[i * 3 + 2] = jitter(16);
  }
  const scatterGeometry = new THREE.BufferGeometry();
  scatterGeometry.setAttribute("position", new THREE.BufferAttribute(scatterPositions, 3));
  const scatterMaterial = new THREE.PointsMaterial({
    map: starTexture,
    color: 0x9fd1ff,
    size: 1.1,
    transparent: true,
    opacity: 0.05,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false
  });
  constellationDrift.add(new THREE.Points(scatterGeometry, scatterMaterial));

  /* ------------------------------------------------------------------- snow */
  const SNOW_BASE = 250;
  const viewportScale = Math.min(1.3, Math.max(0.5, Math.sqrt((window.innerWidth * window.innerHeight) / (1440 * 900))));
  let snowBudget = Math.round(SNOW_BASE * viewportScale * (isNarrow() ? 0.55 : 1));

  const snowGeometry = new THREE.PlaneGeometry(0.26, 0.3);
  const snowMaterial = new THREE.MeshBasicMaterial({
    map: flakeTexture,
    alphaTest: 0.28,
    side: THREE.DoubleSide,
    color: 0xcfe2ff
  });
  // Alpha-to-coverage turns the hard alpha-test edge into MSAA coverage, which
  // stops flakes shimmering as the camera moves. It needs MSAA to exist: with
  // no samples (narrow screens) keep the hard test or flakes render fat.
  function syncSnowEdges() {
    const msaa = wantedSamples() > 0;
    const test = msaa ? 0.08 : 0.28;
    if (snowMaterial.alphaToCoverage !== msaa || snowMaterial.alphaTest !== test) {
      snowMaterial.alphaToCoverage = msaa;
      snowMaterial.alphaTest = test;
      snowMaterial.needsUpdate = true;
    }
  }
  syncSnowEdges();
  const snow = new THREE.InstancedMesh(snowGeometry, snowMaterial, snowBudget);
  snow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(snow);

  const flakes = [];
  const scratchMatrix = new THREE.Matrix4();
  const scratchQuaternion = new THREE.Quaternion();
  const scratchEuler = new THREE.Euler();
  const scratchScale = new THREE.Vector3();
  const scratchPosition = new THREE.Vector3();
  const forward = new THREE.Vector3();

  function respawnFlake(flake, anywhere) {
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
    forward.normalize();
    const ahead = 16;
    const spread = 24;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * spread;
    flake.x = camera.position.x + forward.x * ahead + Math.cos(angle) * radius;
    flake.z = camera.position.z + forward.z * ahead + Math.sin(angle) * radius;
    flake.y = anywhere ? camera.position.y - 6 + Math.random() * 20 : camera.position.y + 13 + Math.random() * 4;
    flake.fall = 0.9 + Math.random() * 1.3;
    flake.spin = Math.random() * Math.PI * 2;
    flake.spinRate = (0.8 + Math.random() * 1.6) * (Math.random() < 0.5 ? -1 : 1);
    flake.roll = Math.random() * Math.PI * 2;
    flake.rollRate = (0.4 + Math.random() * 0.9) * (Math.random() < 0.5 ? -1 : 1);
    flake.slip = 0.5 + Math.random() * 0.9;
    flake.scale = 0.35 + Math.random() * 0.55;
  }

  for (let i = 0; i < snowBudget; i += 1) {
    const flake = {};
    respawnFlake(flake, true);
    flakes.push(flake);
  }

  function updateSnow(dt, share) {
    snow.count = Math.max(0, Math.round(snowBudget * share));
    for (let i = 0; i < snow.count; i += 1) {
      const flake = flakes[i];
      flake.spin += flake.spinRate * dt;
      flake.roll += flake.rollRate * dt;
      flake.y -= flake.fall * dt;
      flake.x += Math.sin(flake.spin) * flake.slip * dt;

      if (flake.y < camera.position.y - 12 || Math.abs(flake.x - camera.position.x) > 46 || Math.abs(flake.z - camera.position.z) > 46) {
        respawnFlake(flake, false);
      }

      scratchEuler.set(flake.spin, flake.roll, flake.roll * 0.5);
      scratchQuaternion.setFromEuler(scratchEuler);
      scratchPosition.set(flake.x, flake.y, flake.z);
      // A flake brushing the lens would fill the frame as a giant glyph;
      // shrink it away inside a few units of the camera instead.
      const near = scratchPosition.distanceTo(camera.position);
      scratchScale.setScalar(flake.scale * THREE.MathUtils.smoothstep(near, 2, 8));
      scratchMatrix.compose(scratchPosition, scratchQuaternion, scratchScale);
      snow.setMatrixAt(i, scratchMatrix);
    }
    snow.instanceMatrix.needsUpdate = true;
  }

  /* ---------------------------------------------------------------- ledger */
  // camera: [position, target, fov] · world: intensity multipliers 0..1 ·
  // arc: optional lift (world units) at the middle of the flight to the next
  const chapters = [
    {
      light: 0xbfd9ff,
      camera: { position: [-1.5, 6, 29], target: [-3.2, 5.2, 0], fov: 42 },
      world: { fog: 0.012, aurora: 1, snow: 0.9, portal: 1, cryst: 0.02, stage: 0, dial: 0, consts: 0.12, key: 1, isles: 1, reach: 0 }
    },
    {
      light: 0xa6ecdf,
      camera: { position: [8.5, 5.6, 14], target: [1.5, 5, 0.5], fov: 38 },
      world: { fog: 0.015, aurora: 0.7, snow: 0.7, portal: 1, cryst: 1, stage: 0.02, dial: 0, consts: 0.1, key: 1, isles: 0, reach: 0 }
    },
    {
      light: 0x9db4ff,
      camera: { position: [0, 4.8, -5.5], target: [0, 4.9, -14.5], fov: 50 },
      world: { fog: 0.02, aurora: 0.45, snow: 0.35, portal: 1.2, cryst: 0.25, stage: 1, dial: 0, consts: 0.08, key: 0.8, isles: 0, reach: 0 }
    },
    {
      light: 0xffd9b0,
      camera: { position: [-5.5, 6.5, -15], target: [5, 5.2, -26], fov: 42 },
      world: { fog: 0.013, aurora: 0.55, snow: 0.5, portal: 0.5, cryst: 0, stage: 0, dial: 1, consts: 0.2, key: 0.9, isles: 0, reach: 1 }
    },
    {
      light: 0xcdbfff,
      camera: { position: [-2.5, 8, -6], target: [4, 18, -34], fov: 50 },
      world: { fog: 0.007, aurora: 0.95, snow: 0.3, portal: 0.6, cryst: 0, stage: 0, dial: 0, consts: 1, key: 0.7, isles: 0, reach: 0 },
      // Flying from behind the island back to the front would thread the logo
      // ring at eye level; lifting the path mid-flight clears it.
      arc: 6
    },
    {
      light: 0xbfd9ff,
      camera: { position: [-1, 7.2, 23], target: [-2.6, 5.2, 0], fov: 44 },
      world: { fog: 0.01, aurora: 0.55, snow: 0.55, portal: 0.95, cryst: 0.22, stage: 0, dial: 0, consts: 0.35, key: 1, isles: 1, reach: 0 }
    }
  ];

  const rig = {
    target: 0,
    smooth: 0,
    position: new THREE.Vector3(),
    lookAt: new THREE.Vector3(),
    fromPosition: new THREE.Vector3(),
    toPosition: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3()
  };

  const world = {};
  const lightScratch = new THREE.Color();
  const chapterLight = (hex) => lightScratch.setHex(hex);
  const worldKeys = Object.keys(chapters[0].world);

  /* ------------------------------------------------------------ composition
     Copy cards are DOM and subjects are 3D, so neither knows where the other
     sits. Per viewport this measures the card beside each subject and gives
     that chapter a lens shift (an off-axis slide of the whole image, with no
     change in perspective) plus, only if needed, a slightly wider lens, so the
     subject lands in the free side of the page. The platform islands are then
     anchored on screen around their home subject and turned to face it. */
  const UP = new THREE.Vector3(0, 1, 0);
  const lens = chapters.map(() => ({ shift: 0, lift: 0, zoom: 1 }));
  const MAX_ZOOM = 1.3; // multiplier on tan(fov / 2): 50° opens to about 62°
  const DIAL_EXTENT = 2.8; // dial radius including its slot ring
  const screenCenter = new THREE.Vector3();
  const wordCenter = new THREE.Vector3();
  const dialCenter = new THREE.Vector3();
  let islandsShown = true;

  // Narrow viewports: pull back and widen (the copy stacks full width there).
  function framing(aspect) {
    if (aspect >= 1.1) return { pullback: 1, fov: 0 };
    return aspect < 0.75 ? { pullback: 1.3, fov: 9 } : { pullback: 1.15, fov: 5 };
  }

  function chapterPose(index) {
    const { position, target, fov } = chapters[index].camera;
    const aspect = window.innerWidth / window.innerHeight;
    const frame = framing(aspect);
    const pose = {
      position: new THREE.Vector3().fromArray(position),
      target: new THREE.Vector3().fromArray(target),
      shift: lens[index].shift,
      lift: lens[index].lift
    };
    pose.position.sub(pose.target).multiplyScalar(frame.pullback).add(pose.target);
    pose.forward = new THREE.Vector3().subVectors(pose.target, pose.position).normalize();
    pose.right = new THREE.Vector3().crossVectors(pose.forward, UP).normalize();
    pose.up = new THREE.Vector3().crossVectors(pose.right, pose.forward);
    pose.tanV = Math.tan(THREE.MathUtils.degToRad((fov + frame.fov) / 2)) * lens[index].zoom;
    pose.tanH = pose.tanV * aspect;
    return pose;
  }

  // CSS pixels per world unit at a given distance along the view axis.
  const pixelsPerUnit = (pose, depth) => window.innerWidth / 2 / (depth * pose.tanH);

  function toScreen(pose, point) {
    const offset = new THREE.Vector3().subVectors(point, pose.position);
    const depth = offset.dot(pose.forward);
    const x = offset.dot(pose.right) / (depth * pose.tanH) + pose.shift;
    const y = offset.dot(pose.up) / (depth * pose.tanV) + pose.lift;
    return { x: ((x + 1) / 2) * window.innerWidth, y: ((1 - y) / 2) * window.innerHeight, depth };
  }

  function fromScreen(pose, x, y, depth) {
    const ndcX = (x / window.innerWidth) * 2 - 1 - pose.shift;
    const ndcY = 1 - (y / window.innerHeight) * 2 - pose.lift;
    return pose.position
      .clone()
      .addScaledVector(pose.forward, depth)
      .addScaledVector(pose.right, ndcX * pose.tanH * depth)
      .addScaledVector(pose.up, ndcY * pose.tanV * depth);
  }

  // Slide (and if it cannot fit, widen) chapter `index` so a subject of
  // `width` pixels centred on `point` sits centred at `targetX`.
  function frameSubject(index, point, extent, zoneLeft, zoneRight, targetX) {
    let pose = chapterPose(index);
    const needed = 2 * extent * pixelsPerUnit(pose, toScreen(pose, point).depth);
    const room = Math.max(1, zoneRight - zoneLeft);
    if (needed > room) lens[index].zoom = Math.min(MAX_ZOOM, needed / room);
    pose = chapterPose(index);
    const at = toScreen(pose, point);
    const x = targetX ?? (zoneLeft + zoneRight) / 2;
    lens[index].shift = THREE.MathUtils.clamp(lens[index].shift + ((x - at.x) / window.innerWidth) * 2, -0.8, 0.8);
    return chapterPose(index);
  }

  // Put an island's visual centre at screen (x, y), `depth` from the camera,
  // facing that camera.
  function placeIsland(item, pose, x, y) {
    const anchor = fromScreen(pose, x, y, item.distance);
    const group = item.group;
    const yaw = Math.atan2(pose.position.x - anchor.x, pose.position.z - anchor.z);
    const offset = islandCenter.clone().applyAxisAngle(UP, yaw);
    group.rotation.y = yaw;
    group.position.copy(anchor).sub(offset);
    item.baseY = group.position.y;
  }

  function composeChapters() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    lens.forEach((entry) => {
      entry.shift = 0;
      entry.lift = 0;
      entry.zoom = 1;
    });
    scene.updateMatrixWorld();
    const header = (document.querySelector("[data-header]")?.getBoundingClientRect().bottom || 72) + 12;

    // 04 · portrait screens: the word is two lines and the card sits low in its
    // chapter (see styles.css), so the word is centred in the sky above it.
    const communitySection = document.querySelector("#community");
    const communityCard = document.querySelector("#community .copy");
    if (width / height < 1 && communitySection && communityCard) {
      // Where the card sits when the chapter is reached (section top at y = 0).
      const cardTop = communityCard.getBoundingClientRect().top - communitySection.getBoundingClientRect().top;
      const zoneBottom = Math.min(height, cardTop) - 16;
      constellation.getWorldPosition(wordCenter);
      let pose = chapterPose(4);
      const wordHeight = (3 + 1.5 + 3) * 2.5 * pixelsPerUnit(pose, toScreen(pose, wordCenter).depth);
      const room = Math.max(1, zoneBottom - header);
      if (wordHeight > room) lens[4].zoom = Math.min(MAX_ZOOM, wordHeight / room);
      pose = chapterPose(4);
      const at = toScreen(pose, wordCenter);
      lens[4].shift = ((width / 2 - at.x) / width) * 2;
      lens[4].lift = ((at.y - (header + zoneBottom) / 2) / height) * 2;
    }

    // Same breakpoint as the stacked CSS layout: there the copy spans the
    // screen, the world is backdrop only, and the islands stay away.
    islandsShown = width > 860;
    if (!islandsShown) return;

    const rail = document.querySelector("[data-rail]");
    const railLeft = rail && getComputedStyle(rail).display !== "none" ? rail.getBoundingClientRect().left : width;
    const right = Math.min(width - 20, railLeft - 16);
    const top = header;
    const card = (selector) => document.querySelector(selector)?.getBoundingClientRect();

    // 02 · the stage screen fills the space left of the right-hand copy.
    const formatCard = card("#format .copy");
    if (formatCard) {
      screen.getWorldPosition(screenCenter);
      frameSubject(2, screenCenter, 3.3, 20, formatCard.left - 24);
    }

    // 03 · the dial sits right of the agenda, its three flags beside it.
    const programCard = card("#program .copy");
    const dialFlags = platformIslands.filter((item) => item.home === "dial");
    if (programCard) {
      dial.getWorldPosition(dialCenter);
      const zoneLeft = programCard.right + 32;
      let pose = frameSubject(3, dialCenter, DIAL_EXTENT, zoneLeft, right);
      const radius = DIAL_EXTENT * pixelsPerUnit(pose, toScreen(pose, dialCenter).depth);
      const flagWidth = islandSize.x * pixelsPerUnit(pose, dialFlags[1].distance);
      const flagHeight = islandSize.y * pixelsPerUnit(pose, dialFlags[1].distance);
      const orbit = radius + flagWidth * 0.62 + 10;
      const arcWidth = 2 * radius + (orbit - radius) + flagWidth / 2;
      const dialY = toScreen(pose, dialCenter).y;
      // Widest arc that keeps the top flag under the header and the bottom one
      // on screen; too flat an arc would stack the flags on each other.
      const room = Math.min(dialY - top - flagHeight / 2, height - 16 - flagHeight / 2 - dialY);
      const spread = Math.min(0.9, Math.asin(THREE.MathUtils.clamp(room / orbit, 0, 1)));

      if (zoneLeft + arcWidth <= right && orbit * Math.sin(spread) >= flagHeight * 0.9) {
        // Room beside it: flags ride an arc on the dial's right, like hours.
        pose = frameSubject(3, dialCenter, DIAL_EXTENT, zoneLeft, right, zoneLeft + (right - zoneLeft - arcWidth) / 2 + radius);
        const center = toScreen(pose, dialCenter);
        [spread, 0, -spread].forEach((angle, i) => {
          placeIsland(dialFlags[i], pose, center.x + Math.cos(angle) * orbit, center.y - Math.sin(angle) * orbit);
        });
      } else {
        // Tight: the dial takes the zone and the flags line up beneath it.
        const center = toScreen(pose, dialCenter);
        const gap = Math.min(24, (right - zoneLeft - 3 * flagWidth) / 2);
        const rowY = Math.min(height - flagHeight / 2 - 16, center.y + radius + flagHeight / 2 + 12);
        [-1, 0, 1].forEach((slot, i) => {
          placeIsland(dialFlags[i], pose, center.x + slot * (flagWidth + gap), rowY);
        });
      }
    }

    // 00 · the desktop trio stands in a staggered column at the right edge,
    // beside the island and under the moon (the finale reuses this view).
    const heroPose = chapterPose(0);
    const heroFlags = platformIslands.filter((item) => item.home === "hero");
    const column = [
      [0, 0.35],
      [-0.95, 0.6],
      [0.1, 0.84]
    ];
    heroFlags.forEach((item, i) => {
      const flagWidth = islandSize.x * pixelsPerUnit(heroPose, item.distance);
      const flagHeight = islandSize.y * pixelsPerUnit(heroPose, item.distance);
      // A little inboard: the finale views this column from closer, spreading it.
      const x = right - flagWidth * 0.8 + column[i][0] * flagWidth;
      const y = THREE.MathUtils.clamp(column[i][1] * height, top + flagHeight / 2, height - flagHeight / 2 - 16);
      placeIsland(item, heroPose, x, y);
    });
  }
  composeChapters();

  let appliedShift = 0;
  let appliedLift = 0;
  // Off-axis projection: slides the image by `shift` (right) and `lift` (up)
  // in NDC without turning the camera. setViewOffset works in ratios, so any
  // size with the right aspect does.
  function setLens(shift, lift) {
    appliedShift = shift;
    appliedLift = lift;
    if (Math.abs(shift) < 1e-4 && Math.abs(lift) < 1e-4) {
      if (camera.view?.enabled) camera.clearViewOffset();
      else camera.updateProjectionMatrix();
      return;
    }
    const aspect = camera.aspect;
    camera.setViewOffset(aspect * 2, 2, -shift * aspect, lift, aspect * 2, 2);
  }

  function smootherstep(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function applyProgress(progress) {
    const index = Math.min(chapters.length - 2, Math.floor(progress));
    const t = smootherstep(Math.min(1, Math.max(0, progress - index)));
    const a = chapters[index];
    const b = chapters[index + 1];

    // Camera — pull back and widen on narrow viewports.
    rig.fromPosition.fromArray(a.camera.position);
    rig.toPosition.fromArray(b.camera.position);
    rig.fromTarget.fromArray(a.camera.target);
    rig.toTarget.fromArray(b.camera.target);
    rig.position.lerpVectors(rig.fromPosition, rig.toPosition, t);
    rig.lookAt.lerpVectors(rig.fromTarget, rig.toTarget, t);

    let fov = a.camera.fov + (b.camera.fov - a.camera.fov) * t;
    const frame = framing(window.innerWidth / window.innerHeight);
    rig.position.sub(rig.lookAt).multiplyScalar(frame.pullback).add(rig.lookAt);
    rig.position.y += Math.sin(Math.PI * t) * (a.arc || 0);
    fov += frame.fov;
    const zoom = lens[index].zoom + (lens[index + 1].zoom - lens[index].zoom) * t;
    if (zoom !== 1) fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov / 2)) * zoom));
    const shift = lens[index].shift + (lens[index + 1].shift - lens[index].shift) * t;
    const lift = lens[index].lift + (lens[index + 1].lift - lens[index].lift) * t;

    for (const key of worldKeys) {
      world[key] = a.world[key] + (b.world[key] - a.world[key]) * t;
    }

    camera.position.copy(rig.position);
    camera.position.x += parallax.x * 0.5;
    camera.position.y += parallax.y * 0.3;
    camera.lookAt(rig.lookAt);
    if (Math.abs(camera.fov - fov) > 0.01 || !(Math.abs(shift - appliedShift) <= 1e-4) || !(Math.abs(lift - appliedLift) <= 1e-4)) {
      camera.fov = fov;
      setLens(shift, lift);
    }

    scene.fog.density = world.fog * theme.fogScale;
    key.intensity = theme.key * world.key;
    keyColor.setHex(a.light).lerp(chapterLight(b.light), t);
    if (theme.light) keyColor.lerp(DAYLIGHT, 0.6);
    key.color.copy(keyColor);
    auroraUniforms.forEach((uniforms) => (uniforms.uOpacity.value = 0.82 * world.aurora));
    ringMaterial.emissiveIntensity = 2.4 * world.portal;
    discUniforms.uOpacity.value = 0.4 * world.portal;
    portalGlow.material.opacity = 0.16 * world.portal;
    portalLight.intensity = 60 * world.portal;
    chordMaterial.opacity = 0.22 * world.portal;
    ringPeople.forEach((node) => {
      node.userData.material.emissiveIntensity = 0.3 + 1.5 * world.portal;
      node.userData.glyph.emissiveIntensity = 0.9 + 2.4 * world.portal;
    });

    // The mark dissolves as the camera closes on the ring, so chapter 02 flies
    // through the portal instead of into the logo.
    portal.getWorldPosition(portalWorldPosition);
    const markFade = THREE.MathUtils.clamp((camera.position.distanceTo(portalWorldPosition) - 4.5) / 5, 0, 1);
    markMaterial.opacity = markFade;
    markMaterial.emissiveIntensity = 1.9 * world.portal * markFade;
    notchMaterial.opacity = markFade;
    mark.visible = markFade > 0.02;
    // Keep the stage out of the logo's silhouette until its own chapter.
    stage.visible = world.stage > 0.02;
    // The camera passes the screen on its way to the dial; dissolving it early
    // stops the transition becoming a wall of screen.
    const screenFade = THREE.MathUtils.smoothstep(world.stage, 0.3, 0.9);
    frameMaterial.opacity = screenFade;
    screenMaterial.opacity = screenFade;
    screen.visible = screenFade > 0.01;
    audience.visible = world.stage > 0.03;
    const stageFade = Math.min(1, world.stage * 1.4);
    deckMaterial.opacity = stageFade;
    deckMaterial.emissiveIntensity = 0.15 + 0.45 * world.stage;
    edgeMaterial.opacity = 0.55 * world.stage;
    attendeeMaterial.opacity = stageFade;
    attendeeMaterial.emissiveIntensity = 0.12 + 0.5 * world.stage;
    speakerMaterial.opacity = stageFade;
    speakerMaterial.emissiveIntensity = 0.15 + 0.95 * world.stage;
    screenSpill.intensity = 34 * world.stage;
    // Platform islands are revealed along the journey: the desktop trio flies
    // in the hero, mobile and web appear as the camera turns to the day-dial.
    // Both dissolve for the constellation chapter, whose sky is the hero's.
    platformIslands.forEach((island) => {
      const fade = islandsShown ? (island.home === "dial" ? world.reach : world.isles) : 0;
      island.group.visible = fade > 0.02;
      island.materials.forEach((material) => (material.opacity = fade));
    });

    // The hand runs the conference day across the chapter-03 scroll window.
    dial.visible = world.dial > 0.02;
    if (dial.visible) {
      const day = THREE.MathUtils.clamp((progress - 2.45) / 1.1, 0, 1);
      const now = DAY_START + day * (DAY_END - DAY_START);
      hand.rotation.z = -clockAngle(now);
      trackMaterial.opacity = 0.16 * world.dial;
      faceMaterial.opacity = 0.9 * world.dial;
      tickBright.opacity = 0.75 * world.dial;
      tickDim.opacity = 0.22 * world.dial;
      handMaterial.emissiveIntensity = 2.1 * world.dial;
      dialSlots.forEach((slot) => {
        // Continuous in `now` so slots brighten as the hand enters, not snap:
        // upcoming 0.18, in progress 2.6, finished 1.1.
        const entered = THREE.MathUtils.smoothstep(now, slot.start - 4, slot.start + 4);
        const finished = THREE.MathUtils.smoothstep(now, slot.end - 4, slot.end + 4);
        slot.material.emissiveIntensity = (0.18 + entered * 2.42 - finished * 1.5) * world.dial;
      });
    }
    crystals.forEach((crystal) => {
      crystal.material.emissiveIntensity = 0.12 + world.cryst * 1.15 + crystal.hover * 1.6;
      crystal.material.opacity = Math.min(1, world.cryst);
      crystal.mesh.visible = world.cryst > 0.03;
    });
    screenMaterial.color.setScalar(0.03 + world.stage * 0.97);
    emberLight.intensity = 30 * world.stage;
    nodeMaterial.opacity = 0.05 + world.consts * 0.9;
    scatterMaterial.opacity = 0.03 + world.consts * 0.4;
    lineMaterial.opacity = 0.012 + world.consts * 0.38;
  }

  /* -------------------------------------------------------------- parallax */
  const parallax = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  if (finePointer) {
    window.addEventListener(
      "pointermove",
      (event) => {
        parallax.targetX = (event.clientX / window.innerWidth - 0.5) * 0.7;
        parallax.targetY = -(event.clientY / window.innerHeight - 0.5) * 0.5;
        pointerNdc.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointerNdc.y = -(event.clientY / window.innerHeight) * 2 + 1;
        pointerDirty = true;
      },
      { passive: true }
    );
  }

  /* -------------------------------------------------- crystal hover raycast */
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  let pointerDirty = false;
  let hoveredCrystal = -1;
  const topicCards = Array.from(document.querySelectorAll("[data-topic]"));

  function syncHover(index) {
    if (index === hoveredCrystal) return;
    hoveredCrystal = index;
    topicCards.forEach((card, cardIndex) => card.classList.toggle("is-lit", cardIndex === index));
  }

  // DOM -> 3D: hovering a topic card lights its crystal.
  topicCards.forEach((card, index) => {
    card.addEventListener("mouseenter", () => syncHover(index));
    card.addEventListener("mouseleave", () => syncHover(-1));
  });

  function updateRaycast() {
    if (!pointerDirty || !finePointer) return;
    pointerDirty = false;
    // Gate to the CFP chapter so hidden objects never capture attention.
    if (rig.smooth < 0.5 || rig.smooth > 1.6) {
      if (hoveredCrystal !== -1 && !topicCards.some((card) => card.matches(":hover"))) syncHover(-1);
      return;
    }
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(crystals.map((crystal) => crystal.mesh), false);
    syncHover(hits.length ? hits[0].object.userData.topicIndex : -1);
  }

  /* ------------------------------------------------------------- main loop */
  let reduceMotion = reduceMotionQuery.matches;
  let rafId = 0;
  let running = false;
  let lastTime = 0;
  let ambientTime = 5;
  let frameEma = 16;
  let slowSince = 0;
  let activity = 0;
  let lastConducted = 0;
  let governorStep = 0;
  let lastGovernorAction = 0;
  let ready = false;

  // Ambient loops advance on their own clock, which runs slow while the reader
  // is still and opens up while they scroll. Everything below derives from `t`,
  // so this one lever keeps the world from competing with the copy.
  function ambient(dt) {
    const step = dt * (0.4 + 0.6 * activity);
    ambientTime += step;
    const t = ambientTime;

    auroraUniforms.forEach((uniforms) => (uniforms.uTime.value = t));
    discUniforms.uTime.value = t;

    // Skip what the current chapter cannot show.
    if (crystals[0].mesh.visible) crystals.forEach((crystal, index) => {
      crystal.angle += crystal.spin * step * 0.35;
      crystal.hover = THREE.MathUtils.damp(crystal.hover, hoveredCrystal === index ? 1 : 0, 8, dt);
      const wave = Math.sin(t * 0.8 + index * 1.3) * 0.3;
      crystal.mesh.position.set(
        Math.cos(crystal.angle) * crystal.radius,
        crystal.height + wave,
        Math.sin(crystal.angle) * crystal.radius
      );
      crystal.mesh.rotation.y = crystal.angle + t * 0.2;
    });

    flagTime.value = t;
    platformIslands.forEach((island) => {
      island.group.position.y = island.baseY + Math.sin(t * 0.4 + island.phase) * 0.35;
    });

    ringPeople.forEach((node) => {
      const radius = RING_RADIUS + Math.sin(t * 0.9 + node.userData.phase) * 0.05;
      node.position.set(Math.cos(node.userData.angle) * radius, Math.sin(node.userData.angle) * radius, 0);
    });

    // Chords track the nodes so the triangle never detaches while they breathe.
    const chordAttribute = chordGeometry.attributes.position;
    for (let i = 0; i < ringPeople.length; i += 1) {
      const from = ringPeople[i].position;
      const to = ringPeople[(i + 1) % ringPeople.length].position;
      // Sunk behind the mark so the connections never cut across the "a".
      chordAttribute.setXYZ(i * 2, from.x, from.y, from.z - 0.7);
      chordAttribute.setXYZ(i * 2 + 1, to.x, to.y, to.z - 0.7);
    }
    chordAttribute.needsUpdate = true;

    if (audience.visible) updateAudience(t);

    island.position.y = Math.sin(t * 0.22) * 0.12;
    constellationDrift.rotation.y = Math.sin(t * 0.04) * 0.06;
    stars.rotation.y = t * 0.002;
    moonHalo.material.opacity = theme.halo + Math.sin(t * 0.35) * 0.02;
  }

  function govern(now) {
    if (now < 4000 || governorStep >= 4) return;
    // Only sustained slowness counts. A single hitch (a tab switch, a GC pause)
    // used to be enough to cost the page its bloom for good.
    if (frameEma <= 26) {
      slowSince = 0;
      return;
    }
    if (!slowSince) slowSince = now;
    if (now - slowSince < 1500 || now - lastGovernorAction < 2500) return;
    lastGovernorAction = now;
    slowSince = 0;
    governorStep += 1;
    if (governorStep === 1) {
      bloomTarget = 0; // the most expensive thing to give up; fades, never snaps
    } else if (governorStep === 2) {
      dprScale = 0.75;
      applySize();
    } else if (governorStep === 3) {
      snowBudget = Math.round(snowBudget * 0.5);
    } else {
      auroraRibbons[2].visible = false;
      starMaterial.opacity *= 0.7;
      applyTheme();
    }
  }

  function tick(now) {
    if (!running) return;
    rafId = requestAnimationFrame(tick);

    const dt = Math.min(1 / 30, (now - lastTime) / 1000 || 0.016);
    frameEma = frameEma * 0.94 + Math.min(now - lastTime, 50) * 0.06;
    lastTime = now;

    rig.target = Math.min(chapters.length - 1, Math.max(0, window.__avProgress || 0));

    // How hard the reader is scrolling right now, smoothed both ways.
    const travelled = Math.abs(rig.target - lastConducted);
    lastConducted = rig.target;
    activity = THREE.MathUtils.damp(activity, Math.min(1, travelled * 120), 3.2, dt);

    rig.smooth = THREE.MathUtils.damp(rig.smooth, rig.target, 5.2, dt);
    parallax.x = THREE.MathUtils.damp(parallax.x, parallax.targetX, 6, dt);
    parallax.y = THREE.MathUtils.damp(parallax.y, parallax.targetY, 6, dt);

    ambient(dt);
    applyProgress(rig.smooth);
    updateSnow(dt * (0.45 + 0.55 * activity), world.snow);
    updateRaycast();
    govern(now);

    bloomLevel = THREE.MathUtils.damp(bloomLevel, bloomTarget, 2.5, dt);
    bloomPass.strength = theme.bloom * bloomLevel;
    bloomPass.enabled = bloomLevel > 0.01;

    renderFrame();

    if (!ready) {
      ready = true;
      html.classList.add("world-ready");
    }
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    lastTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  /* Reduced motion: deterministic still frames, re-rendered on scroll only. */
  let stillScheduled = false;

  function renderStill() {
    if (stillScheduled) return;
    stillScheduled = true;
    requestAnimationFrame(() => {
      stillScheduled = false;
      rig.target = Math.min(chapters.length - 1, Math.max(0, window.__avProgress || 0));
      rig.smooth = rig.target;
      parallax.x = 0;
      parallax.y = 0;
      applyProgress(rig.smooth);
      updateSnow(0, world.snow);
      renderFrame();
      if (!ready) {
        ready = true;
        html.classList.add("world-ready");
      }
    });
  }

  function applyMotionMode() {
    reduceMotion = reduceMotionQuery.matches;
    if (reduceMotion) {
      stop();
      renderStill();
      window.addEventListener("scroll", renderStill, { passive: true });
    } else {
      window.removeEventListener("scroll", renderStill);
      start();
    }
  }

  /* ------------------------------------------------------------------ theme
     Light mode is a winter morning rather than inverted night: a gradient sky
     dome with a low sun, pale haze, bright sky light and a warm key. Additive
     glow vanishes against a pale sky, so stars and aurora rest, and DOTNET is
     drawn as a navy star chart (normal blending) instead of glowing points.
     Follows <html data-theme>, else the system; script.js fires "av:theme". */
  const DAYLIGHT = new THREE.Color("#fff3e2");
  const SUN_DIRECTION = new THREE.Vector3(30, 24, -52).normalize();
  const skyUniforms = {
    uTop: { value: new THREE.Color("#5a8dd0") },
    uHorizon: { value: new THREE.Color("#e2ebf6") },
    uBelow: { value: new THREE.Color("#d3deec") },
    uSun: { value: new THREE.Color("#ffe3b8") },
    uSunDirection: { value: SUN_DIRECTION }
  };
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(250, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        uniform vec3 uBelow;
        uniform vec3 uSun;
        uniform vec3 uSunDirection;
        varying vec3 vDirection;
        void main() {
          float up = vDirection.y;
          vec3 color = up > 0.0
            ? mix(uHorizon, uTop, pow(clamp(up * 2.4, 0.0, 1.0), 0.7))
            : mix(uHorizon, uBelow, clamp(-up * 3.0, 0.0, 1.0));
          float sun = max(dot(vDirection, uSunDirection), 0.0);
          color += uSun * (pow(sun, 12.0) * 0.45 + pow(sun, 90.0) * 0.6);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    })
  );
  skyDome.renderOrder = -1;
  skyDome.visible = false;
  scene.add(skyDome);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0xfff4de, fog: false })
  );
  sun.position.copy(moon.position);
  sun.visible = false;
  environment.add(sun);

  const THEMES = {
    dark: {
      light: false,
      clear: 0x04070f,
      fog: FOG_COLOR.clone(),
      fogScale: 1,
      hemi: [0x2c4d8f, 0x040810, 0.62],
      key: 0.9,
      rim: [0x9fc4ff, 1.15],
      halo: 0.2,
      haloColor: 0x9fd1ff,
      bloom: BLOOM_STRENGTH,
      threshold: 0.85,
      exposure: 1.18,
      snow: 0xcfe2ff,
      word: [0xcfe4ff, 0x7cc2ff, 0x9fd1ff, THREE.AdditiveBlending]
    },
    light: {
      light: true,
      clear: 0xe9f0f8,
      fog: new THREE.Color("#dfe8f4"),
      // Daylight haze is thinner than night fog, or the flags wash out.
      fogScale: 0.45,
      hemi: [0xe4eefc, 0x6f82a0, 1.25],
      key: 1.8,
      rim: [0xffffff, 0.45],
      halo: 0.5,
      haloColor: 0xffd9a0,
      bloom: 0.22,
      threshold: 0.94,
      exposure: 0.98,
      snow: 0xffffff,
      word: [0x16427f, 0x2a5da6, 0x5a82b8, THREE.NormalBlending]
    }
  };
  const lightSchemeQuery = window.matchMedia("(prefers-color-scheme: light)");
  const wantsLight = () =>
    html.dataset.theme ? html.dataset.theme === "light" : lightSchemeQuery.matches;
  let theme = THEMES.dark;

  function applyTheme() {
    theme = wantsLight() ? THEMES.light : THEMES.dark;
    const light = theme.light;
    renderer.setClearColor(theme.clear, 1);
    renderer.toneMappingExposure = theme.exposure;
    scene.fog.color.copy(theme.fog);
    skyDome.visible = light;
    hemi.color.setHex(theme.hemi[0]);
    hemi.groundColor.setHex(theme.hemi[1]);
    hemi.intensity = theme.hemi[2];
    moonRim.color.setHex(theme.rim[0]);
    moonRim.intensity = theme.rim[1];
    moon.visible = !light;
    sun.visible = light;
    moonHalo.material.color.setHex(theme.haloColor);
    stars.visible = !light;
    // Respect the quality governor, which may already have retired a ribbon.
    auroraRibbons.forEach((ribbon, i) => (ribbon.visible = !light && !(i === 2 && governorStep >= 4)));
    bloomPass.threshold = theme.threshold;
    snowMaterial.color.setHex(theme.snow);
    const [node, line, scatter, blending] = theme.word;
    nodeMaterial.color.setHex(node);
    lineMaterial.color.setHex(line);
    scatterMaterial.color.setHex(scatter);
    [nodeMaterial, lineMaterial, scatterMaterial].forEach((material) => {
      if (material.blending !== blending) {
        material.blending = blending;
        material.needsUpdate = true;
      }
    });
    if (reduceMotion) renderStill();
  }

  document.addEventListener("av:theme", applyTheme);
  lightSchemeQuery.addEventListener?.("change", applyTheme);
  applyTheme();

  function resize() {
    applySize();
    syncWordLayout();
    composeChapters();
    // Aspect changed: re-derive the off-axis projection on the next frame.
    appliedShift = appliedLift = NaN;
    syncSnowEdges();
    if (reduceMotion) renderStill();
  }

  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else applyMotionMode();
  });
  reduceMotionQuery.addEventListener?.("change", applyMotionMode);

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stop();
  });
  canvas.addEventListener("webglcontextrestored", applyMotionMode);

  // Compile every program before the first frame, bound to the composer's
  // target so the linear, un-tone-mapped variants are the ones built. Left
  // alone, each chapter's materials compiled the first time it came into view
  // (programs grew 37 -> 45 while scrolling): a stall mid-scroll.
  renderer.setRenderTarget(composer.renderTarget1);
  const compiled = renderer.compileAsync
    ? renderer.compileAsync(scene, camera)
    : Promise.resolve(renderer.compile(scene, camera));
  renderer.setRenderTarget(null);
  compiled
    .catch(() => {})
    .then(() => {
      applyProgress(0);
      applyMotionMode();
    });
}
