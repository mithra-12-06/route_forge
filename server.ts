import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("transport.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS route_stops (
    route_id INTEGER,
    stop_id INTEGER,
    sequence INTEGER,
    FOREIGN KEY(route_id) REFERENCES routes(id),
    FOREIGN KEY(stop_id) REFERENCES stops(id)
  );

  CREATE TABLE IF NOT EXISTS buses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bus_number TEXT NOT NULL,
    total_seats INTEGER NOT NULL,
    current_passengers INTEGER DEFAULT 0,
    current_route_id INTEGER,
    lat REAL,
    lng REAL,
    status TEXT DEFAULT 'active',
    FOREIGN KEY(current_route_id) REFERENCES routes(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    assigned_route_id INTEGER,
    FOREIGN KEY(assigned_route_id) REFERENCES routes(id)
  );

  CREATE TABLE IF NOT EXISTS boarding_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bus_id INTEGER,
    user_id INTEGER,
    type TEXT, -- 'entry' or 'exit'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS campus_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bus_id INTEGER,
    type TEXT, -- 'entry' or 'exit'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed Data if empty
const routeCount = db.prepare("SELECT COUNT(*) as count FROM routes").get() as { count: number };
if (routeCount.count === 0) {
  db.exec(`
    INSERT INTO routes (name) VALUES ('Route A'), ('Route B'), ('Route C'), ('Route D'), ('Route E');
    INSERT INTO stops (name, lat, lng) VALUES 
      ('Main Gate', 12.9716, 77.5946),
      ('Library', 12.9720, 77.5950),
      ('Hostel Block', 12.9730, 77.5960),
      ('Admin Block', 12.9740, 77.5970),
      ('Science Center', 12.9750, 77.5980),
      ('Sports Complex', 12.9760, 77.5990);
    
    INSERT INTO route_stops (route_id, stop_id, sequence) VALUES 
      (1, 1, 1), (1, 2, 2), (1, 3, 3),
      (2, 1, 1), (2, 4, 2), (2, 5, 3),
      (3, 3, 1), (3, 4, 2), (3, 6, 3),
      (4, 1, 1), (4, 6, 2),
      (5, 2, 1), (5, 5, 2);
  `);

  // Generate 60 buses
  const insertBus = db.prepare("INSERT INTO buses (bus_number, total_seats, current_passengers, current_route_id, lat, lng) VALUES (?, ?, ?, ?, ?, ?)");
  for (let i = 1; i <= 60; i++) {
    const routeId = (i % 5) + 1;
    const busNum = `RF-${String(i).padStart(3, '0')}`;
    const seats = 40 + (Math.floor(Math.random() * 3) * 10); // 40, 50, or 60
    const occupied = Math.floor(Math.random() * (seats + 5)); // Some might be overcrowded
    const lat = 12.9716 + (Math.random() * 0.005);
    const lng = 77.5946 + (Math.random() * 0.005);
    insertBus.run(busNum, seats, occupied, routeId, lat, lng);
  }

  db.exec(`
    INSERT INTO users (name, role, assigned_route_id) VALUES 
      ('Alice Student', 'student', 1),
      ('Bob Faculty', 'faculty', 2),
      ('Charlie Admin', 'admin', NULL);
  `);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // WebSocket broadcast helper
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // API Routes
  app.get("/api/init", (req, res) => {
    const routes = db.prepare("SELECT * FROM routes").all();
    const buses = db.prepare("SELECT * FROM buses").all();
    const stops = db.prepare("SELECT * FROM stops").all();
    const routeStops = db.prepare("SELECT * FROM route_stops").all();
    
    // Simple predictive logic: average passengers in last 24h for this hour
    const predictions = buses.map((bus: any) => {
      const ratio = bus.current_passengers / bus.total_seats;
      let level = 'Low';
      if (ratio > 0.85) level = 'High';
      else if (ratio > 0.5) level = 'Medium';
      
      return { busId: bus.id, predictedLevel: level };
    });

    res.json({ routes, buses, stops, routeStops, predictions });
  });

  // Admin Route Management
  app.post("/api/admin/routes", (req, res) => {
    const { name } = req.body;
    const result = db.prepare("INSERT INTO routes (name) VALUES (?)").run(name);
    res.json({ id: result.lastInsertRowid, name });
  });

  app.put("/api/admin/routes/:id", (req, res) => {
    const { name } = req.body;
    db.prepare("UPDATE routes SET name = ? WHERE id = ?").run(name, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/admin/routes/:id", (req, res) => {
    db.prepare("DELETE FROM routes WHERE id = ?").run(req.params.id);
    db.prepare("DELETE FROM route_stops WHERE route_id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Admin Stop Management
  app.post("/api/admin/stops", (req, res) => {
    const { name, lat, lng } = req.body;
    const result = db.prepare("INSERT INTO stops (name, lat, lng) VALUES (?, ?, ?)").run(name, lat, lng);
    res.json({ id: result.lastInsertRowid, name, lat, lng });
  });

  app.put("/api/admin/stops/:id", (req, res) => {
    const { name, lat, lng } = req.body;
    db.prepare("UPDATE stops SET name = ?, lat = ?, lng = ? WHERE id = ?").run(name, lat, lng, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/admin/stops/:id", (req, res) => {
    db.prepare("DELETE FROM stops WHERE id = ?").run(req.params.id);
    db.prepare("DELETE FROM route_stops WHERE stop_id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Admin Route-Stop Association
  app.post("/api/admin/route-stops", (req, res) => {
    const { routeId, stops } = req.body; // stops is an array of { stopId, sequence }
    
    db.transaction(() => {
      db.prepare("DELETE FROM route_stops WHERE route_id = ?").run(routeId);
      const insert = db.prepare("INSERT INTO route_stops (route_id, stop_id, sequence) VALUES (?, ?, ?)");
      for (const s of stops) {
        insert.run(routeId, s.stopId, s.sequence);
      }
    })();
    
    res.json({ success: true });
  });

  // Admin Bus Assignment
  app.post("/api/admin/bus/assign-route", (req, res) => {
    const { busId, routeId } = req.body;
    db.prepare("UPDATE buses SET current_route_id = ? WHERE id = ?").run(routeId, busId);
    const updatedBus = db.prepare("SELECT * FROM buses WHERE id = ?").get(busId);
    broadcast({ type: 'BUS_UPDATE', bus: updatedBus });
    res.json(updatedBus);
  });

  app.post("/api/admin/bus/capacity", (req, res) => {
    const { busId, total_seats } = req.body;
    db.prepare("UPDATE buses SET total_seats = ? WHERE id = ?").run(total_seats, busId);
    const updatedBus = db.prepare("SELECT * FROM buses WHERE id = ?").get(busId);
    broadcast({ type: 'BUS_UPDATE', bus: updatedBus });
    res.json(updatedBus);
  });

  app.post("/api/admin/suspend", (req, res) => {
    const { busId, status } = req.body;
    db.prepare("UPDATE buses SET status = ? WHERE id = ?").run(status, busId);
    const updatedBus = db.prepare("SELECT * FROM buses WHERE id = ?").get(busId);
    broadcast({ type: 'BUS_UPDATE', bus: updatedBus });
    res.json(updatedBus);
  });

  app.post("/api/campus/log", (req, res) => {
    const { busId, type } = req.body;
    db.prepare("INSERT INTO campus_logs (bus_id, type) VALUES (?, ?)").run(busId, type);
    res.json({ success: true });
  });

  app.get("/api/logs", (req, res) => {
    const boarding = db.prepare("SELECT * FROM boarding_logs ORDER BY timestamp DESC LIMIT 50").all();
    const campus = db.prepare("SELECT * FROM campus_logs ORDER BY timestamp DESC LIMIT 50").all();
    res.json({ boarding, campus });
  });

  app.get("/api/buses/:routeId", (req, res) => {
    const { routeId } = req.params;
    const buses = db.prepare("SELECT * FROM buses WHERE current_route_id = ?").all(routeId);
    res.json(buses);
  });

  app.post("/api/board", (req, res) => {
    const { busId, userId, type } = req.body;
    const bus = db.prepare("SELECT * FROM buses WHERE id = ?").get(busId) as any;
    
    if (!bus) return res.status(404).json({ error: "Bus not found" });

    let newCount = bus.current_passengers;
    if (type === 'entry') {
      if (newCount >= bus.total_seats + 10) { // Allow some standing room
        return res.status(400).json({ error: "Bus is critically overcrowded" });
      }
      newCount++;
    } else {
      newCount = Math.max(0, newCount - 1);
    }

    db.prepare("UPDATE buses SET current_passengers = ? WHERE id = ?").run(newCount, busId);
    db.prepare("INSERT INTO boarding_logs (bus_id, user_id, type) VALUES (?, ?, ?)").run(busId, userId, type);

    const updatedBus = db.prepare("SELECT * FROM buses WHERE id = ?").get(busId);
    broadcast({ type: 'BUS_UPDATE', bus: updatedBus });
    
    res.json(updatedBus);
  });

  app.post("/api/bus/location", (req, res) => {
    const { busId, lat, lng } = req.body;
    db.prepare("UPDATE buses SET lat = ?, lng = ? WHERE id = ?").run(lat, lng, busId);
    const updatedBus = db.prepare("SELECT * FROM buses WHERE id = ?").get(busId);
    broadcast({ type: 'BUS_UPDATE', bus: updatedBus });
    res.json({ success: true });
  });

  // Simulation loop for bus movement
  setInterval(() => {
    const buses = db.prepare("SELECT * FROM buses WHERE status = 'active'").all() as any[];
    buses.forEach(bus => {
      // Move bus slightly (simulating movement)
      const newLat = bus.lat + (Math.random() - 0.5) * 0.0001;
      const newLng = bus.lng + (Math.random() - 0.5) * 0.0001;
      
      db.prepare("UPDATE buses SET lat = ?, lng = ? WHERE id = ?").run(newLat, newLng, bus.id);
      
      broadcast({ 
        type: 'BUS_UPDATE', 
        bus: { ...bus, lat: newLat, lng: newLng } 
      });
    });
  }, 5000);

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
