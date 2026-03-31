const mongoose = require('mongoose');
const Attendance = require('./src/models/Attendance');
const Profile = require('./src/models/Profile');

async function checkFinal() {
    await mongoose.connect('mongodb+srv://manavjotangiya777_db_user:manav123@cluster0.nkiv4xo.mongodb.net/it_company_crm');
    const u = await Profile.findOne({ full_name: 'Bansi Zalariya' });
    const record = await Attendance.findOne({ user_id: u._id, date: '2026-03-30' });
    
    console.log('--- FINAL STATE (Bansi Mar 30) ---');
    console.log('Work Seconds:', record.totals.workSeconds); // Should be 18000+
    console.log('Shift Work Hours Snapshot:', record.shift_work_hours); // Should be 5
    console.log('is_late:', record.is_late);
    console.log('late_minutes:', record.late_minutes);
    console.log('is_early_leave:', record.is_early_leave); // Should be false
    console.log('early_leave_minutes:', record.early_leave_minutes); // Should be 0
    
    if (!record.is_early_leave && record.early_leave_minutes === 0) {
        console.log('RESULT: FIXED IN DB (NO EARLY LEAVE)');
    } else {
        console.log('RESULT: STILL WRONG');
    }
    await mongoose.disconnect();
}
checkFinal();
