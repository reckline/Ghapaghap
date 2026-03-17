const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const http = require('http'); // 🆕 Added for Socket.io
const { Server } = require('socket.io'); // 🆕 Added

// 1. Environment Variables
dotenv.config(); 

// 2. Session config import
const sessionConfig = require('./config/session'); 

// 3. Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas Connected!"))
  .catch(err => console.error("❌ Database Connection Error:", err));

const app = express();
const server = http.createServer(app); // 🆕 Create HTTP server
const io = new Server(server); // 🆕 Initialize Socket.io

const PORT = process.env.PORT || 3000;

// 🆕 Socket.io ko app mein set kar rahe hain taaki controllers mein use ho sake
app.set('socketio', io);

io.on('connection', (socket) => {
    // console.log('A user connected for tracking:', socket.id);
    socket.on('disconnect', () => {
        // console.log('User disconnected');
    });
});

// =========================================================
// 🛠️ NOISE REQUESTS HANDLER
// =========================================================
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.json({}));

// 4. View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, 'views'));

// =========================================================
// 🛠️ GLOBAL MIDDLEWARES (LIMITS UPDATED TO 800MB)
// =========================================================
app.use(express.static(path.join(__dirname, 'public'))); 

/** * 🔥 CRITICAL FIX: 
 * Yahan '50mb' ki jagah '800mb' kiya hai kyunki 700MB ki file bhejni hai.
 * Iske bina 500 ya 413 "Payload Too Large" error aayega.
 */
app.use(express.json({ limit: '800mb' })); 
app.use(express.urlencoded({ limit: '800mb', extended: true, parameterLimit: 100000 })); 

app.use(sessionConfig); 

// Custom Middleware
app.use((req, res, next) => {
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

app.use('/admin', adminRouter); 
app.use('/search', searchRouter); 
app.use('/verify', verifyRouter); 
app.use('/', videoRoutes); 
app.use('/', loginAndSignupRouter); 
app.use('/', userRouter); 

// =========================================================
// ⚠️ ERROR HANDLING (404 Handler)
// =========================================================
app.use((req, res) => {
    const errorPath = req.url;
    if (!errorPath.includes('.json') && !errorPath.includes('.ico') && !errorPath.includes('.map')) {
        console.log("⚠️ 404 - Path Not Found:", errorPath);
    }

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

// 8. SERVER START
server.listen(PORT, () => {
    console.log(`🚀 Server running at: http://localhost:${PORT}`);
    console.log(`🔧 Socket.io & 800MB Upload Limits are active`);
});