const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const SystemSettings = require('../src/models/SystemSettings');
const Attendance = require('../src/models/Attendance');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    const user_id = '69a6e12512412c9beeb86710';
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    console.log(`Current Time: ${now.toString()}`);

    const settings = await SystemSettings.findOne() || {};
    console.log(`Work Start: ${settings.work_start_time}, Threshold: ${settings.late_threshold_minutes}`);

    let is_late = false;
    let late_minutes = 0;

    if (settings.work_start_time) {
        const [h, m] = settings.work_start_time.split(':').map(Number);
        const workStart = new Date(now);
        workStart.setHours(h, m, 0, 0);
        const threshold = settings.late_threshold_minutes || 0;
        const lateLimit = new Date(workStart.getTime() + (threshold * 60000));

        console.log(`Work Start Date: ${workStart.toString()}`);
        console.log(`Late Limit Date: ${lateLimit.toString()}`);

        if (now > lateLimit) {
            is_late = true;
            late_minutes = Math.floor((now.getTime() - workStart.getTime()) / 60000);
        }
    }

    console.log(`Result: is_late=${is_late}, late_minutes=${late_minutes}`);
    await mongoose.disconnect();
}

test();
