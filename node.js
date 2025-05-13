const express = require('express');
const app = express();

const ipTracker = {};
const blockedIPs = new Set();

app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Nếu đã bị block
  if (blockedIPs.has(ip)) {
    return res.status(429).send("Too many requests - IP temporarily blocked");
  }

  const now = Date.now();
  if (!ipTracker[ip]) {
    ipTracker[ip] = [];
  }

  // Chỉ giữ lại request trong 1 phút gần nhất
  ipTracker[ip] = ipTracker[ip].filter(timestamp => now - timestamp < 60 * 1000);
  ipTracker[ip].push(now);

  if (ipTracker[ip].length > 30) { // > 30 req/phút là spam
    blockedIPs.add(ip);
    setTimeout(() => blockedIPs.delete(ip), 10 * 60 * 1000); // Block 10 phút
    return res.status(429).send("IP blocked for spam");
  }

  next();
});
