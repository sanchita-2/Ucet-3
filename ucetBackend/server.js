import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'MySQL123',
  database: process.env.DB_NAME || 'ucet_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection on startup
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}

// Middleware
app.use(cors({ origin: '*' })); // Allow all for dev
app.use(express.json());

// JWT Middleware (for protected routes)
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Seed default admin
async function seedDefaultAdmin() {
  try {
    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      ['admin@ucet.com']
    );

    if (rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const [result] = await pool.execute(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        ['admin', 'admin@ucet.com', hashedPassword, 'admin']
      );

      await pool.execute(
        'INSERT INTO admins (user_id, department) VALUES (?, ?)',
        [result.insertId, 'IT Department']
      );

      console.log('Default admin seeded successfully');
    } else {
      console.log('Default admin already exists');
    }
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

// Auth: Register
app.post('/auth/register', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    console.log('Register attempt:', req.body);

    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists
    const [existing] = await connection.execute('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email or username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [userResult] = await connection.execute(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role]
    );

    const userId = userResult.insertId;

    // Insert into role-specific table (with defaults)
    if (role === 'student') {
      await connection.execute(
        'INSERT INTO students (user_id, enrollment_year, major) VALUES (?, ?, ?)',
        [userId, new Date().getFullYear(), '']  // Default enrollment year
      );
    } else if (role === 'alumni') {
      await connection.execute(
        'INSERT INTO alumni (user_id, graduation_year, current_job) VALUES (?, ?, ?)',
        [userId, new Date().getFullYear() - 1, '']  // Default graduation year
      );
    } else if (role === 'admin') {
      await connection.execute(
        'INSERT INTO admins (user_id, department) VALUES (?, ?)',
        [userId, '']
      );
    }

    console.log('User  registered:', { id: userId, email, role });

    res.status(201).json({ message: 'Registration successful', userId });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Auth: Login
app.post('/auth/login', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    console.log('Login attempt:', req.body);

    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find user
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check role
    if (user.role !== role) {
      return res.status(403).json({ message: 'Invalid role for this user' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    console.log('User  logged in:', { email, role });

    res.json({ token, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Admin: Get users (protected)
app.get('/admin/users', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT id, username AS name, email, role FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to load users' });
  } finally {
    connection.release();
  }
});

// Admin: News routes (protected)
app.get('/admin/news', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT n.*, u.username AS created_by_name FROM news n LEFT JOIN users u ON n.created_by = u.id ORDER BY n.created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({ message: 'Failed to load news' });
  } finally {
    connection.release();
  }
});

app.post('/admin/news', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

  const { title, content } = req.body;
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'INSERT INTO news (title, content, created_by) VALUES (?, ?, ?)',
      [title, content, req.user.id]
    );
    res.status(201).json({ id: result.insertId, title, content, created_at: new Date() });
  } catch (error) {
    console.error('Post news error:', error);
    res.status(500).json({ message: 'Failed to add news' });
  } finally {
    connection.release();
  }
});

app.put('/admin/news/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

  const id = parseInt(req.params.id);
  const { title, content } = req.body;
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'UPDATE news SET title = ?, content = ? WHERE id = ?',
      [title, content, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'News not found' });
    }
    res.json({ message: 'News updated' });
  } catch (error) {
    console.error('Update news error:', error);
    res.status(500).json({ message: 'Failed to update news' });
  } finally {
    connection.release();
  }
});

app.delete('/admin/news/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

  const id = parseInt(req.params.id);
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute('DELETE FROM news WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'News not found' });
    }
    res.json({ message: 'News deleted' });
  } catch (error) {
    console.error('Delete news error:', error);
    res.status(500).json({ message: 'Failed to delete news' });
  } finally {
    connection.release();
  }
});

// Admin: Resources routes (protected)
app.get('/admin/resources', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT r.*, u.username AS created_by_name FROM resources r LEFT JOIN users u ON r.created_by = u.id ORDER BY r.created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ message: 'Failed to load resources' });
  } finally {
    connection.release();
  }
});

app.post('/admin/resources', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

  const { title, link } = req.body;
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'INSERT INTO resources (title, link, created_by) VALUES (?, ?, ?)',
      [title, link, req.user.id]
    );
    res.status(201).json({ id: result.insertId, title, link, created_at: new Date() });
  } catch (error) {
    console.error('Post resource error:', error);
    res.status(500).json({ message: 'Failed to add resource' });
  } finally {
    connection.release();
  }
});

app.put('/admin/resources/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

  const id = parseInt(req.params.id);
  const { title, link } = req.body;
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'UPDATE resources SET title = ?, link = ? WHERE id = ?',
      [title, link, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.json({ message: 'Resource updated' });
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({ message: 'Failed to update resource' });
  } finally {
    connection.release();
  }
});

app.delete('/admin/resources/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

  const id = parseInt(req.params.id);
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute('DELETE FROM resources WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.json({ message: 'Resource deleted' });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({ message: 'Failed to delete resource' });
  } finally {
    connection.release();
  }
});

// Health check endpoint (optional)
app.get('/', (req, res) => {
  res.json({ message: 'UCET Backend Server Running' });
});

// Startup: Test DB, seed admin, then start server
async function startServer() {
  await testConnection();
  await seedDefaultAdmin();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();