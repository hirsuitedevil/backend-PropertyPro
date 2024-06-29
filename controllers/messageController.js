const messageController = require('express').Router();
const verifyToken = require('../middlewares/verifyToken');
const Conversations = require('../models/Conversations');
const message = require('../models/Messages');
const {getReceiverSocketId, io} = require("../socket/socket")
messageController.post('/send/:id',verifyToken,async (req,res) =>{
    try {
        const receiverId = req.params.id;
        const senderId = req.user.id;
        const content = req.body.content;
        let conversation = await Conversations.findOne({
            participants:{$all: [receiverId,senderId]},
        })
        if(!conversation){
            conversation = await Conversations.create({
                participants:[receiverId, senderId],
            })
        }
        const newMessage =await message.create({
            senderId,
            receiverId,
            content,
        });
        conversation.messages.push(newMessage._id);
        await Promise.all([conversation.save()],newMessage.save());
        
        const receiverSocketId = getReceiverSocketId(receiverId);
        const senderSocketId = getReceiverSocketId(senderId);
        if (receiverSocketId && senderSocketId) {
          io.to(receiverSocketId).emit("newMessage", newMessage);
          io.to(senderSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json({Message: "Message sent successfully"});
    } catch (error) {
        return res.status(500).json(error.message);
    }
});

messageController.get('/:id',verifyToken,async(req,res)=>{
    try {
        const receiverId = req.params.id;
        const senderId = req.user.id;
        const conversation = await Conversations.findOne({
          participants: { $all: [senderId, receiverId] },
        }).populate("messages");
        res.status(200).json(conversation);
    } catch (error) {
        return res.status(500).json(error.message);
    }
});

messageController.get("/getMsgById/:id", verifyToken, async (req, res) => {
  try {
    const msgId = req.params.id;
    const msg = await message.findById(msgId);
    if (!msg) {
      throw new Error("Message not Found!");
    }
    res.status(200).json(msg);
  } catch (error) {
    return res.status(500).json(error.message);
  }
});

module.exports = messageController;