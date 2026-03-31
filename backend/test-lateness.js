const mongoose = require('mongoose');
const Profile = require('./src/models/Profile');
const SystemSettings = require('./src/models/SystemSettings');

const getISTTimeParts = (date = new Date()) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false, timeZone: 'Asia/Kolkata'
    });
    const parts = formatter.formatToParts(date);
    return {
        h: parseInt(parts.find(p => p.type === 'hour').value),
        m: parseInt(parts.find(p => p.type === 'minute').value),
        s: parseInt(parts.find(p => p.type === 'second').value)
    };
};

async function test(userId, nowStr) {
    await mongoose.connect('mongodb+srv://manavjotangiya777_db_user:manav123@cluster0.nkiv4xo.mongodb.net/it_company_crm');
    
    const settings = await SystemSettings.findOne();
    const user = await Profile.findById(userId);
    const shiftType = user?.shift_type || 'full_day';

    const startTime = shiftType === 'half_day'
        ? (settings?.half_day_start_time || '09:00')
        : (settings?.work_start_time || '09:00');
    const threshold = shiftType === 'half_day'
        ? (settings?.half_day_late_threshold ?? 15)
        : (settings?.late_threshold_minutes ?? 15);

    console.log('Testing userId:', userId, 'Now:', nowStr);
    console.log('User shift_type:', shiftType);
    console.log('settings startTime:', startTime, 'threshold:', threshold);

    const now = new Date(nowStr);
    const { h: nowH, m: nowM } = getISTTimeParts(now);
    const [targetH, targetM] = startTime.split(':').map(Number);

    const nowTotalMinutes = nowH * 60 + nowM;
    const targetTotalMinutes = targetH * 60 + targetM;
    const limitTotalMinutes = targetTotalMinutes + threshold;

    console.log('nowTotalMinutes:', nowTotalMinutes, 'limitTotalMinutes:', limitTotalMinutes);

    if (nowTotalMinutes > limitTotalMinutes) {
        console.log('Result: IS LATE', nowTotalMinutes - targetTotalMinutes, 'mins');
    } else {
        console.log('Result: NOT LATE');
    }
    
    await mongoose.disconnect();
}

const bansiId = "65fe95f64d08a544168d5943"; // Replace with real ID from my previous check if needed
// Actually let's find it first
mongoose.connect('mongodb+srv://manavjotangiya777_db_user:manav123@cluster0.nkiv4xo.mongodb.net/it_company_crm').then(async () => {
    const u = await Profile.findOne({ full_name: 'Bansi Zalariya' });
    if (u) {
        await test(u._id, '2026-03-31T14:32:00+05:30');
    } else {
        console.log('User not found');
        mongoose.disconnect();
    }
});
