const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// 1. Environment Variables
dotenv.config(); 

// 2. Session config import
const sessionConfig = require('./config/session'); 

// 3. Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas Connected!"))
  .catch(err => console.error("❌ Database Connection Error:", err));

const app = express();
const PORT = process.env.PORT || 3000;

// =========================================================
// 🛠️ NOISE REQUESTS HANDLER (Optimized)
// =========================================================
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.json({}));

// 4. View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, 'views'));

// 5. GLOBAL MIDDLEWARES
app.use(express.static(path.join(__dirname, 'public'))); 

// Payload limits for images/verification data
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true })); 

// Session middleware integration
app.use(sessionConfig); 

// Custom Middleware: Global variables for EJS templates
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

// Importing Routers
// ⚠️ Note: Make sure the file names in /routes/ match exactly!
const adminRouter = require('./routes/adminRouter'); 
const userRouter = require('./routes/userRouter');
const loginAndSignupRouter = require('./routes/loginAndSignupRouter');
const searchRouter = require('./routes/searchRouter'); 
const verifyRouter = require('./routes/verifyRouter'); 

// Registering Routers
app.use('/admin', adminRouter); 
app.use('/search', searchRouter); 
app.use('/verify', verifyRouter); 

// Catch-all routes for Auth and Users
app.use('/', loginAndSignupRouter); 
app.use('/', userRouter); 

// =========================================================
// ⚠️ ERROR HANDLING (404 Handler)
// =========================================================
app.use((req, res) => {
    const errorPath = req.url;
    
    // Log only relevant 404s
    if (!errorPath.includes('.json') && !errorPath.includes('.ico') && !errorPath.includes('.map')) {
        console.log("⚠️ 404 - Path Not Found:", errorPath);
    }

    // Set Status 404 and render
    res.status(404).render('User/404', { message: errorPath }, (err, html) => {
        if (err) {
            // Fallback UI if EJS fails
            return res.status(404).send(`
                <body style="background:#0f0f0f; color:white; font-family:sans-serif; text-align:center; padding-top:100px;">
                    <div style="max-width:600px; margin:0 auto; border: 1px dashed #333; padding:40px; border-radius:20px;">
                        <h1 style="color:#ec4899; font-size:5rem; margin-bottom:0;">404</h1>
                        <p style="font-size:1.2rem;">Bhai, <b>${errorPath}</b> naam ka rasta nahi mila!</p>
                        <p style="color:#666; font-size:0.9rem;">Tip: Routes file mein path check karo.</p>
                        <br><br>
                        <a href="/" style="color:white; text-decoration:none; background:#ec4899; padding:12px 25px; border-radius:50px; font-weight:bold;">Wapas Home Par Chalo</a>
                    </div>
                </body>
            `);
        }
        res.send(html);
    });
});

// 8. SERVER START
app.listen(PORT, () => {
    console.log(`🚀 Server running at: http://localhost:${PORT}`);
    console.log(`🔧 Admin Panel: http://localhost:${PORT}/admin/dashboard`);
});