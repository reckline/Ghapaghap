const Message = require('../model/Message');
const User = require('../model/user');
const axios = require('axios');
const FormData = require('form-data');

// 1. Inbox: Multimedia Indicators & Unread Count
const getInbox = async (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/login');
    try {
        const userId = req.session.user._id;
        const messages = await Message.find({
            $or: [{ sender: userId }, { receiver: userId }]
        }).sort({ createdAt: -1 }).populate('sender receiver');

        const chatPartners = new Map();
        for (const msg of messages) {
            if (!msg.sender || !msg.receiver) continue;
            const partner = msg.sender._id.toString() === userId.toString() ? msg.receiver : msg.sender;
            const partnerId = partner._id.toString();

            if (!chatPartners.has(partnerId)) {
                const count = await Message.countDocuments({ sender: partnerId, receiver: userId, read: false });
                let lastMsgPreview = msg.message;
                
                if (!lastMsgPreview || lastMsgPreview.trim() === "") {
                    const icons = { 
                        image: "📷 Photo", 
                        audio: "🎵 Voice Note", 
                        video: "🎥 Video", 
                        file: "📎 File" 
                    };
                    lastMsgPreview = icons[msg.mediaType] || "Sent an attachment";
                }

                chatPartners.set(partnerId, {
                    id: partnerId,
                    username: partner.username,
                    image: partner.avatar || partner.profileImage || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
                    lastMsg: lastMsgPreview,
                    time: msg.createdAt,
                    unreadMessagesCount: count
                });
            }
        }
        res.render('User/inbox', { 
            user: req.session.user, 
            chatList: Array.from(chatPartners.values()), 
            unreadCount: await Message.countDocuments({ receiver: userId, read: false }) 
        });
    } catch (err) {
        console.error("❌ Inbox Error:", err);
        res.redirect('/');
    }
};

// 2. Chat Page: Fetch & Mark as Read
const getChatPage = async (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/login');
    try {
        const receiverId = req.params.id;
        const senderId = req.session.user._id;
        
        // Mark messages as read
        await Message.updateMany({ sender: receiverId, receiver: senderId, read: false }, { $set: { read: true } });
        
        const [receiver, messages] = await Promise.all([
            User.findById(receiverId),
            Message.find({ 
                $or: [
                    { sender: senderId, receiver: receiverId }, 
                    { sender: receiverId, receiver: senderId }
                ] 
            }).sort({ createdAt: 1 })
        ]);

        if (!receiver) return res.redirect('/inbox');
        
        res.render('User/chat', { 
            receiverId, 
            user: req.session.user, 
            receiver, 
            messages: messages || [] 
        });
    } catch (err) {
        console.error("❌ Chat Page Error:", err);
        res.redirect('/inbox');
    }
};

// 🚀 3. PHP API UPLOAD (Fixed for Audio & 412 Error)
const uploadMedia = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No file provided" });

        const form = new FormData();
        
        // boundary specify karne ke liye buffer ke sath details zaroori hain
        form.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
            knownLength: req.file.size
        });
        
        form.append('api_key', 'SECRET123'); // Ensure matches your PHP key

        console.log(`📤 Sending to PHP: ${req.file.originalname} (${req.file.mimetype})`);

        const response = await axios.post('https://24carret.in/upload.php', form, {
            headers: { 
                ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000 
        });

        if (response.data && response.data.status === true) {
            console.log("✅ PHP Success:", response.data.url);
            
            // 🔥 Audio Fix: PHP se aane wale type ko forward karein
            // Cache busting(?v=...) se 412 error solve ho jata hai
            return res.json({ 
                success: true, 
                url: `${response.data.url}?v=${Date.now()}`,
                mediaType: response.data.type || (req.file.mimetype.startsWith('audio') ? 'audio' : 'image')
            });
        } else {
            console.error("❌ PHP Error Response:", response.data);
            return res.status(500).json({ success: false, details: response.data });
        }
    } catch (err) {
        console.error("❌ Bridge Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 4. Socket Logic
const handleSocket = (io) => {
    io.on('connection', (socket) => {
        socket.on('join-chat', (userId) => {
            if (userId) socket.join(userId.toString());
        });

        socket.on('send-private-message', async (data) => {
            const { senderId, receiverId, message, media, mediaType } = data;
            if (!senderId || !receiverId) return;

            try {
                const newMessage = new Message({
                    sender: senderId,
                    receiver: receiverId,
                    message: message ? message.trim() : "",
                    media: media || null, 
                    mediaType: mediaType || 'text',
                    read: false
                });

                const savedMsg = await newMessage.save();

                // Receiver ko notify karein
                io.to(receiverId.toString()).emit('receive-private-message', {
                    senderId: senderId,
                    message: savedMsg.message,
                    media: savedMsg.media,
                    mediaType: savedMsg.mediaType,
                    _id: savedMsg._id,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });

            } catch (err) {
                console.error("❌ Socket Error:", err);
            }
        });
    });
};

module.exports = { getInbox, getChatPage, uploadMedia, handleSocket };