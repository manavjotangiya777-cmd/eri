const mongoose = require('mongoose');
const uri = 'mongodb+srv://manavjotangiya777_db_user:manav123@cluster0.nkiv4xo.mongodb.net/it_company_crm';

async function fixData() {
    await mongoose.connect(uri);

    // 1. Find the client "Error Infotech"
    const client = await mongoose.connection.db.collection('clients').findOne({ company_name: 'Error Infotech' });

    if (client) {
        console.log('Found client:', client.company_name, client._id);

        // 2. Link all users with role 'client' to this client record
        const result = await mongoose.connection.db.collection('profiles').updateMany(
            { role: 'client', client_id: null },
            { $set: { client_id: client._id } }
        );

        console.log(`Updated ${result.modifiedCount} client profiles.`);
    } else {
        console.log('Client "Error Infotech" not found.');
    }

    process.exit();
}

fixData();
