const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const upload = multer({ dest: "uploads/" });

let messages = [];

function addMessage(msg) {
  messages.push(msg);
  if (messages.length > 50) {
    const removed = messages.shift();

    if (removed.file && fs.existsSync(removed.file)) {
      fs.unlinkSync(removed.file);
    }
  }
}

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({
    url: "/uploads/" + req.file.filename,
    type: req.file.mimetype
  });
});

io.on("connection", (socket) => {
  socket.emit("loadMessages", messages);

  socket.on("message", (data) => {
    addMessage(data);
    io.emit("message", data);
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
