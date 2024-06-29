const {Server} = require('socket.io');
const {createServer} = require('http');
const express = require('express');

const app = express();
const server = createServer(app);
const io = new Server(server,{
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"]
    },
    transports: ['websocket']
});

const getReceiverSocketId = (receiverId) =>{
  return userSocketMap[receiverId];
}
const userSocketMap = {};

io.on('connection', (socket) => {
  console.log("user logged in: ", socket.id);
  const userId = socket.handshake.query.id;
  if(userId!= "undefined"){
    userSocketMap[userId] = socket.id;
  }
  socket.on('disconnect',()=>{
    console.log("user disconnected: ", socket.id);
    delete userSocketMap[userId];
  })
});


module.exports = {app, io, server, getReceiverSocketId};