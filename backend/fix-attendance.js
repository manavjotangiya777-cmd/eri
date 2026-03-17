require('dotenv').config();
const mongoose = require('mongoose');
const Attendance = require('./src/models/Attendance');
const Profile = require('./src/models/Profile');

const fixAttendance = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

        // Find today's attendance records that are clocked out or have clockOutAt set
        const records = await Attendance.find({ date: today });
        console.log(`Found ${records.length} total attendance records for today`);

        let fixed = 0;
        for (const record of records) {
            let changed = false;

            // Check if any session has clockOutAt
            if (record.sessions && record.sessions.length > 0) {
                const lastSession = record.sessions[record.sessions.length - 1];
                if (lastSession.clockOutAt) {
                    console.log(`Record for user ${record.user_id} has clockOutAt: ${lastSession.clockOutAt}. Removing it.`);
                    lastSession.clockOutAt = null;
                    lastSession.durationSeconds = 0;
                    changed = true;
                }
            }

            if (changed || record.status === 'clocked_out') {
                record.status = 'working';
                record.currentSessionOpen = true;

                // Recalculate totals
                let totalClockSeconds = 0;
                let totalBreakSeconds = 0;

                record.sessions.forEach(s => {
                    if (s.clockInAt && s.clockOutAt) {
                        s.durationSeconds = Math.floor((new Date(s.clockOutAt) - new Date(s.clockInAt)) / 1000);
                        totalClockSeconds += s.durationSeconds;
                    }
                });

                record.breaks.forEach(b => {
                    if (b.breakInAt && b.breakOutAt) {
                        b.durationSeconds = Math.floor((new Date(b.breakOutAt) - new Date(b.breakInAt)) / 1000);
                        totalBreakSeconds += b.durationSeconds;
                    }
                });

                record.totals.totalClockSeconds = totalClockSeconds;
                record.totals.totalBreakSeconds = totalBreakSeconds;
                record.totals.workSeconds = Math.max(0, totalClockSeconds - totalBreakSeconds);
                record.totals.overtimeSeconds = 0;
                record.is_early_leave = false;
                record.early_leave_minutes = 0;

                await record.save();
                fixed++;
            }
        }
        console.log(`Successfully fixed ${fixed} records.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

fixAttendance();
