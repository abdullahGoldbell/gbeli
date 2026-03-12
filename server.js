const { createServer } = require('http');
const { Server } = require('socket.io');

const port = parseInt(process.env.SOCKET_PORT || '3001', 10);

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*' },
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
