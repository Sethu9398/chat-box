const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");

const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const socketServer = require("./socket/socket");

require("dotenv").config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

app.use("/auth",authRoutes)
app.use("/users",userRoutes)
app.use("/messages", messageRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
})


socketServer(io);

server.listen(process.env.PORT || 5000, () =>
  console.log("🚀 Server + Socket running on port", process.env.PORT || 5000)
);
