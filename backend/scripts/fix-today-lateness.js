const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const SystemSettings = require('../src/models/SystemSettings');
const Attendance = require('../src/models/Attendance');

async function fixToday() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/it-crm');
        console.log('Connected to DB');

        const settings = await SystemSettings.findOne();
        if (!settings || !settings.work_start_time) {
            console.log('No settings or work_start_time found');
            return;
        }

        const [h, m] = settings.work_start_time.split(':').map(Number);
        const threshold = settings.late_threshold_minutes || 0;

        const records = await Attendance.find({
            date: '2026-03-07',
            is_late: false // Only fix those marked as On Time
        });

        console.log(`Checking ${records.length} records for today...`);

        let fixedCount = 0;
        for (const record of records) {
            if (record.sessions.length > 0) {
                const clockIn = new Date(record.sessions[0].clockInAt);
                const workStart = new Date(clockIn);
                workStart.setHours(h, m, 0, 0);
                const lateLimit = new Date(workStart.getTime() + threshold * 60000);

                if (clockIn > lateLimit) {
                    record.is_late = true;
                    record.late_minutes = Math.floor((clockIn.getTime() - workStart.getTime()) / 60000);
                    await record.save();
                    console.log(`Fixed record for user ${record.user_id}: Lateness set to ${record.late_minutes}m`);
                    fixedCount++;
                }
            }
        }

        console.log(`Done. Fixed ${fixedCount} records.`);
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

fixToday();
