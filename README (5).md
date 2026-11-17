# Tutorial 15 - Shared Signal Field

**Richard Allen Rojas-Rangel**  
ART 109 - Tutorial 15

Shared Signal Field is a collaborative drawing app built with Node.js,
Express, Socket.IO, HTML canvas, CSS, and JavaScript. Drawings are sent through
a WebSocket server and appear in every connected tab in real time.

## Run locally

```bash
cd tutorials/15-collaborative-drawing
npm install
npm start
```

Open `http://localhost:3000` in two browser tabs. Draw in one tab and confirm
that the same line appears in the second tab.

## Test the WebSocket connection

```bash
npm test
```

The test launches the server, connects two separate Socket.IO clients, sends a
line segment from one client to the other, clears the shared field, and checks
the server health endpoint.

## Deploy to Render

The repository root contains `render.yaml`, which points Render to this folder.

1. Push the complete repository to GitHub.
2. In Render, choose **New +** then **Blueprint**.
3. Connect `S0UNDB1T3/Art-109-Section-81`.
4. Approve the `new-world-nexus-shared-signal` web service.
5. Wait for the deploy to finish, then copy the provided `onrender.com` URL.
6. Open the Render URL in two tabs and take a screenshot showing the shared drawing.
7. Add the real Render URL to the Tutorial 15 submission PDF.

## Tutorial 15 requirement map

- Node.js server: `server.js`
- Express static server: `server.js`
- WebSocket connection: Socket.IO server and browser client
- Collaborative canvas: `public/app.js`
- Two-tab test: `npm test` plus browser screenshot
- Render setup: repository-root `render.yaml`

## AI-use disclosure

OpenAI Codex assisted with code development, debugging, testing, and packaging.
Richard Allen Rojas-Rangel directed the concept, visual design, features,
revisions, and final decisions.
