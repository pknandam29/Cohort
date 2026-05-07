import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import db from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  app.use(cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://cohort-beta-nine.vercel.app"
    ],
    credentials: true
  }));
  app.use(express.json());

  // ── Auth ───────────────────────────────────────────────────────────────

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT id, username, email, fullName, role, theme FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (!user) return res.status(401).json({ error: "Invalid username or password" });
    db.prepare("INSERT INTO audit_log (userId, action, entity, details) VALUES (?, ?, ?, ?)").run(user.id, 'LOGIN', 'user', `User ${user.username} logged in`);
    res.json(user);
  });

  // ── Users (Admin) ─────────────────────────────────────────────────────

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, username, email, fullName, role, theme, createdAt FROM users ORDER BY createdAt DESC").all();
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    const { username, password, email, fullName, role } = req.body;
    if (!username || !password || !fullName) return res.status(400).json({ error: "Username, password, and fullName are required" });
    try {
      const result = db.prepare("INSERT INTO users (username, password, email, fullName, role) VALUES (?, ?, ?, ?, ?)").run(username, password, email || '', fullName, role || 'trainer');
      const user = db.prepare("SELECT id, username, email, fullName, role, createdAt FROM users WHERE id = ?").get(result.lastInsertRowid);
      res.json(user);
    } catch (e: any) {
      if (e.message?.includes('UNIQUE')) return res.status(400).json({ error: "Username already exists" });
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", (req, res) => {
    const { fullName, email, role } = req.body;
    db.prepare("UPDATE users SET fullName = ?, email = ?, role = ? WHERE id = ?").run(fullName, email, role, req.params.id);
    const user = db.prepare("SELECT id, username, email, fullName, role, createdAt FROM users WHERE id = ?").get(req.params.id);
    res.json(user);
  });

  app.delete("/api/users/:id", (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/users/:id/theme", (req, res) => {
    const { theme } = req.body;
    db.prepare("UPDATE users SET theme = ? WHERE id = ?").run(theme, req.params.id);
    res.json({ success: true });
  });

  // ── Batches ────────────────────────────────────────────────────────────

  app.get("/api/batches", (req, res) => {
    const includeArchived = req.query.includeArchived === 'true';
    const search = req.query.search as string || '';
    let query = "SELECT * FROM batches";
    const conditions: string[] = [];
    const params: any[] = [];

    if (!includeArchived) { conditions.push("archived = 0"); }
    if (search) { conditions.push("name LIKE ?"); params.push(`%${search}%`); }
    if (conditions.length) query += " WHERE " + conditions.join(" AND ");
    query += " ORDER BY createdAt DESC";

    const batches = db.prepare(query).all(...params);
    res.json(batches);
  });

  app.post("/api/batches", (req, res) => {
    const { name, description, startDate } = req.body;
    if (!name || !startDate) return res.status(400).json({ error: "Name and startDate are required" });

    const result = db.prepare("INSERT INTO batches (name, description, startDate, studentCount, averageAttendance) VALUES (?, ?, ?, 0, 0)").run(name, description || '', startDate);
    const batchId = result.lastInsertRowid;

    const insertSession = db.prepare("INSERT INTO sessions (batchId, sessionNumber, date, title, attendanceCount) VALUES (?, ?, ?, ?, 0)");
    const createSessions = db.transaction(() => {
      for (let i = 0; i < 12; i++) {
        const sessionDate = new Date(startDate);
        sessionDate.setDate(sessionDate.getDate() + i * 7);
        insertSession.run(batchId, i + 1, sessionDate.toISOString(), `Session ${i + 1}`);
      }
    });
    createSessions();

    const batch = db.prepare("SELECT * FROM batches WHERE id = ?").get(batchId);
    res.json(batch);
  });

  app.delete("/api/batches/:id", (req, res) => {
    db.prepare("DELETE FROM batches WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/batches/:id/archive", (req, res) => {
    const { archived } = req.body;
    db.prepare("UPDATE batches SET archived = ? WHERE id = ?").run(archived ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  // ── Students ───────────────────────────────────────────────────────────

  app.get("/api/batches/:id/students", (req, res) => {
    const students = db.prepare("SELECT * FROM students WHERE batchId = ?").all(req.params.id);
    res.json(students);
  });

  app.post("/api/batches/:id/students", (req, res) => {
    const { name, email } = req.body;
    const batchId = req.params.id;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const result = db.prepare("INSERT INTO students (name, email, batchId, attendancePercentage) VALUES (?, ?, ?, 0)").run(name, email || '', batchId);
    db.prepare("UPDATE batches SET studentCount = studentCount + 1 WHERE id = ?").run(batchId);

    const student = db.prepare("SELECT * FROM students WHERE id = ?").get(result.lastInsertRowid);
    res.json(student);
  });

  app.get("/api/students/:id", (req, res) => {
    const student = db.prepare("SELECT s.*, b.name as batchName FROM students s JOIN batches b ON s.batchId = b.id WHERE s.id = ?").get(req.params.id) as any;
    if (!student) return res.status(404).json({ error: "Student not found" });

    const attendance = db.prepare(`
      SELECT a.status, a.markedAt, sess.sessionNumber, sess.date, sess.title 
      FROM attendance a 
      JOIN sessions sess ON a.sessionId = sess.id 
      WHERE a.studentId = ? 
      ORDER BY sess.sessionNumber ASC
    `).all(req.params.id);

    res.json({ ...student, attendanceHistory: attendance });
  });

  // ── Sessions ───────────────────────────────────────────────────────────

  app.get("/api/batches/:id/sessions", (req, res) => {
    const sessions = db.prepare("SELECT * FROM sessions WHERE batchId = ? ORDER BY sessionNumber ASC").all(req.params.id);
    res.json(sessions);
  });

  app.get("/api/sessions/upcoming", (req, res) => {
    const now = new Date().toISOString();
    const sessions = db.prepare("SELECT s.*, b.name as batchName FROM sessions s JOIN batches b ON s.batchId = b.id WHERE s.date >= ? ORDER BY s.date ASC LIMIT 5").all(now);
    res.json(sessions);
  });

  app.put("/api/sessions/:id/notes", (req, res) => {
    const { notes } = req.body;
    db.prepare("UPDATE sessions SET notes = ? WHERE id = ?").run(notes || '', req.params.id);
    res.json({ success: true });
  });

  // ── Attendance ─────────────────────────────────────────────────────────

  app.get("/api/attendance/:sessionId", (req, res) => {
    const records = db.prepare("SELECT * FROM attendance WHERE sessionId = ?").all(req.params.sessionId);
    const map: Record<string, string> = {};
    (records as any[]).forEach(r => { map[r.studentId] = r.status; });
    res.json(map);
  });

  app.post("/api/attendance", (req, res) => {
    const { batchId, sessionId, studentId, status } = req.body;
    if (!batchId || !sessionId || !studentId || !status) return res.status(400).json({ error: "Missing required fields" });

    const existing = db.prepare("SELECT * FROM attendance WHERE sessionId = ? AND studentId = ?").get(sessionId, studentId) as any;

    const markAttendance = db.transaction(() => {
      if (!existing) {
        db.prepare("INSERT INTO attendance (batchId, sessionId, studentId, status) VALUES (?, ?, ?, ?)").run(batchId, sessionId, studentId, status);
        if (status === 'present') db.prepare("UPDATE sessions SET attendanceCount = attendanceCount + 1 WHERE id = ?").run(sessionId);
      } else {
        if (existing.status === status) return;
        db.prepare("UPDATE attendance SET status = ?, markedAt = datetime('now') WHERE id = ?").run(status, existing.id);
        if (status === 'present') db.prepare("UPDATE sessions SET attendanceCount = attendanceCount + 1 WHERE id = ?").run(sessionId);
        else db.prepare("UPDATE sessions SET attendanceCount = MAX(0, attendanceCount - 1) WHERE id = ?").run(sessionId);
      }

      const totalSessions = (db.prepare("SELECT COUNT(*) as cnt FROM sessions WHERE batchId = ?").get(batchId) as any).cnt || 12;
      const presentCount = (db.prepare("SELECT COUNT(*) as cnt FROM attendance WHERE studentId = ? AND batchId = ? AND status = 'present'").get(studentId, batchId) as any).cnt;
      db.prepare("UPDATE students SET attendancePercentage = ? WHERE id = ?").run((presentCount / totalSessions) * 100, studentId);

      const avgResult = db.prepare("SELECT AVG(attendancePercentage) as avg FROM students WHERE batchId = ?").get(batchId) as any;
      db.prepare("UPDATE batches SET averageAttendance = ? WHERE id = ?").run(avgResult.avg || 0, batchId);
    });

    markAttendance();
    res.json({ success: true });
  });

  app.post("/api/attendance/bulk", (req, res) => {
    const { batchId, sessionId, studentIds, status } = req.body;
    if (!batchId || !sessionId || !studentIds?.length || !status) return res.status(400).json({ error: "Missing fields" });

    const bulkMark = db.transaction(() => {
      for (const studentId of studentIds) {
        const existing = db.prepare("SELECT * FROM attendance WHERE sessionId = ? AND studentId = ?").get(sessionId, studentId) as any;
        if (!existing) {
          db.prepare("INSERT INTO attendance (batchId, sessionId, studentId, status) VALUES (?, ?, ?, ?)").run(batchId, sessionId, studentId, status);
        } else if (existing.status !== status) {
          db.prepare("UPDATE attendance SET status = ?, markedAt = datetime('now') WHERE id = ?").run(status, existing.id);
        }
      }
      // Recalculate session attendance count
      const presentCount = (db.prepare("SELECT COUNT(*) as cnt FROM attendance WHERE sessionId = ? AND status = 'present'").get(sessionId) as any).cnt;
      db.prepare("UPDATE sessions SET attendanceCount = ? WHERE id = ?").run(presentCount, sessionId);

      // Recalculate student percentages
      const totalSessions = (db.prepare("SELECT COUNT(*) as cnt FROM sessions WHERE batchId = ?").get(batchId) as any).cnt || 12;
      for (const studentId of studentIds) {
        const pc = (db.prepare("SELECT COUNT(*) as cnt FROM attendance WHERE studentId = ? AND batchId = ? AND status = 'present'").get(studentId, batchId) as any).cnt;
        db.prepare("UPDATE students SET attendancePercentage = ? WHERE id = ?").run((pc / totalSessions) * 100, studentId);
      }
      const avgResult = db.prepare("SELECT AVG(attendancePercentage) as avg FROM students WHERE batchId = ?").get(batchId) as any;
      db.prepare("UPDATE batches SET averageAttendance = ? WHERE id = ?").run(avgResult.avg || 0, batchId);
    });

    bulkMark();
    res.json({ success: true });
  });

  // ── Dashboard Stats ────────────────────────────────────────────────────

  app.get("/api/dashboard/alerts", (req, res) => {
    const lowAttendanceStudents = db.prepare(`
      SELECT s.id, s.name, s.attendancePercentage, s.batchId, b.name as batchName 
      FROM students s JOIN batches b ON s.batchId = b.id 
      WHERE s.attendancePercentage < 75 AND b.archived = 0
      ORDER BY s.attendancePercentage ASC LIMIT 10
    `).all();

    const todaySessions = db.prepare(`
      SELECT s.*, b.name as batchName FROM sessions s 
      JOIN batches b ON s.batchId = b.id 
      WHERE date(s.date) = date('now') AND b.archived = 0
    `).all();

    const nearingCompletion = db.prepare(`
      SELECT b.id, b.name, COUNT(s.id) as totalSessions,
        SUM(CASE WHEN date(s.date) <= date('now') THEN 1 ELSE 0 END) as completedSessions
      FROM batches b JOIN sessions s ON b.id = s.batchId
      WHERE b.archived = 0
      GROUP BY b.id HAVING completedSessions >= 10
    `).all();

    res.json({ lowAttendanceStudents, todaySessions, nearingCompletion });
  });

  app.get("/api/dashboard/trends", (req, res) => {
    const trends = db.prepare(`
      SELECT 
        strftime('%Y-%W', s.date) as week,
        ROUND(AVG(CASE WHEN a.status = 'present' THEN 100.0 ELSE 0.0 END), 1) as avgAttendance,
        COUNT(DISTINCT a.studentId) as totalStudents
      FROM attendance a
      JOIN sessions s ON a.sessionId = s.id
      JOIN batches b ON a.batchId = b.id
      WHERE b.archived = 0
      GROUP BY week
      ORDER BY week DESC
      LIMIT 12
    `).all();
    res.json(trends.reverse());
  });

  // ── Audit Log ──────────────────────────────────────────────────────────

  app.get("/api/audit-log", (req, res) => {
    const logs = db.prepare(`
      SELECT al.*, u.fullName as userName 
      FROM audit_log al 
      LEFT JOIN users u ON al.userId = u.id 
      ORDER BY al.createdAt DESC LIMIT 50
    `).all();
    res.json(logs);
  });


  // ── Health ─────────────────────────────────────────────────────────────

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  // ── Vite / Static ─────────────────────────────────────────────────────

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
