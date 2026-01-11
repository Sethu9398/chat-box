const mongoose = require('mongoose');
require('dotenv').config();

const Message = require('./backend/models/Message');

async function checkMessages() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp');
    console.log('Connected to MongoDB');
    console.log('Connected to database:', mongoose.connection.db.databaseName);

    const messages = await Message.find({}).limit(10).sort({ createdAt: -1 });
    console.log('Recent messages:');
    messages.forEach(msg => {
      console.log(`Type: ${msg.type}, MediaUrl: ${msg.mediaUrl}, FileName: ${msg.fileName}, FileSize: ${msg.fileSize}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkMessages();
