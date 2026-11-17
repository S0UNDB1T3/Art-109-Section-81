// ART 109 Tutorial 12
// A customized p5.js canvas background using variables, functions,
// easing, for loops, and sine waves.

let easedX;
let easedY;
let targetX;
let targetY;
let phase = 0;
let pulseStrength = 0;
let paletteIndex = 0;

const easingAmount = 0.075;
const gridSpacing = 54;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const palettes = [
  {
    primary: [91, 230, 255],
    secondary: [18, 97, 216],
    accent: [255, 176, 74]
  },
  {
    primary: [255, 79, 216],
    secondary: [113, 79, 255],
    accent: [91, 230, 255]
  },
  {
    primary: [255, 176, 74],
    secondary: [255, 75, 92],
    accent: [247, 251, 255]
  }
];

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);

  // Tutorial 12: move the p5 canvas into a specific HTML div.
  canvas.parent("canvas-container");
  canvas.id("p5-canvas");
  canvas.elt.setAttribute("aria-hidden", "true");
  canvas.elt.setAttribute("role", "presentation");

  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  frameRate(reducedMotion.matches ? 24 : 60);
  strokeCap(ROUND);

  easedX = width * 0.5;
  easedY = height * 0.5;
  targetX = easedX;
  targetY = easedY;

  // Window-level pointer events keep the HTML links clickable because the
  // background canvas itself uses pointer-events: none in the CSS.
  window.addEventListener("pointermove", updatePointer, { passive: true });
  window.addEventListener("pointerdown", activateSignal, { passive: true });
}

function draw() {
  clear();

  easedX += (targetX - easedX) * easingAmount;
  easedY += (targetY - easedY) * easingAmount;

  drawSignalGrid();
  drawWaveBands();
  drawPointerSignal();

  pulseStrength *= 0.94;
  phase += reducedMotion.matches ? 0.002 : 0.012;
}

function drawSignalGrid() {
  const palette = palettes[paletteIndex];

  for (let x = -gridSpacing; x <= width + gridSpacing; x += gridSpacing) {
    for (let y = -gridSpacing; y <= height + gridSpacing; y += gridSpacing) {
      const pointerDistance = dist(easedX, easedY, x, y);
      const influence = max(0, 1 - pointerDistance / 340);
      const wave = sin(phase * 2 + x * 0.014 + y * 0.019) * 12;
      const bendX = (easedX - x) * influence * 0.055;
      const bendY = (easedY - y) * influence * 0.055;
      const dotSize = 1.8 + influence * 6.5;

      stroke(
        palette.secondary[0],
        palette.secondary[1],
        palette.secondary[2],
        22 + influence * 105
      );
      strokeWeight(0.8 + influence * 1.2);
      line(
        x,
        y,
        x + wave + bendX,
        y + cos(phase + x * 0.012) * 8 + bendY
      );

      noStroke();
      fill(
        palette.primary[0],
        palette.primary[1],
        palette.primary[2],
        36 + influence * 145
      );
      circle(x + bendX, y + bendY, dotSize);
    }
  }
}

function drawWaveBands() {
  const palette = palettes[paletteIndex];

  noFill();

  for (let band = 0; band < 3; band += 1) {
    const baseY = height * (0.2 + band * 0.3);
    const amplitude = 24 + band * 8;

    stroke(
      palette.primary[0],
      palette.primary[1],
      palette.primary[2],
      34 - band * 7
    );
    strokeWeight(1.2);
    beginShape();

    for (let x = -20; x <= width + 20; x += 18) {
      const pointerPull = max(0, 1 - abs(x - easedX) / 300);
      const y =
        baseY +
        sin(x * 0.012 + phase * (1.2 + band * 0.22)) * amplitude +
        (easedY - baseY) * pointerPull * 0.09;

      vertex(x, y);
    }

    endShape();
  }
}

function drawPointerSignal() {
  const palette = palettes[paletteIndex];
  const pulseSize = 56 + pulseStrength * 150;

  drawingContext.save();
  drawingContext.shadowBlur = 24;
  drawingContext.shadowColor = `rgba(${palette.primary.join(",")}, 0.75)`;

  noFill();
  stroke(
    palette.accent[0],
    palette.accent[1],
    palette.accent[2],
    155
  );
  strokeWeight(1.6);
  circle(easedX, easedY, pulseSize);

  stroke(
    palette.primary[0],
    palette.primary[1],
    palette.primary[2],
    205
  );
  strokeWeight(2.2);
  circle(easedX, easedY, 22 + sin(phase * 3) * 4);

  noStroke();
  fill(
    palette.primary[0],
    palette.primary[1],
    palette.primary[2],
    220
  );
  circle(easedX, easedY, 5);

  drawingContext.restore();
}

function updatePointer(event) {
  targetX = event.clientX;
  targetY = event.clientY;
}

function activateSignal(event) {
  updatePointer(event);
  paletteIndex = (paletteIndex + 1) % palettes.length;
  pulseStrength = 1;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  targetX = constrain(targetX, 0, width);
  targetY = constrain(targetY, 0, height);
}
