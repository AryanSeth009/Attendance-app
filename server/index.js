import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import http from 'http';

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    'http://localhost:8081',  // Vite dev server
    'http://localhost:3000',  // Potential production build
    'http://10.0.2.2:8081',   // Android emulator
    'exp://localhost:8081'    // Expo development
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'student'], required: true },
});

const User = mongoose.model('User', userSchema);

// Classroom Schema
const classroomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joinCode: { type: String, required: true, unique: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'student'], required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Classroom = mongoose.model('Classroom', classroomSchema);

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['present', 'absent', 'late'], required: true },
  createdAt: { type: Date, default: Date.now }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};


// Generate a random join code
const generateJoinCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, role });
    await user.save();
    
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      user: { id: user._id, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Server error during registration', 
      error: process.env.NODE_ENV !== 'production' ? error.message : 'Internal Server Error'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  console.log('Login attempt received:', req.body);
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      console.warn('Login attempt with missing credentials');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      console.warn(`Login attempt with unknown email: ${email}`);
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.warn(`Failed login attempt for email: ${email}`);
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log(`Successful login for email: ${email}`);
    res.json({
      user: { id: user._id, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login', 
      error: process.env.NODE_ENV !== 'production' ? error.message : 'Internal Server Error'
    });
  }
});

// Classroom Routes
app.post('/api/classrooms', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Only admins can create classrooms
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create classrooms' });
    }

    const joinCode = generateJoinCode();
    const classroom = new Classroom({
      name,
      description,
      createdBy: user._id,
      joinCode,
      members: [{ user: user._id, role: 'admin' }]
    });

    await classroom.save();
    res.status(201).json(classroom);
  } catch (error) {
    console.error('Create classroom error:', error);
    res.status(500).json({ message: 'Server error while creating classroom' });
  }
});

app.get('/api/classrooms', authenticateToken, async (req, res) => {
  try {
    const classrooms = await Classroom.find({
      'members.user': req.user.id
    }).populate('createdBy', 'email');
    
    res.json(classrooms);
  } catch (error) {
    console.error('Get classrooms error:', error);
    res.status(500).json({ message: 'Server error while fetching classrooms' });
  }
});

app.get('/api/classrooms/:id', authenticateToken, async (req, res) => {
  try {
    const classroom = await Classroom.findOne({
      _id: req.params.id,
      'members.user': req.user.id
    }).populate('createdBy', 'email');
    
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }
    
    res.json(classroom);
  } catch (error) {
    console.error('Get classroom error:', error);
    res.status(500).json({ message: 'Server error while fetching classroom' });
  }
});

app.post('/api/classrooms/join', authenticateToken, async (req, res) => {
  try {
    const { joinCode } = req.body;
    const classroom = await Classroom.findOne({ joinCode });
    
    if (!classroom) {
      return res.status(404).json({ message: 'Invalid join code' });
    }

    // Check if user is already a member
    const isMember = classroom.members.some(member => 
      member.user.toString() === req.user.id
    );

    if (isMember) {
      return res.status(400).json({ message: 'Already a member of this classroom' });
    }

    classroom.members.push({
      user: req.user.id,
      role: 'student'
    });

    await classroom.save();
    res.json(classroom);
  } catch (error) {
    console.error('Join classroom error:', error);
    res.status(500).json({ message: 'Server error while joining classroom' });
  }
});

// Attendance Routes
app.post('/api/attendance/:classroomId/mark', authenticateToken, async (req, res) => {
  try {
    const { classroomId } = req.params;
    const { status } = req.body;

    // Verify classroom membership
    const classroom = await Classroom.findOne({
      _id: classroomId,
      'members.user': req.user.id
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Create attendance record
    const attendance = new Attendance({
      classroom: classroomId,
      student: req.user.id,
      status
    });

    await attendance.save();
    res.status(201).json(attendance);
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Server error while marking attendance' });
  }
});

app.get('/api/attendance/:classroomId', authenticateToken, async (req, res) => {
  try {
    const { classroomId } = req.params;

    // Verify classroom membership
    const classroom = await Classroom.findOne({
      _id: classroomId,
      'members.user': req.user.id
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    const attendance = await Attendance.find({ classroom: classroomId })
      .populate('student', 'email')
      .sort('-createdAt');

    res.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error while fetching attendance' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

// Detailed server creation and listening
const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : 'Not set'}`);
});

// Enhanced error handling for server
server.on('error', (error) => {
  console.error('Server startup error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});