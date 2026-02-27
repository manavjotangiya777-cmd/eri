const mongoose = require('mongoose');
const Notification = require('./src/models/Notification');
const Profile = require('./src/models/Profile');

async function debug() {
    await mongoose.connect('mongodb+srv://manavjotangiya777_db_user:manav123@cluster0.nkiv4xo.mongodb.net/it_company_crm');
    
    // Find HR users
    const hrs = await Profile.find({ role: 'hr' });
    console.log(`Found ${hrs.length} HR users.`);
    
    for (const hr of hrs) {
        const unread = await Notification.find({
            target_user: hr._id,
            type: 'chat',
            is_read_by: { $ne: hr._id }
        });
        console.log(`HR: ${hr.username} (${hr._id}) has ${unread.length} unread chat notifications.`);
        unread.forEach(n => {
            console.log(` - ID: ${n._id}, ChatID: ${n.meta?.chat_id}, Msg: ${n.message}`);
        });
    }
    
    await mongoose.disconnect();
}

debug();
