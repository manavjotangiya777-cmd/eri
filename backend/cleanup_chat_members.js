const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const ChatMember = require('./src/models/ChatMember');

    console.log('Finding duplicates...');
    const duplicates = await ChatMember.aggregate([
        {
            $group: {
                _id: { chat_id: '$chat_id', user_id: '$user_id' },
                count: { $sum: 1 },
                ids: { $push: '$_id' }
            }
        },
        { $match: { count: { $gt: 1 } } }
    ]);

    console.log('Total duplicate pairs:', duplicates.length);
    duplicates.forEach((d, i) => {
        if (i < 5) console.log(`Pair: ${d._id.chat_id} - ${d._id.user_id}, Count: ${d.count}`);
    });

    if (duplicates.length > 0) {
        console.log('Cleaning up duplicates...');
        for (const d of duplicates) {
            // Keep only the first ID, delete the rest
            const toDelete = d.ids.slice(1);
            await ChatMember.deleteMany({ _id: { $in: toDelete } });
        }
        console.log('Cleanup complete.');
    }

    mongoose.connection.close();
}
run();
