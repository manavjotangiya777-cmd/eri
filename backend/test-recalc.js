const mongoose = require('mongoose');
const Profile = require('./src/models/Profile');
const Attendance = require('./src/models/Attendance');
const SystemSettings = require('./src/models/SystemSettings');

// Simple mocking of the global/internal helpers used in api.js
const getISTTimeParts = (date = new Date()) => {
    const formatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' });
    const parts = formatter.formatToParts(date);
    return { h: parseInt(parts.find(p => p.type === 'hour').value), m: parseInt(parts.find(p => p.type === 'minute').value), s: parseInt(parts.find(p => p.type === 'second').value) };
};

async function testRecalc() {
    await mongoose.connect('mongodb+srv://manavjotangiya777_db_user:manav123@cluster0.nkiv4xo.mongodb.net/it_company_crm');
    
    const u = await Profile.findOne({ full_name: 'Bansi Zalariya' });
    const record = await Attendance.findOne({ user_id: u._id, date: '2026-03-30' }).populate('user_id');
    
    if (!record) { console.log('Record not found'); await mongoose.disconnect(); return; }

    console.log('Testing recalculation for Bansi on Mar 30');
    console.log('Record User ID Populated?', !!record.user_id?.shift_type, 'Value:', record.user_id?.shift_type);
    
    // Manual run of the logic
    const settings = await SystemSettings.findOne();
    const firstClockIn = record.sessions && record.sessions.length > 0 ? record.sessions[0].clockInAt : null;
    
    const shiftType = record.shift_type || record.user_id?.shift_type || 'full_day';
    const startTimeStr = record.shift_start_time || (shiftType === 'half_day' ? (settings?.half_day_start_time || '09:00') : (settings?.work_start_time || '09:00'));
    
    console.log('Logic used shiftType:', shiftType);
    console.log('Logic used startTimeStr:', startTimeStr);
    
    if (shiftType === 'half_day' && startTimeStr === '14:30') {
        process.stdout.write('SUCCESS: Picks up correct half-day settings\n');
    } else {
        process.stdout.write('FAILURE: Still picks up full-day (or wrong) settings\n');
    }
    
    await mongoose.disconnect();
}

testRecalc().catch(console.error);
