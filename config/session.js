const session = require('express-session');
// v6 mein require ke saath .default lagana mandatory hai
const MongoStore = require('connect-mongo').default; 

const sessionConfig = session({
    secret: process.env.SESSION_SECRET || 'ghapagap_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGO_URI, // Atlas link from .env
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60,
        autoRemove: 'native' 
    }),
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24, // 1 Day
        secure: false, // Localhost (HTTP) ke liye false hi rahega
        httpOnly: true 
    }
});

module.exports = sessionConfig;