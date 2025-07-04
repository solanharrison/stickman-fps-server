// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const players = {};
const bullets = [];

function generateName() {
  return 'Player' + Math.floor(Math.random() * 10000);
}

io.on('connection', (socket) => {
  console.log('New player connected:', socket.id);
  players[socket.id] = {
    id: socket.id,
    name: generateName(),
    x: Math.random() * 800 + 100,
    y: Math.random() * 500 + 100,
    angle: 0,
    health: 100,
    kills: 0
  };

  socket.emit('init', socket.id);

  socket.on('move', ({ keys, angle }) => {
    const p = players[socket.id];
    if (!p) return;

    p.angle = angle; // ✅ Update player direction

    const speed = 3;
    if (keys['w']) p.y -= speed;
    if (keys['s']) p.y += speed;
    if (keys['a']) p.x -= speed;
    if (keys['d']) p.x += speed;

    // ✅ Stay inside canvas
    p.x = Math.max(10, Math.min(1590, p.x));
    p.y = Math.max(10, Math.min(1190, p.y));
  });

  socket.on('shoot', () => {
    const p = players[socket.id];
    if (!p) return;
    bullets.push({
      x: p.x,
      y: p.y,
      angle: p.angle,
      owner: socket.id
    });
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
  });
});

setInterval(() => {
  // Move bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += Math.cos(b.angle) * 5;
    b.y += Math.sin(b.angle) * 5;

    // Check collision with players
    for (const id in players) {
      if (id !== b.owner) {
        const p = players[id];
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        if (Math.sqrt(dx * dx + dy * dy) < 15) {
          p.health -= 25;
          bullets.splice(i, 1);
          if (p.health <= 0) {
            players[b.owner].kills += 1;
            p.health = 100;
            p.x = Math.random() * 800 + 100;
            p.y = Math.random() * 500 + 100;
          }
          break;
        }
      }
    }

    // Remove bullets off canvas
    if (b.x < 0 || b.x > 1600 || b.y < 0 || b.y > 1200) {
      bullets.splice(i, 1);
    }
  }

  io.emit('state', { players, bullets });
}, 1000 / 30);

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
