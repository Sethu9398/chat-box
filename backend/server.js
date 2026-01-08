const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes=require("./routes/userRoutes")

require("dotenv").config();

connectDB();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);



app.use("/auth", authRoutes);
app.use("/users",userRoutes)

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR ❌:", err.message);
  res.status(500).json({ message: err.message || "Server error" });
});

app.listen(process.env.PORT, () => {
  console.log("Server is running on port 5000");
});
