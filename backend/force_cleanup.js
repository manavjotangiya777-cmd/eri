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
        let attTotal = await Attendance.countDocuments({ date: { $lt: threshold } });
        console.log(`Found ${attTotal} Attendance records before ${threshold}. Deleting...`);
        let attRes = await Attendance.deleteMany({ date: { $lt: threshold } });
        console.log(`✅ Deleted ${attRes.deletedCount} Attendance records.`);

        // Check Absence
        let absTotal = await Absence.countDocuments({ date: { $lt: threshold } });
        console.log(`Found ${absTotal} Absence records before ${threshold}. Deleting...`);
        let absRes = await Absence.deleteMany({ date: { $lt: threshold } });
        console.log(`✅ Deleted ${absRes.deletedCount} Absence records.`);

        // Final verification
        const minAtt = await Attendance.findOne().sort({ date: 1 });
        const minAbs = await Absence.findOne().sort({ date: 1 });
        console.log('Resulting Earliest Dates:');
        console.log('  Attendance:', minAtt?.date || 'EMPTY');
        console.log('  Absence:', minAbs?.date || 'EMPTY');

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ ERROR:', err);
        process.exit(1);
    }
}

run();
