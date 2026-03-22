const Message = require('../model/Message');
const User = require('../model/user');

// 1. Inbox Page: Unread counts ke saath list dikhayega
const getInbox = async (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/login');

    try {
        const userId = req.session.user._id;

        // Saare messages nikalo jisme user involved ho
        const messages = await Message.find({
            $or: [{ sender: userId }, { receiver: userId }]
        })
        .sort({ createdAt: -1 })
        .populate('sender receiver');

        const chatPartners = new Map();

        // Unique chat partners nikalne ke liye loop
        for (const msg of messages) {
            const partner = msg.sender._id.toString() === userId.toString() ? msg.receiver : msg.sender;
            
            if (!partner) continue; // Safety check
            const partnerId = partner._id.toString();

            if (!chatPartners.has(partnerId)) {
                // Partner ke unread messages gino
                const count = await Message.countDocuments({
                    sender: partnerId,
                    receiver: userId,
                    read: false
                });

                chatPartners.set(partnerId, {
                    id: partnerId,
                    username: partner.username,
                    image: partner.avatar || partner.profileImage || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
                    lastMsg: msg.message,
                    time: msg.createdAt,
                    unreadMessagesCount: count // ✅ Iska naam match hona chahiye
                });
            }
        }

        const chatList = Array.from(chatPartners.values());

        // Global unread count for the "MESSAGES" header
        const totalUnread = await Message.countDocuments({ receiver: userId, read: false });

        res.render('User/inbox', { 
            user: req.session.user, 
            chatList,
            unreadCount: totalUnread // Header badge ke liye
        });
    } catch (err) {
        console.error("❌ Inbox Error:", err.message);
        res.redirect('/');
    }
};

// 2. Chat Page: Chat khulte hi messages ko 'Read' mark karega
const getChatPage = async (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/login');
    
    try {
        const receiverId = req.params.id;
        const senderId = req.session.user._id;

        // ✅ NEW: Saare unread messages ko 'read: true' kar do
        await Message.updateMany(
            { sender: receiverId, receiver: senderId, read: false },
            { $set: { read: true } }
        );

        const [receiver, sender] = await Promise.all([
            User.findById(receiverId),
            User.findById(senderId)
        ]);

        if (!receiver) return res.status(404).send("User nahi mila bhai!");

        const messages = await Message.find({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ]
        }).sort({ createdAt: 1 });

        const finalImage = receiver.avatar || receiver.profileImage || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

        res.render('User/chat', { 
            receiverId,
            user: req.session.user,
            receiver: { ...receiver._doc, profileImage: finalImage },
            messages: messages || []
        });
    } catch (err) {
        console.log("❌ Chat Page Error:", err.message);
        res.redirect('/');
    }
};

// 3. Socket Logic
const handleSocket = (io) => {
    io.on('connection', (socket) => {
        socket.on('join-chat', (userId) => {
            if (userId) {
                socket.join(userId.toString());
            }
        });

        socket.on('send-private-message', async (data) => {
            const { senderId, receiverId, message } = data;
            if (!senderId || !receiverId || !message.trim()) return;

            try {
                const newMessage = new Message({
                    sender: senderId,
                    receiver: receiverId,
                    message: message.trim(),
                    read: false 
                });
                const savedMsg = await newMessage.save();

                io.to(receiverId.toString()).emit('receive-private-message', {
                    senderId,
                    message: message.trim(),
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    _id: savedMsg._id
                });
            } catch (err) {
                console.error("❌ Msg Save Error:", err);
            }
        });
    });
};

module.exports = { getInbox, getChatPage, handleSocket };