const { createServer } = require('http');
const { Server } = require('socket.io');

const port = parseInt(process.env.SOCKET_PORT || '3001', 10);
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

// jose is ESM-only — use dynamic import
let jwtVerify;
async function loadJose() {
  const jose = await import('jose');
  jwtVerify = jose.jwtVerify;
}

async function start() {
  await loadJose();

  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // Authenticate socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      await jwtVerify(token, JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('fleet:updated', (data) => {
      socket.broadcast.emit('fleet:updated', data);
    });

    socket.on('fleet:created', (data) => {
      socket.broadcast.emit('fleet:created', data);
    });

    socket.on('fleet:deleted', (data) => {
      socket.broadcast.emit('fleet:deleted', data);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`> Socket.io server ready on http://0.0.0.0:${port}`);
  });
}

start().catch(console.error);
