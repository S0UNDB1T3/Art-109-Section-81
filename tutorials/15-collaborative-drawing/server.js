"use strict";

const path = require("node:path");
const http = require("node:http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e6,
});

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const PORT = Number(process.env.PORT || argumentValue("--port")) || 3000;
const HOST = process.env.HOST || argumentValue("--host") || "0.0.0.0";
const MAX_SEGMENTS = 8000;
const COLORS = new Set(["#ff4d00", "#d8ff00", "#ff006e", "#a978ff", "#56e8ff", "#f2f1ec"]);
const publicDirectory = path.join(__dirname, "public");

let segments = [];

app.disable("x-powered-by");
app.use(express.static(publicDirectory));

app.get("/health", (_request, response) => {
  response.json({ status: "ok", users: io.engine.clientsCount, segments: segments.length });
});

function isNormalizedNumber(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function sanitizeSegment(value) {
  if (!value || typeof value !== "object") return null;

  const x0 = Number(value.x0);
  const y0 = Number(value.y0);
  const x1 = Number(value.x1);
  const y1 = Number(value.y1);
  const width = Number(value.width);
  const color = String(value.color || "").toLowerCase();

  if (![x0, y0, x1, y1].every(isNormalizedNumber)) return null;
  if (!Number.isFinite(width) || width < 1 || width > 32) return null;
  if (!COLORS.has(color)) return null;

  return { x0, y0, x1, y1, width, color };
}

function sanitizeCursor(value) {
  if (!value || typeof value !== "object") return null;
  const x = Number(value.x);
  const y = Number(value.y);
  if (!isNormalizedNumber(x) || !isNormalizedNumber(y)) return null;
  return { x, y, color: COLORS.has(String(value.color).toLowerCase()) ? String(value.color).toLowerCase() : "#56e8ff" };
}

function sendPresence() {
  io.emit("presence", io.engine.clientsCount);
}

io.on("connection", (socket) => {
  socket.emit("canvas-state", segments);
  sendPresence();

  socket.on("draw-segment", (value) => {
    const segment = sanitizeSegment(value);
    if (!segment) return;

    segments.push(segment);
    if (segments.length > MAX_SEGMENTS) {
      segments = segments.slice(-MAX_SEGMENTS);
    }

    socket.broadcast.emit("draw-segment", segment);
  });

  socket.on("cursor", (value) => {
    const cursor = sanitizeCursor(value);
    if (cursor) socket.broadcast.emit("cursor", { id: socket.id, ...cursor });
  });

  socket.on("clear-canvas", () => {
    segments = [];
    io.emit("clear-canvas");
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("cursor-left", socket.id);
    sendPresence();
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Shared Signal Field listening on http://${HOST}:${PORT}`);
});
