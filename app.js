(() => {
  "use strict";

  const canvas = document.querySelector("#signal-canvas");
  const context = canvas.getContext("2d");
  const canvasShell = document.querySelector(".canvas-shell");
  const remoteCursorLayer = document.querySelector("#remote-cursors");
  const connectionLight = document.querySelector("#connection-light");
  const connectionLabel = document.querySelector("#connection-label");
  const userCount = document.querySelector("#user-count");
  const modeReadout = document.querySelector("#mode-readout");
  const segmentCount = document.querySelector("#segment-count");
  const localCount = document.querySelector("#local-count");
  const clientId = document.querySelector("#client-id");
  const brushWidth = document.querySelector("#brush-width");
  const widthOutput = document.querySelector("#width-output");
  const statusMessage = document.querySelector("#status-message");
  const clearField = document.querySelector("#clear-field");
  const generateSignal = document.querySelector("#generate-signal");
  const saveField = document.querySelector("#save-field");
  const swatches = [...document.querySelectorAll(".swatch")];

  const state = {
    socket: null,
    online: false,
    segments: [],
    color: "#ff4d00",
    width: Number(brushWidth.value),
    localSignals: 0,
    pointerId: null,
    lastPoint: null,
    viewport: { width: 1200, height: 720, ratio: 1 },
  };

  const remoteCursors = new Map();
  const formatCount = (value) => String(Math.min(value, 9999)).padStart(4, "0");

  function updateStats() {
    segmentCount.textContent = formatCount(state.segments.length);
    localCount.textContent = formatCount(state.localSignals);
  }

  function drawBackground() {
    const { width, height } = state.viewport;
    context.fillStyle = "#050506";
    context.fillRect(0, 0, width, height);
    context.lineWidth = 1;
    context.strokeStyle = "rgba(242, 241, 236, 0.065)";

    for (let x = 0; x <= width; x += 36) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    for (let y = 0; y <= height; y += 36) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    context.strokeStyle = "rgba(86, 232, 255, 0.22)";
    context.strokeRect(18, 18, Math.max(0, width - 36), Math.max(0, height - 36));
  }

  function drawSegment(segment) {
    const { width, height } = state.viewport;
    context.save();
    context.strokeStyle = segment.color;
    context.lineWidth = segment.width;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.shadowColor = segment.color;
    context.shadowBlur = Math.min(18, segment.width * 2);
    context.beginPath();
    context.moveTo(segment.x0 * width, segment.y0 * height);
    context.lineTo(segment.x1 * width, segment.y1 * height);
    context.stroke();
    context.restore();
  }

  function redrawField() {
    drawBackground();
    state.segments.forEach(drawSegment);
    updateStats();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    state.viewport = { width: rect.width, height: rect.height, ratio };
    redrawField();
  }

  function normalizedPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  }

  function addSegment(segment, send = false) {
    state.segments.push(segment);
    if (state.segments.length > 8000) state.segments.splice(0, state.segments.length - 8000);
    drawSegment(segment);

    if (send) {
      state.localSignals += 1;
      if (state.online) state.socket.emit("draw-segment", segment);
    }

    updateStats();
  }

  function sendCursor(point) {
    if (state.online) state.socket.emit("cursor", { ...point, color: state.color });
  }

  canvas.addEventListener("pointerdown", (event) => {
    state.pointerId = event.pointerId;
    state.lastPoint = normalizedPoint(event);
    canvas.setPointerCapture(event.pointerId);
    sendCursor(state.lastPoint);
  });

  canvas.addEventListener("pointermove", (event) => {
    const point = normalizedPoint(event);
    document.documentElement.style.setProperty("--mx", `${point.x * 100}%`);
    document.documentElement.style.setProperty("--my", `${point.y * 100}%`);
    sendCursor(point);

    if (event.pointerId !== state.pointerId || !state.lastPoint) return;

    const segment = {
      x0: state.lastPoint.x,
      y0: state.lastPoint.y,
      x1: point.x,
      y1: point.y,
      color: state.color,
      width: state.width,
    };

    addSegment(segment, true);
    state.lastPoint = point;
  });

  function endPointer(event) {
    if (event.pointerId === state.pointerId) {
      state.pointerId = null;
      state.lastPoint = null;
    }
  }

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  swatches.forEach((swatch) => {
    swatch.addEventListener("click", () => {
      state.color = swatch.dataset.color;
      swatches.forEach((item) => item.classList.toggle("is-active", item === swatch));
      statusMessage.textContent = `Signal color changed to ${swatch.getAttribute("aria-label")}.`;
    });
  });

  brushWidth.addEventListener("input", () => {
    state.width = Number(brushWidth.value);
    widthOutput.value = `${String(state.width).padStart(2, "0")} PX`;
  });

  clearField.addEventListener("click", () => {
    if (state.online) {
      state.socket.emit("clear-canvas");
    } else {
      state.segments = [];
      redrawField();
    }
    statusMessage.textContent = state.online ? "Clear signal sent to every connected field." : "Local field cleared.";
  });

  generateSignal.addEventListener("click", () => {
    let point = { x: 0.12 + Math.random() * 0.2, y: 0.18 + Math.random() * 0.64 };
    for (let index = 0; index < 22; index += 1) {
      const angle = index * 0.68 + Math.random() * 0.5;
      const radius = 0.035 + index * 0.012;
      const next = {
        x: Math.max(0.05, Math.min(0.95, 0.5 + Math.cos(angle) * radius)),
        y: Math.max(0.07, Math.min(0.93, 0.5 + Math.sin(angle) * radius)),
      };
      addSegment({
        x0: point.x,
        y0: point.y,
        x1: next.x,
        y1: next.y,
        color: state.color,
        width: state.width,
      }, true);
      point = next;
    }
    statusMessage.textContent = `Generated 22 ${state.online ? "shared" : "local"} signal segments.`;
  });

  saveField.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "shared-signal-field.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    statusMessage.textContent = "Saved the current field as a PNG.";
  });

  function updateRemoteCursor(cursor) {
    let marker = remoteCursors.get(cursor.id);
    if (!marker) {
      marker = document.createElement("span");
      marker.className = "remote-cursor";
      remoteCursorLayer.append(marker);
      remoteCursors.set(cursor.id, marker);
    }
    marker.style.left = `${cursor.x * 100}%`;
    marker.style.top = `${cursor.y * 100}%`;
    marker.style.setProperty("--cursor-color", cursor.color);
  }

  function removeRemoteCursor(id) {
    remoteCursors.get(id)?.remove();
    remoteCursors.delete(id);
  }

  function setOfflineMode() {
    state.online = false;
    modeReadout.textContent = "LOCAL DEMO";
    connectionLabel.textContent = "Local demo mode";
    connectionLight.classList.remove("is-online");
    userCount.textContent = "01";
    statusMessage.textContent = "Socket server not found. Drawing still works locally; run npm start for collaboration.";
  }

  function connectSocket() {
    if (typeof window.io !== "function") {
      setOfflineMode();
      return;
    }

    const socket = window.io({ transports: ["websocket", "polling"] });
    state.socket = socket;

    socket.on("connect", () => {
      state.online = true;
      modeReadout.textContent = "NETWORK";
      connectionLabel.textContent = "WebSocket connected";
      connectionLight.classList.add("is-online");
      clientId.textContent = socket.id.slice(0, 6).toUpperCase();
      statusMessage.textContent = "Connected. Open a second tab and draw into the shared field.";
    });

    socket.on("disconnect", () => {
      state.online = false;
      modeReadout.textContent = "RECONNECTING";
      connectionLabel.textContent = "Signal interrupted";
      connectionLight.classList.remove("is-online");
      statusMessage.textContent = "Connection lost. The client is trying to reconnect.";
    });

    socket.on("canvas-state", (segments) => {
      if (!Array.isArray(segments)) return;
      state.segments = segments;
      redrawField();
      statusMessage.textContent = `Received ${segments.length} stored network segments.`;
    });

    socket.on("draw-segment", (segment) => addSegment(segment));
    socket.on("clear-canvas", () => {
      state.segments = [];
      redrawField();
      statusMessage.textContent = "The shared field was cleared by a connected observer.";
    });
    socket.on("presence", (count) => {
      userCount.textContent = String(Math.max(1, Number(count) || 1)).padStart(2, "0");
    });
    socket.on("cursor", updateRemoteCursor);
    socket.on("cursor-left", removeRemoteCursor);
  }

  function loadSocketClient() {
    const script = document.createElement("script");
    script.src = "/socket.io/socket.io.js";
    script.addEventListener("load", connectSocket, { once: true });
    script.addEventListener("error", setOfflineMode, { once: true });
    document.head.append(script);
  }

  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(canvasShell);
  updateStats();
  loadSocketClient();
})();
