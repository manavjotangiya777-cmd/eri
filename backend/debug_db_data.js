const mongoose = require('mongoose');
const fs = require('fs');
const uri = 'mongodb+srv://manavjotangiya777_db_user:manav123@cluster0.nkiv4xo.mongodb.net/it_company_crm';

async function debugData() {
    await mongoose.connect(uri);
    const profiles = await mongoose.connection.db.collection('profiles').find({ role: 'client' }).toArray();
    const clients = await mongoose.connection.db.collection('clients').find().toArray();
    const tasks = await mongoose.connection.db.collection('tasks').find().toArray();

    const output = {
        profiles,
        clients,
        tasks: tasks.slice(0, 5) // just a few
    };

    fs.writeFileSync('db_debug.json', JSON.stringify(output, null, 2));
    process.exit();
}

debugData();
