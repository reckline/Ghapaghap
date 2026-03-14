const User = require('../model/user');
const fs = require('fs');
const path = require('path');
const uploadToPhpServer = require('../utils/uploadToPhpServer'); // Aapka util file

exports.processLiveVerification = async (req, res) => {
    try {
        const { image } = req.body; // Frontend se Base64 image
        const currentUser = req.session.user;

        // 1. Check if user is logged in
        if (!currentUser) {
            return res.status(401).json({ success: false, message: "Pehle login karein!" });
        }

        // 2. Check if image exists
        if (!image) {
            return res.status(400).json({ success: false, message: "Photo capture nahi hui!" });
        }

        // --- 🚀 PHP SERVER UPLOAD LOGIC START ---

        // 3. Base64 string se header hatao aur Buffer banao
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        // 4. Temporary local path define karein (PHP upload ke liye local file chahiye)
        const tempFileName = `verify_${currentUser._id}_${Date.now()}.png`;
        const tempPath = path.join(__dirname, '../public/uploads/temp/', tempFileName);

        // Folder check: Agar temp folder nahi hai toh bana lo
        const tempDir = path.join(__dirname, '../public/uploads/temp/');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // 5. Pehle local server par save karein
        fs.writeFileSync(tempPath, buffer);

        try {
            // 6. PHP Server (Hostinger Bucket) par upload karein
            const uploadedUrl = await uploadToPhpServer(tempPath);

            // 7. Database update: 'Pending' status aur PHP Bucket ka URL save karein
            await User.findByIdAndUpdate(
                currentUser._id, 
                { 
                    verificationStatus: 'Pending',
                    verificationImage: uploadedUrl, // PHP Server wala URL
                    isVerified: false 
                }
            );

            // 8. Session update karein taaki UI refresh hone par status dikhe
            req.session.user.verificationStatus = 'Pending';
            req.session.user.verificationImage = uploadedUrl;
            req.session.user.isVerified = false;

            // 9. Local temp file delete kar dein (Storage saaf rakhne ke liye)
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }

            res.json({ 
                success: true, 
                message: "Aapki request bucket mein save ho gayi hai! Admin review ka wait karein. ⏳",
                url: uploadedUrl
            });

        } catch (uploadErr) {
            // Agar upload fail ho toh local temp file delete karna na bhulein
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            throw new Error("PHP Server Upload Failed: " + uploadErr.message);
        }

        // --- 🚀 PHP SERVER UPLOAD LOGIC END ---

    } catch (err) {
        console.error("Verification Error:", err.message);
        res.status(500).json({ 
            success: false, 
            message: err.message || "Server error: Request fail ho gayi." 
        });
    }
};