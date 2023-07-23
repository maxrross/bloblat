const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

// our localhost port
const port = 4001;

const app = express();

// Serve static files from the "public" directory
app.use(express.static('public'));

// our server instance
const server = http.createServer(app);

// This creates our socket using the instance of the server
const io = socketIO(server);

io.on('connection', socket => {
  console.log('New client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });

  // Listen for chat messages and broadcast them to all connected clients
  socket.on('chat_message', (message) => {
    io.emit('chat_message', message);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
