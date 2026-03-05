const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Profile = require('../src/models/Profile');

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await Profile.find({});
        console.log('--- User DB Audit ---');
        users.forEach(u => {
            const isHashed = u.password_hash.startsWith('$2a$');
            console.log(`User: ${u.username}, Role: ${u.role}, Hashed: ${isHashed}, Hash Start: ${u.password_hash.substring(0, 10)}...`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkUsers();
