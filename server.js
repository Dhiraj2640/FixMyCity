 require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const app = express();

const config = require('./config');
console.log(config.admin.username);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/admin.html'));
  });

app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      }
    }
  }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));

});

  app.get('/check-files', (req, res) => {
    const fs = require('fs');
    const cssExists = fs.existsSync(path.join(__dirname, 'public/css/styles.css'));
    res.json({
      cssFileExists: cssExists,
      cssPath: path.join(__dirname, 'public/css/styles.css')
    });
  });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('MongoDB Connected');
   
    User.findOne({ isAdmin: true }).then(admin => {
        if (!admin && process.env.CREATE_DEFAULT_ADMIN === 'true') {
            const initialAdmin = new User({
                username: 'admin',
                email: 'admin@fixmycity.com',
                password: bcrypt.hashSync('admin123', 10),
                isAdmin: true,
            });
            initialAdmin.save()
                .then(() => console.log('Initial admin user created'))
                .catch(err => console.error('Error creating admin:', err));
        }
    });
})
.catch(err => console.error('MongoDB Connection Error:', err));

const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false }
}));

const Issue = mongoose.model('Issue', new mongoose.Schema({
    issueType: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    image: String,
    createdBy: { type: String, required: true },
    status: { type: String, default: 'Pending' },
    assignedTo: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
}));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        res.status(403).json({ message: 'Invalid token' });
    }
};

const isAdmin = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.json({ 
            token, 
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email, 
                isAdmin: user.isAdmin 
            } 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/admin/signup', async (req, res) => {
    try {
        const { username, email, password, adminKey } = req.body;
        
        if (adminKey !== process.env.ADMIN_SECRET_KEY) {
            return res.status(403).json({ message: 'Invalid admin key' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const adminUser = new User({
            username,
            email,
            password: hashedPassword,
            isAdmin: true
        });

        await adminUser.save();
        res.status(201).json({ message: 'Admin account created successfully' });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error creating admin account',
            error: error.message 
        });
    }
});

app.post('/report', authenticate, upload.single('image'), async (req, res) => {
    try {
        const { issueType, description, location } = req.body;
        
        if (!issueType || !description || !location) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const issue = new Issue({
            issueType,
            description,
            location,
            image: req.file ? req.file.filename : null,
            createdBy: req.user.email
        });

        await issue.save();
        res.status(201).json({ message: 'Issue reported successfully', issue });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.get('/reports', authenticate, isAdmin, async (req, res) => {
    try {
        const reports = await Issue.find().sort({ createdAt: -1 });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/reports/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { status, assignedTo } = req.body;
        const updatedReport = await Issue.findByIdAndUpdate(
            req.params.id,
            { status, assignedTo },
            { new: true }
        );

        if (!updatedReport) {
            return res.status(404).json({ message: 'Report not found' });
        }

        res.json({ message: 'Report updated', report: updatedReport });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/admin/dashboard', authenticate, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        const reports = await Issue.find().populate('createdBy', 'username email');
        
        res.json({
            userCount: users.length,
            reportCount: reports.length,
            recentReports: reports.slice(0, 5),
            users: users.slice(0, 5)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


 app.put('/reports/assign/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { assignedTo } = req.body;
        const updatedReport = await Issue.findByIdAndUpdate(
            req.params.id,
            { 
                status: 'In Progress',
                assignedTo 
            },
            { new: true }
        );

        if (!updatedReport) {
            return res.status(404).json({ message: 'Report not found' });
        }

        res.json({ message: 'Report assigned', report: updatedReport });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}); 


mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('MongoDB Connected');
    User.findOne({ isAdmin: true }).then(admin => {
        console.log('Admin check:', admin ? 'Exists' : 'Does not exist');
        if (!admin && process.env.CREATE_DEFAULT_ADMIN === 'true') {
            console.log('Creating default admin...');
        }
    });
})  