const mongoose = require('mongoose');
const Profile = require('./src/models/Profile');
const dotenv = require('dotenv');
dotenv.config();

const fixAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const count = await Profile.countDocuments();
        if (count > 0) {
            const firstUser = await Profile.findOne().sort({ created_at: 1 });
            firstUser.role = 'admin';
            await firstUser.save();
            console.log(`Successfully updated user "${firstUser.username}" to admin.`);
        } else {
            console.log("No users found to update.");
        }
        process.exit();
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
};

fixAdmin();
