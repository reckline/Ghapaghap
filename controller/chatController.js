const Message = require('../model/Message');
const User = require('../model/user');

// 1. Chat Page Load karna (History ke saath)
const getChatPage = async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    try {
        const receiverId = req.params.id;
        const senderId = req.session.user._id;

        const receiver = await User.findById(receiverId);
        if (!receiver) return res.status(404).send("User nahi mila!");

        // 📝 Purani Chat History nikalo
        const messages = await Message.find({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ]
        }).sort({ createdAt: 1 });

        // Image Fallback
        const finalImage = receiver.avatar || receiver.profileImage || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

        res.render('User/chat', { 
            receiverId,
            user: req.session.user,
            receiver: { ...receiver._doc, profileImage: finalImage },
            messages
        });
    } catch (err) {
        console.log("❌ Chat Page Error:", err.message);
        res.redirect('/');
    }
};

// 2. Socket logic (Message Save + Real-time)
const handleSocket = (io) => {
    io.on('connection', (socket) => {
        socket.on('join-chat', (userId) => {
            socket.join(userId);
        });

        socket.on('send-private-message', async (data) => {
            const { senderId, receiverId, message } = data;
            try {
                const newMessage = new Message({
                    sender: senderId,
                    receiver: receiverId,
                    message: message
                });
                await newMessage.save();

                io.to(receiverId).emit('receive-private-message', {
                    senderId,
                    message,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            } catch (err) {
                console.error("❌ Msg Save Error:", err);
            }
        });
    });
};

module.exports = { getChatPage, handleSocket };