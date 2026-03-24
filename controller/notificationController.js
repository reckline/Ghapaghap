// 1. Models ko require karna zaroori hai, warna 'Not defined' error aayega
const Notification = require("../model/Notification"); 
const User = require("../model/user"); // Populate karne ke liye User model zaroori hai

exports.getNotifications = async (req, res) => {
    try {
        // Session se User ID lo (Check karo ki user logged in hai)
        const userId = req.session.user?._id || req.session.user?.id;

        if (!userId) {
            console.log("⚠️ No User Session found in Notification Page");
            return res.redirect("/login");
        }

        console.log("🔍 Fetching notifications for user:", userId);

        // 1. Notifications nikalo aur sender ki details 'populate' karo
        // Isse sender ka username aur avatar access kar paoge EJS mein
        const notifications = await Notification.find({ recipient: userId })
            .populate('sender', 'username avatar fullname') 
            .sort({ createdAt: -1 })
            .lean(); // .lean() se performance acchi hoti hai read operations mein

        // 2. Notifications ko 'Read' mark karo 
        // Jab user page khol le, toh unread notifications ko read (true) kar do
        await Notification.updateMany(
            { recipient: userId, isRead: false },
            { $set: { isRead: true } }
        );

        // 3. Render the page
        res.render('User/notifications', {
            notifications,
            user: req.session.user, // Navbar ke liye user data bhej rahe hain
            title: "Notifications",
            notifyCount: 0 // Kyuki ab saari read ho gayi hain
        });

    } catch (err) {
        console.error("❌ Notification Page Error:", err.message);
        res.status(500).send("Bhai, kuch error aa gayi notification load karne mein.");
    }
};