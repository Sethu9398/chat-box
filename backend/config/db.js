const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;
    if (!mongoUri.includes('/')) {
      mongoUri += '/chatapp';
    }
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected ✅");
    console.log("Connected to database:", mongoose.connection.db.databaseName);
  } 
  catch (err) {
    console.error("MongoDB connection error ❌", err.message);
    process.exit(1);
  }
};
module.exports = connectDB;
