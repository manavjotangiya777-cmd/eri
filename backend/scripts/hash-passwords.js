const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const Profile = require('../src/models/Profile');

dotenv.config({ path: path.join(__dirname, '../.env') });

const hashExistingPasswords = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI not found in .env');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        const users = await Profile.find({});
        console.log(`Found ${users.length} users.`);

        let updatedCount = 0;
        for (const user of users) {
            // Updated regex to be more lenient but still targeted
            const isHashed = user.password_hash && user.password_hash.startsWith('$2') && user.password_hash.length > 30;

            if (!isHashed) {
                console.log(`Hashing plain text password for user: ${user.username}`);
                // The pre-save hook in Profile.js will handle the hashing if we just call .save()
                // But we should ensure the hook triggers by marking the field as modified
                // Actually, let's just do it explicitly here to be 100% sure it works right now
                const salt = await bcrypt.genSalt(10);
                user.password_hash = await bcrypt.hash(user.password_hash, salt);
                await user.save();
                updatedCount++;
            }
        }

        console.log(`Successfully updated ${updatedCount} passwords to hashed format.`);
        process.exit(0);
    } catch (err) {
        console.error('Error hashing passwords:', err);
        process.exit(1);
    }
};

hashExistingPasswords();
