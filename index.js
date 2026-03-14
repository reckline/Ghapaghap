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
// 🛠️ NOISE REQUESTS HANDLER
// =========================================================
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.json({}));
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 4. View Engine Setup
app.set('view engine', 'ejs');
// 💡 IMPORTANT: path.resolve use karne se absolute path milta hai, jo views missing error ko fix karega
app.set('views', path.resolve(__dirname, 'views'));

// 5. GLOBAL MIDDLEWARES
app.use(express.static(path.join(__dirname, 'public'))); 

// ⭐ Base64 aur badhe payloads ke liye limit
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true })); 

// ⭐ Session
app.use(sessionConfig); 

// 💡 Custom Middleware: Global variables for EJS
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.success = req.query.success || null;
    res.locals.error = req.query.error || null;
    // Current path tracking (Debugging ke liye helpful hai)
    res.locals.currentPath = req.path;
    next();
});

// 6. ROUTES SETUP
const adminRouter = require('./routes/adminRouter'); 
const userRouter = require('./routes/userRouter');
const loginAndSignupRouter = require('./routes/loginAndSignupRouter');
const searchRouter = require('./routes/searchRouter'); 
const verifyRouter = require('./routes/verifyRouter'); 

app.use('/admin', adminRouter); 
app.use('/search', searchRouter); 
app.use('/verify', verifyRouter); 
app.use('/', loginAndSignupRouter); 
app.use('/', userRouter); 

// 7. ERROR HANDLING (404 Handler)
app.use((req, res) => {
    const errorPath = req.url;
    
    if (!errorPath.includes('.json') && !errorPath.includes('.ico')) {
        console.log("⚠️ 404 - Path Not Found:", errorPath);
    }

    // Pehle 'User/404' (Capital) try karega, fail hua toh manual template dikhayega
    res.render('User/404', { message: errorPath }, (err, html) => {
        if (err) {
            // Agar file nahi milti toh ye fallback HTML chalega
            return res.status(404).send(`
                <body style="background:#0f0f0f; color:white; font-family:sans-serif; text-align:center; padding-top:100px;">
                    <h1 style="color:#ec4899; font-size:5rem; margin-bottom:0;">404</h1>
                    <p style="font-size:1.2rem;">Bhai, <b>${errorPath}</b> naam ka rasta nahi mila!</p>
                    <p style="color:#666; font-size:0.9rem;">(Check: views/User/404.ejs file missing hai)</p>
                    <br>
                    <a href="/" style="color:white; text-decoration:none; background:#ec4899; padding:12px 25px; border-radius:50px; font-weight:bold;">Wapas Home Par Chalo</a>
                </body>
            `);
        }
        res.send(html);
    });
});

// 8. SERVER START
app.listen(PORT, () => {
    console.log(`🚀 GhapaGhap Server running at: http://localhost:${PORT}`);
    // Debugging: Ye line aapko terminal mein batayegi server exactly kahan file dhund raha hai
    console.log(`📂 Views directory set to: ${app.get('views')}`);
});