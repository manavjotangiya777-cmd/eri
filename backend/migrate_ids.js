const mongoose = require('mongoose');
const uri = 'mongodb+srv://manavjotangiya777_db_user:manav123@cluster0.nkiv4xo.mongodb.net/it_company_crm';

async function migrate() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    // Migrate Attendances
    const attendances = await db.collection('attendances').find().toArray();
    console.log(`Checking ${attendances.length} attendance records...`);
    for (const a of attendances) {
        if (typeof a.user_id === 'string' && a.user_id.length === 24) {
            await db.collection('attendances').updateOne(
                { _id: a._id },
                { $set: { user_id: new mongoose.Types.ObjectId(a.user_id) } }
            );
        }
    }

    // Migrate Leaves
    const leaves = await db.collection('leaves').find().toArray();
    console.log(`Checking ${leaves.length} leave records...`);
    for (const l of leaves) {
        if (typeof l.user_id === 'string' && l.user_id.length === 24) {
            await db.collection('leaves').updateOne(
                { _id: l._id },
                { $set: { user_id: new mongoose.Types.ObjectId(l.user_id) } }
            );
        }
    }

    // Migrate Tasks
    const tasks = await db.collection('tasks').find().toArray();
    console.log(`Checking ${tasks.length} tasks...`);
    for (const t of tasks) {
        if (typeof t.assigned_to === 'string' && t.assigned_to.length === 24) {
            await db.collection('tasks').updateOne(
                { _id: t._id },
                { $set: { assigned_to: new mongoose.Types.ObjectId(t.assigned_to) } }
            );
        }
    }

    console.log('Migration completed successfully');
    process.exit(0);
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
