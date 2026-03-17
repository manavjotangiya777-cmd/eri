require('dotenv').config();
const mongoose = require('mongoose');
const Attendance = require('./src/models/Attendance');
const Profile = require('./src/models/Profile');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

    // I know that the user 'eri.dev.m1' or 'Manav' exists, let's search via regex
    const user = await Profile.findOne({ username: /eri.dev.m1/i });
    if (!user) {
        console.log("No user found matching eri.dev.m1");
        process.exit();
    }

    const att = await Attendance.findOne({ user_id: user._id, date: today });
    if (att) {
        console.log(JSON.stringify(att.sessions, null, 2));
        console.log("lastClockInAt:", att.lastClockInAt);
        console.log("Totals:", att.totals);
        console.log("Status:", att.status);
    } else {
        console.log("No attendance found for today");
    }
    process.exit();
}
run();
