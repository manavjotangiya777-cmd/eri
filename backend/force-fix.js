const mongoose = require('mongoose');
const Profile = require('./src/models/Profile');
const Attendance = require('./src/models/Attendance');
const SystemSettings = require('./src/models/SystemSettings');

const getISTTimeParts = (date = new Date()) => {
    const formatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' });
    const parts = formatter.formatToParts(date);
    return { h: parseInt(parts.find(p => p.type === 'hour').value), m: parseInt(parts.find(p => p.type === 'minute').value), s: parseInt(parts.find(p => p.type === 'second').value) };
};

const applyAttendanceCalculationManual = async (record, settings) => {
    let totalClockSeconds = 0;
    let totalBreakSeconds = 0;
    if (record.sessions) for (const s of record.sessions) if (s.clockInAt && s.clockOutAt) totalClockSeconds += Math.floor((new Date(s.clockOutAt) - new Date(s.clockInAt)) / 1000);
    if (record.breaks) for (const b of record.breaks) if (b.breakInAt && b.breakOutAt) totalBreakSeconds += Math.floor((new Date(b.breakOutAt) - new Date(b.breakInAt)) / 1000);
    record.totals.totalClockSeconds = totalClockSeconds;
    record.totals.totalBreakSeconds = totalBreakSeconds;
    record.totals.workSeconds = Math.max(0, totalClockSeconds - totalBreakSeconds);

    const firstClockIn = record.sessions && record.sessions.length > 0 ? record.sessions[0].clockInAt : null;
    if (firstClockIn) {
        const shiftType = record.shift_type || (record.user_id?.shift_type) || 'full_day';
        const startTimeStr = record.shift_start_time || (shiftType === 'half_day' ? (settings?.half_day_start_time || '09:00') : (settings?.work_start_time || '09:00'));
        const threshold = record.late_threshold ?? (shiftType === 'half_day' ? (settings?.half_day_late_threshold ?? 15) : (settings?.late_threshold_minutes ?? 15));

        const { h: inH, m: inM } = getISTTimeParts(new Date(firstClockIn));
        const [targetH, targetM] = startTimeStr.split(':').map(Number);
        const nowTotalMinutes = inH * 60 + inM;
        const targetTotalMinutes = targetH * 60 + targetM;
        if (nowTotalMinutes > (targetTotalMinutes + threshold)) {
            record.is_late = true;
            record.late_minutes = nowTotalMinutes - targetTotalMinutes;
        } else {
            record.is_late = false;
            record.late_minutes = 0;
        }
        
        record.shift_type = shiftType;
        record.shift_start_time = startTimeStr;
    }
    
    // CRITICAL FIX: Use half_day_work_hours (EXPECTED) instead of overtime threshold for early leave check
    const shiftType = record.shift_type || (record.user_id?.shift_type) || 'full_day';
    const oThresholdHours = record.shift_work_hours || (shiftType === 'half_day' ? (settings?.half_day_work_hours ?? 5) : (settings?.work_hours_per_day ?? 8));
    const thresholdSeconds = oThresholdHours * 3600;

    if (record.totals.workSeconds < thresholdSeconds) { 
        record.is_early_leave = true; 
        record.early_leave_minutes = Math.max(0, Math.round((thresholdSeconds - record.totals.workSeconds) / 60)); 
    }
    else { record.is_early_leave = false; record.early_leave_minutes = 0; }
    
    record.shift_work_hours = oThresholdHours;
    
    // Save back to DB
    const uid = record.user_id._id || record.user_id;
    record.user_id = uid;
    await record.save();
};

async function forceFix() {
    await mongoose.connect('mongodb+srv://manavjotangiya777_db_user:manav123@cluster0.nkiv4xo.mongodb.net/it_company_crm');
    const settings = await SystemSettings.findOne();
    const records = await Attendance.find({ date: /2026-03/ }).populate('user_id');
    console.log(`Found ${records.length} records to fix for March.`);
    for (const r of records) {
        await applyAttendanceCalculationManual(r, settings);
    }
    console.log('Force update complete. Corrected labels should now show in UI.');
    await mongoose.disconnect();
}

forceFix().catch(console.error);
