const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const SystemSettings = require('../src/models/SystemSettings');
const Attendance = require('../src/models/Attendance');
const Profile = require('../src/models/Profile');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/it-crm');
        console.log('Connected to DB');

        const settings = await SystemSettings.findOne();
        console.log('System Settings:', JSON.stringify(settings, null, 2));

        const recentAttendance = await Attendance.find().sort({ created_at: -1 }).limit(5).populate('user_id', 'username');
        console.log('Recent Attendance Records:', JSON.stringify(recentAttendance, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

check();
