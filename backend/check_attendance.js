const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGODB_URI = process.env.MONGODB_URI;
const Attendance = require('./src/models/Attendance');

async function check() {
    await mongoose.connect(MONGODB_URI);
    const records = await Attendance.find().limit(10).sort({ date: -1 });
    console.log('Recent 10 records:');
    records.forEach(r => console.log(`${r.date} - ${r.user_id}`));

    // Find earliest
    const earliest = await Attendance.findOne().sort({ date: 1 });
    console.log('Earliest record:', earliest?.date);

    await mongoose.connection.close();
    process.exit(0);
}

check();
