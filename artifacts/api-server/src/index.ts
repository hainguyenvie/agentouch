import { createServer } from "http";
import app from "./app.js";
import { attachWebSocketServer } from "./ws/hub.js";

const rawPort = process.env["PORT"];
const port = rawPort ? Number(rawPort) : 8080;

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
attachWebSocketServer(server);

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
