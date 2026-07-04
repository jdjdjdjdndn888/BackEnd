const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const routes = require("./routes/routes");
const socketHandler = require("./socket/handler");
const { startup } = require("./startup");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.set("io", io);
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  req.startTime = Date.now();
  next();
});

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use("/", routes);

socketHandler(io);

const { mongoUri, port: PORT } = require("./config.js");

if (!mongoUri) {
  console.error("MONGODB_URI environment variable is not set.");
  process.exit(1);
}

mongoose
  .connect(mongoUri, { dbName: "petflippy" })
  .then(() => {
    console.log("Connected to MongoDB");
    startup(io);
    require("./bot");
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`BloxySpin API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
