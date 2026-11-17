(() => {
  "use strict";

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const counters = {
    pointers: 0,
    segments: 0,
    fragments: 0,
  };

  const formatCount = (value, digits) => String(Math.min(value, (10 ** digits) - 1)).padStart(digits, "0");

  const pointerCount = document.querySelector("#pointer-count");
  const pathCount = document.querySelector("#path-count");
  const fragmentCount = document.querySelector("#fragment-count");
  const segmentReadout = document.querySelector("#segment-readout");

  function updateCounters() {
    pointerCount.textContent = formatCount(counters.pointers, 4);
    pathCount.textContent = formatCount(counters.segments, 3);
    fragmentCount.textContent = formatCount(counters.fragments, 2);
    segmentReadout.textContent = formatCount(counters.segments, 3);
  }

  const clock = document.querySelector("#clock");

  function updateClock() {
    clock.textContent = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "America/Los_Angeles",
    }).format(new Date());
  }

  updateClock();
  window.setInterval(updateClock, 1000);

  let pointerTick = 0;

  window.addEventListener("pointermove", (event) => {
    const xPercent = (event.clientX / window.innerWidth) * 100;
    const yPercent = (event.clientY / window.innerHeight) * 100;
    root.style.setProperty("--mx", `${xPercent}%`);
    root.style.setProperty("--my", `${yPercent}%`);

    pointerTick += 1;
    if (pointerTick % 3 === 0) {
      counters.pointers += 1;
      updateCounters();
    }
  }, { passive: true });

  document.querySelector("#enter-system").addEventListener("click", () => {
    document.querySelector("#memory").scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  });

  const glitchTitle = document.querySelector(".glitch-title");

  glitchTitle.addEventListener("click", () => {
    glitchTitle.classList.remove("is-glitching");
    window.requestAnimationFrame(() => glitchTitle.classList.add("is-glitching"));
  });

  glitchTitle.addEventListener("animationend", () => {
    glitchTitle.classList.remove("is-glitching");
  });

  document.querySelectorAll("[data-tilt]").forEach((surface) => {
    surface.addEventListener("pointermove", (event) => {
      const rect = surface.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 18;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 18;
      surface.style.setProperty("--tilt-x", `${x}px`);
      surface.style.setProperty("--tilt-y", `${y}px`);
    });

    surface.addEventListener("pointerleave", () => {
      surface.style.setProperty("--tilt-x", "0px");
      surface.style.setProperty("--tilt-y", "0px");
    });
  });

  const integrityValue = document.querySelector("#integrity-value");
  const memoryFigure = document.querySelector(".memory-figure");

  memoryFigure.addEventListener("pointermove", (event) => {
    const rect = memoryFigure.getBoundingClientRect();
    const location = (event.clientX - rect.left) / rect.width;
    const integrity = Math.round(42 + location * 51);
    integrityValue.textContent = `${integrity}%`;
  });

  memoryFigure.addEventListener("pointerleave", () => {
    integrityValue.textContent = "73%";
  });

  const revealScenes = document.querySelectorAll(".reveal-scene");

  if ("IntersectionObserver" in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });

    revealScenes.forEach((scene) => revealObserver.observe(scene));
  } else {
    revealScenes.forEach((scene) => scene.classList.add("is-visible"));
  }

  const canvas = document.querySelector("#toolpath-canvas");
  const context = canvas.getContext("2d");
  const coordinateReadout = document.querySelector("#coordinate-readout");
  const modeReadout = document.querySelector("#mode-readout");
  const gcodeLine = document.querySelector("#gcode-line");
  const clearPath = document.querySelector("#clear-path");
  const switchMode = document.querySelector("#switch-mode");
  const generatePath = document.querySelector("#generate-path");

  let canvasSize = { width: 1200, height: 720 };
  let lastPoint = null;
  let activePointer = null;
  let mode = "TRACE";

  const palette = {
    TRACE: "#ff4d00",
    CUT: "#d8ff00",
  };

  function drawGrid() {
    context.save();
    context.fillStyle = "#050506";
    context.fillRect(0, 0, canvasSize.width, canvasSize.height);
    context.strokeStyle = "rgba(232, 233, 230, 0.08)";
    context.lineWidth = 1;

    for (let x = 0; x <= canvasSize.width; x += 32) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvasSize.height);
      context.stroke();
    }

    for (let y = 0; y <= canvasSize.height; y += 32) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvasSize.width, y);
      context.stroke();
    }

    context.strokeStyle = "rgba(86, 232, 255, 0.22)";
    context.strokeRect(18, 18, canvasSize.width - 36, canvasSize.height - 36);
    context.restore();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    canvasSize = { width: rect.width, height: rect.height };
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawGrid();
    counters.segments = 0;
    updateCounters();
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
    };
  }

  function setCoordinate(point, prefix = "G01") {
    const xValue = (point.x / canvasSize.width) * 100;
    const yValue = (1 - point.y / canvasSize.height) * 100;
    coordinateReadout.textContent = `X${String(Math.round(xValue)).padStart(3, "0")} Y${String(Math.round(yValue)).padStart(3, "0")}`;
    gcodeLine.textContent = `${prefix} X${xValue.toFixed(2)} Y${yValue.toFixed(2)} ; ${mode}`;
  }

  function drawSegment(from, to) {
    context.save();
    context.strokeStyle = palette[mode];
    context.lineWidth = mode === "CUT" ? 4 : 2;
    context.lineCap = "square";
    context.lineJoin = "miter";
    context.shadowColor = palette[mode];
    context.shadowBlur = mode === "CUT" ? 15 : 7;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    context.restore();
    counters.segments += 1;
    setCoordinate(to);
    updateCounters();
  }

  canvas.addEventListener("pointerdown", (event) => {
    activePointer = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    lastPoint = canvasPoint(event);
    setCoordinate(lastPoint, "G00");
  });

  canvas.addEventListener("pointermove", (event) => {
    const point = canvasPoint(event);
    setCoordinate(point, activePointer === event.pointerId ? "G01" : "G00");
    if (activePointer === event.pointerId && lastPoint) {
      drawSegment(lastPoint, point);
      lastPoint = point;
    }
  });

  function endCanvasPointer(event) {
    if (event.pointerId === activePointer) {
      activePointer = null;
      lastPoint = null;
    }
  }

  canvas.addEventListener("pointerup", endCanvasPointer);
  canvas.addEventListener("pointercancel", endCanvasPointer);

  clearPath.addEventListener("click", () => {
    drawGrid();
    counters.segments = 0;
    coordinateReadout.textContent = "X000 Y000";
    gcodeLine.textContent = "G00 X000.00 Y000.00 ; FIELD CLEARED";
    updateCounters();
  });

  switchMode.addEventListener("click", () => {
    mode = mode === "TRACE" ? "CUT" : "TRACE";
    modeReadout.textContent = mode;
    modeReadout.style.color = palette[mode];
    gcodeLine.textContent = `M06 ; TOOL MODE ${mode}`;
  });

  generatePath.addEventListener("click", () => {
    const margin = Math.min(80, canvasSize.width * 0.08);
    let point = {
      x: margin + Math.random() * (canvasSize.width - margin * 2),
      y: margin + Math.random() * (canvasSize.height - margin * 2),
    };

    for (let index = 0; index < 18; index += 1) {
      const nextPoint = {
        x: margin + Math.random() * (canvasSize.width - margin * 2),
        y: margin + Math.random() * (canvasSize.height - margin * 2),
      };
      drawSegment(point, nextPoint);
      point = nextPoint;
    }
  });

  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(canvas);

  const fragmentField = document.querySelector("#fragment-field");
  const fragments = [...document.querySelectorAll("[data-fragment]")];
  const dragState = new Map();

  function updateFragmentPosition(fragment, x, y) {
    fragment.dataset.x = String(x);
    fragment.dataset.y = String(y);
    fragment.style.setProperty("--dx", `${x}px`);
    fragment.style.setProperty("--dy", `${y}px`);
  }

  fragments.forEach((fragment) => {
    updateFragmentPosition(fragment, 0, 0);

    fragment.addEventListener("pointerdown", (event) => {
      fragment.setPointerCapture(event.pointerId);
      fragment.classList.add("is-dragging");
      dragState.set(event.pointerId, {
        fragment,
        startX: event.clientX,
        startY: event.clientY,
        originX: Number(fragment.dataset.x || 0),
        originY: Number(fragment.dataset.y || 0),
        moved: false,
      });
    });

    fragment.addEventListener("pointermove", (event) => {
      const state = dragState.get(event.pointerId);
      if (!state || state.fragment !== fragment) return;

      const fieldRect = fragmentField.getBoundingClientRect();
      const fragmentRect = fragment.getBoundingClientRect();
      const maxTravelX = fieldRect.width - fragmentRect.width;
      const maxTravelY = fieldRect.height - fragmentRect.height;
      const nextX = Math.max(-fieldRect.width * 0.35, Math.min(maxTravelX, state.originX + event.clientX - state.startX));
      const nextY = Math.max(-fieldRect.height * 0.35, Math.min(maxTravelY, state.originY + event.clientY - state.startY));

      updateFragmentPosition(fragment, nextX, nextY);
      state.moved = true;
    });

    function finishDrag(event) {
      const state = dragState.get(event.pointerId);
      if (!state) return;
      state.fragment.classList.remove("is-dragging");
      if (state.moved) {
        counters.fragments += 1;
        updateCounters();
      }
      dragState.delete(event.pointerId);
    }

    fragment.addEventListener("pointerup", finishDrag);
    fragment.addEventListener("pointercancel", finishDrag);

    fragment.addEventListener("keydown", (event) => {
      const distance = event.shiftKey ? 20 : 6;
      let x = Number(fragment.dataset.x || 0);
      let y = Number(fragment.dataset.y || 0);
      let handled = true;

      if (event.key === "ArrowLeft") x -= distance;
      else if (event.key === "ArrowRight") x += distance;
      else if (event.key === "ArrowUp") y -= distance;
      else if (event.key === "ArrowDown") y += distance;
      else handled = false;

      if (handled) {
        event.preventDefault();
        updateFragmentPosition(fragment, x, y);
        counters.fragments += 1;
        updateCounters();
      }
    });
  });

  const messages = [
    "A screen is never only a window.",
    "Every interface teaches the body how to behave.",
    "The archive changes when the observer touches it.",
    "A machine can remember without understanding.",
    "The future is assembled from damaged copies.",
    "You are not outside the system you are viewing.",
  ];

  const messageButton = document.querySelector("#message-button");
  const messageOutput = document.querySelector("#message-output");
  let messageIndex = 0;

  messageButton.addEventListener("click", () => {
    messageIndex = (messageIndex + 1) % messages.length;
    messageOutput.textContent = messages[messageIndex];
    messageButton.animate([
      { background: "#e8e9e6", color: "#060607" },
      { background: "#ff005c", color: "#ffffff", offset: 0.45 },
      { background: "#e8e9e6", color: "#060607" },
    ], { duration: reducedMotion ? 1 : 420, easing: "steps(2, end)" });
  });

  document.querySelector("#reset-session").addEventListener("click", () => {
    counters.pointers = 0;
    counters.segments = 0;
    counters.fragments = 0;
    messageIndex = 0;
    messageOutput.textContent = messages[0];
    fragments.forEach((fragment) => updateFragmentPosition(fragment, 0, 0));
    drawGrid();
    coordinateReadout.textContent = "X000 Y000";
    gcodeLine.textContent = "G00 X000.00 Y000.00 ; SESSION ERASED";
    updateCounters();
    document.querySelector("#portal").scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  });

  updateCounters();
})();
