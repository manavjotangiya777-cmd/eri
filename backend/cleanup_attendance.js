const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in .env');
    process.exit(1);
}

// Attendance Model
const Attendance = require('./src/models/Attendance');

async function cleanup() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        const dateThreshold = '2026-03-06';

        // Count before deletion
        const count = await Attendance.countDocuments({ date: { $lt: dateThreshold } });
        console.log(`Found ${count} records before ${dateThreshold}`);

        if (count > 0) {
            const result = await Attendance.deleteMany({ date: { $lt: dateThreshold } });
            console.log(`✅ Successfully deleted ${result.deletedCount} attendance records.`);
        } else {
            console.log('No records found to delete.');
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

cleanup();
