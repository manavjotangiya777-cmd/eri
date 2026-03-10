const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const Attendance = require('./src/models/Attendance');
const Absence = require('./src/models/Absence');

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        const threshold = '2026-03-06';

        // Check Attendance
        const attCount = await Attendance.countDocuments({ date: { $lt: threshold } });
        console.log(`Found ${attCount} Attendance records before ${threshold}`);
        if (attCount > 0) {
            const res = await Attendance.deleteMany({ date: { $lt: threshold } });
            console.log(`Deleted ${res.deletedCount} Attendance records.`);
        }

        // Check Absence
        const absCount = await Absence.countDocuments({ date: { $lt: threshold } });
        console.log(`Found ${absCount} Absence records before ${threshold}`);
        if (absCount > 0) {
            const res = await Absence.deleteMany({ date: { $lt: threshold } });
            console.log(`Deleted ${res.deletedCount} Absence records.`);
        }

        const earliestA = await Attendance.findOne().sort({ date: 1 });
        const earliestAb = await Absence.findOne().sort({ date: 1 });

        console.log('Current Earliest Attendance:', earliestA?.date);
        console.log('Current Earliest Absence:', earliestAb?.date);

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
}

run();
