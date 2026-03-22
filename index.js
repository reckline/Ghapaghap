const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const http = require('http'); 
const { Server } = require('socket.io'); 

// 1. Environment Variables
dotenv.config(); 

// 2. Session config import
const sessionConfig = require('./config/session'); 

// 🛠️ Controller Import (Socket handling ke liye)
const { handleSocket } = require('./controller/chatController');

// 🔍 Model Import (Count nikalne ke liye zaroori hai)
const Message = require('./model/Message'); 

// 3. Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas Connected!"))
  .catch(err => console.error("❌ Database Connection Error:", err));

const app = express();
const server = http.createServer(app); 

// ⚡ Server timeout
server.timeout = 600000; 
server.keepAliveTimeout = 600000;

const io = new Server(server); 

const PORT = process.env.PORT || 3000;

app.set('socketio', io);

// =========================================================
// ⚡ SOCKET.IO REAL-TIME LOGIC (Shifted to Controller)
// =========================================================
handleSocket(io); 

// =========================================================
// 🛠️ NOISE REQUESTS HANDLER
// =========================================================
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.json({}));

// 4. View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, 'views'));

// =========================================================
// 🛠️ GLOBAL MIDDLEWARES
// =========================================================
app.use(express.static(path.join(__dirname, 'public'))); 

app.use(express.json({ limit: '800mb' })); 
app.use(express.urlencoded({ 
    limit: '800mb', 
    extended: true, 
    parameterLimit: 1000000 
})); 

app.use(sessionConfig); 

// 🔥 UPDATED GLOBAL MIDDLEWARE (Unread Count Logic Added)
app.use(async (req, res, next) => {
    if (req.session && req.session.user) {
        req.user = req.session.user; 
        
        try {
            // 🔍 Database se unread messages ka count nikalo
            const unreadCount = await Message.countDocuments({
                receiver: req.session.user._id,
                read: false
            });
            // res.locals har EJS file mein automatic available hota hai
            res.locals.unreadCount = unreadCount;
            res.locals.notifyCount = 0; // Future notification system ke liye
        } catch (err) {
            console.error("❌ Count Error:", err);
            res.locals.unreadCount = 0;
            res.locals.notifyCount = 0;
        }
    } else {
        res.locals.unreadCount = 0;
        res.locals.notifyCount = 0;
    }
    
    res.locals.user = req.session.user || null;
    res.locals.success = req.query.success || null;
    res.locals.error = req.query.error || null;
    res.locals.currentPath = req.path;
    next();
});

// =========================================================
// 🛣️ ROUTES SETUP
// =========================================================
const adminRouter = require('./routes/adminRouter'); 
const userRouter = require('./routes/userRouter');
const loginAndSignupRouter = require('./routes/loginAndSignupRouter');
const searchRouter = require('./routes/searchRouter'); 
const verifyRouter = require('./routes/verifyRouter'); 
const videoRoutes = require("./routes/videoRoutes");
const chatRouter = require('./routes/chatRouter'); 

app.use('/admin', adminRouter); 
app.use('/search', searchRouter); 
app.use('/verify', verifyRouter); 
app.use('/', videoRoutes); 
app.use('/', chatRouter); 
app.use('/', userRouter); 
app.use('/', loginAndSignupRouter); 

// =========================================================
// ⚠️ ERROR HANDLING (404 Handler)
// =========================================================
app.use((req, res) => {
    const errorPath = req.url;
    console.log("⚠️ 404 - Path Not Found:", errorPath);

    res.status(404).render('User/404', { message: errorPath }, (err, html) => {
        if (err) {
            return res.status(404).send(`
                <body style="background:#0f0f0f; color:white; font-family:sans-serif; text-align:center; padding-top:100px;">
                    <div style="max-width:600px; margin:0 auto; border: 1px dashed #333; padding:40px; border-radius:20px;">
                        <h1 style="color:#ec4899; font-size:5rem; margin-bottom:0;">404</h1>
                        <p style="font-size:1.2rem;">Bhai, <b>${errorPath}</b> naam ka rasta nahi mila!</p>
                        <a href="/" style="color:white; text-decoration:none; background:#ec4899; padding:12px 25px; border-radius:50px; font-weight:bold;">Wapas Home</a>
                    </div>
                </body>
            `);
        }
        res.send(html);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running at: http://localhost:${PORT}`);
});