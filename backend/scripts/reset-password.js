const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const Profile = require('../src/models/Profile');

dotenv.config({ path: path.join(__dirname, '../.env') });

const resetPassword = async (username, newPassword) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await Profile.findOne({ username });
        if (!user) {
            console.log('User not found');
            process.exit(1);
        }

        // We set it to the plain text, and the pre-save hook will hash it ONCE.
        user.password_hash = newPassword;
        await user.save();

        console.log(`Password reset for ${username} successful.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

// You can change 'admin123' to whatever you want
resetPassword('Rakshit2408', 'admin123');
