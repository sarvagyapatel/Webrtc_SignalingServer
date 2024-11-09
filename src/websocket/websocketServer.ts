import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Duplex } from "stream";

const app = express();
const port = 8080;

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true });
const clients: Map<string, WebSocket> = new Map();

// Route handler
app.get("/", (req: any, res: { send: (arg0: string) => void; }) => {
  res.send("Welcome to the WebSocket Server!");
});

// WebSocket connection handler
wss.on("connection", (socket: WebSocket, request: IncomingMessage) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  const clientId = url.searchParams.get("clientId");

  if (!clientId) {
    socket.close(1008, "Client ID is required"); // Close if no client ID is provided
    return;
  }

  clients.set(clientId, socket);
  console.log(`Client connected with ID: ${clientId}`);
  
  socket.on('message', function message(data: any) {
    const message = JSON.parse(data);
    const targetSocket = clients.get(message.target);
    if (message.owner === 'sender') {
      if (message.type === 'createOffer') {
        console.log(message.type)
        targetSocket?.send(JSON.stringify({ type: 'createOffer', sdp: message.sdp }));
      } else if (message.type === 'iceCandidate') {
          targetSocket?.send(JSON.stringify({ type: 'iceCandidate', candidate: message.candidate }));
      }
    } else if (message.owner === 'receiver') {
      if (message.type === 'createAnswer') {
        console.log(message.type)
        targetSocket?.send(JSON.stringify({ type: 'createAnswer', sdp: message.sdp }));
      } else if (message.type === 'iceCandidate') {
          targetSocket?.send(JSON.stringify({ type: 'iceCandidate', candidate: message.candidate }));
        }
      }
  });

  // Close handler
  socket.on("close", () => {
    console.log(`Client with ID ${clientId} disconnected`);
    clients.delete(clientId);
  });
});

// Upgrade HTTP requests to WebSocket on a specific path
app.listen(port, () => {
  console.log(`Express server listening on http://localhost:${port}`);
}).on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  if (url.pathname === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

console.log(`WebSocket server running on ws://localhost:${port}/ws`);
