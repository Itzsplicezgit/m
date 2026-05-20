const express=require("express");
const http=require("http");
const { Server }=require("socket.io");
const multer=require("multer");
const fs=require("fs");
const jwt=require("jsonwebtoken");

const app=express();
const server=http.createServer(app);
const io=new Server(server);

const SECRET="secretkey";

app.use(express.json({limit:"10mb"}));
app.use(express.static("public"));
app.use("/uploads",express.static("uploads"));

const upload=multer({dest:"uploads/"});

let messages=[];
let users=[];

function addMessage(msg){
  messages.push(msg);
  if(messages.length>50){
    messages.shift();
  }
}

app.post("/api/signup",(req,res)=>{
  const {username,password,profilePic}=req.body;

  if(!username||!password||!profilePic){
    return res.status(400).json({error:"Missing fields"});
  }

  const exists=users.find(u=>u.username===username);
  if(exists){
    return res.status(400).json({error:"User exists"});
  }

  users.push({username,password,profilePic});

  const token=jwt.sign({username},SECRET);

  res.json({token});
});

app.post("/api/login",(req,res)=>{
  const {username,password}=req.body;

  const user=users.find(u=>u.username===username&&u.password===password);

  if(!user){
    return res.status(401).json({error:"Invalid login"});
  }

  const token=jwt.sign({username},SECRET);

  res.json({token});
});

function auth(req,res,next){
  const header=req.headers.authorization;

  if(!header) return res.sendStatus(401);

  try{
    const token=header.split(" ")[1];
    const decoded=jwt.verify(token,SECRET);
    req.user=decoded;
    next();
  }catch{
    res.sendStatus(401);
  }
}

app.get("/api/me",auth,(req,res)=>{
  const user=users.find(u=>u.username===req.user.username);
  if(!user) return res.sendStatus(404);

  res.json({
    username:user.username,
    profilePic:user.profilePic
  });
});

app.post("/api/update-pfp",auth,(req,res)=>{
  const {profilePic}=req.body;

  const user=users.find(u=>u.username===req.user.username);

  if(!user) return res.sendStatus(404);

  user.profilePic=profilePic;

  res.json({ok:true});
});

app.post("/upload",upload.single("file"),(req,res)=>{
  res.json({
    url:"/uploads/"+req.file.filename,
    type:req.file.mimetype
  });
});

io.on("connection",(socket)=>{
  socket.emit("loadMessages",messages);

  socket.on("message",(data)=>{
    addMessage(data);
    io.emit("message",data);
  });
});

server.listen(3000,()=>{
  console.log("Server running on port 3000");
});
