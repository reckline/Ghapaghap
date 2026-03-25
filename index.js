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

// 🔍 Model Import
const Message = require('./model/Message'); 
const Notification = require('./model/Notification');
const Admin = require('./model/admin'); 
const User = require('./model/user'); // 🔥 User model for decrement logic

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

// 🔥 GLOBAL POPUP ADS MIDDLEWARE (Sare pages ke liye)
app.use(async (req, res, next) => {
    try {
        const adminData = await Admin.findOne().lean();
        res.locals.activeAds = adminData ? adminData.popupAds.filter(ad => ad.isActive === true) : [];
    } catch (err) {
        console.error("❌ Popup Fetch Error:", err.message);
        res.locals.activeAds = [];
    }
    next();
});

// 🔥 UPDATED GLOBAL MIDDLEWARE (Unread Count Logic)
app.use(async (req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.success = req.query.success || null;
    res.locals.error = req.query.error || null;
    res.locals.currentPath = req.path;
    res.locals.notifyCount = 0; 

    if (req.session && req.session.user) {
        req.user = req.session.user; 
        
        try {
            if (Message && typeof Message.countDocuments === 'function') {
                const unreadCount = await Message.countDocuments({
                    receiver: req.session.user._id,
                    read: false
                });
                res.locals.unreadCount = unreadCount;
            } else {
                console.warn("⚠️ Warning: Message model not loaded as Mongoose Model.");
                res.locals.unreadCount = 0;
            }
        } catch (err) {
            console.error("❌ Count Error in Middleware:", err.message);
            res.locals.unreadCount = 0;
        }
    } else {
        res.locals.unreadCount = 0;
    }
    next();
});

// =========================================================
// NotifyCount Middleware
// =========================================================
app.use(async (req, res, next) => {
    if (req.session && req.session.user) {
        try {
            const count = await Notification.countDocuments({ 
                recipient: req.session.user._id, 
                isRead: false 
            });
            res.locals.notifyCount = count;
            // console.log("✅ Current Notify Count:", count); 
        } catch (err) {
            console.log("❌ Notif Count Error:", err);
        }
    }
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
const notificationRoutes = require('./routes/notificationRoutes');

app.use('/admin', adminRouter); 
app.use('/search', searchRouter); 
app.use('/verify', verifyRouter); 
app.use('/', notificationRoutes);
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

// =========================================================
// 🕒 AUTOMATIC MINUTE DEDUCTION (Every 2 Minutes)
// =========================================================
setInterval(async () => {
    try {
        const activeUsers = await User.countDocuments({ totalMinutes: { $gt: 0 } });
        if (activeUsers > 0) {
            // Har 2 minute mein 2 minus karein
            await User.updateMany(
                { totalMinutes: { $gt: 0 } }, 
                { $inc: { totalMinutes: -2 } }
            );

            // Cleanup: Jo 0 se niche chale gaye unhe 0 set karein aur status update karein
            await User.updateMany(
                { totalMinutes: { $lte: 0 }, accountStatus: 'paid' },
                { $set: { totalMinutes: 0, accountStatus: 'updated' } }
            );
            console.log(`📉 Success: ${activeUsers} users ka 2-min balance deduct hua.`);
        }
    } catch (err) {
        console.error("❌ Deduction Timer Error:", err.message);
    }
}, 120000); // 120000ms = 2 Minutes


server.listen(PORT, () => {
    console.log(`🚀 Server running at: http://localhost:${PORT}`);
});