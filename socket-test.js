"use strict";

const path = require("node:path");
const { spawn } = require("node:child_process");
const { io } = require("socket.io-client");

const PORT = 43123;
const URL = `http://127.0.0.1:${PORT}`;
const serverPath = path.join(__dirname, "..", "server.js");

function onceWithTimeout(emitter, event, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeout);
    emitter.once(event, (...args) => {
      clearTimeout(timer);
      resolve(args);
    });
  });
}

async function run() {
  const server = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "inherit"],
  });

  const serverReady = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Server did not start")), 5000);
    server.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("Shared Signal Field listening")) {
        clearTimeout(timer);
        resolve();
      }
    });
  });

  let first;
  let second;

  try {
    await serverReady;
    first = io(URL, { transports: ["websocket"], forceNew: true });
    second = io(URL, { transports: ["websocket"], forceNew: true });
    await Promise.all([onceWithTimeout(first, "connect"), onceWithTimeout(second, "connect")]);

    const segment = {
      x0: 0.1,
      y0: 0.2,
      x1: 0.8,
      y1: 0.7,
      width: 5,
      color: "#ff4d00",
    };

    const received = onceWithTimeout(second, "draw-segment");
    first.emit("draw-segment", segment);
    const [remoteSegment] = await received;
    if (JSON.stringify(remoteSegment) !== JSON.stringify(segment)) {
      throw new Error("The second client received the wrong segment");
    }

    const cleared = onceWithTimeout(first, "clear-canvas");
    second.emit("clear-canvas");
    await cleared;

    const health = await fetch(`${URL}/health`).then((response) => response.json());
    if (health.status !== "ok" || health.segments !== 0 || health.users < 2) {
      throw new Error(`Unexpected health response: ${JSON.stringify(health)}`);
    }

    console.log("PASS: two clients shared a segment, cleared the field, and remained connected.");
  } finally {
    first?.disconnect();
    second?.disconnect();
    server.kill("SIGTERM");
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
