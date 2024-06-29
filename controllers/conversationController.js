const verifyToken = require('../middlewares/verifyToken');
const Conversations = require('../models/Conversations');
const conversationController = require("express").Router();

conversationController.get('/all',verifyToken,async (req,res)=>{
    try {
        const senderId = req.user.id;
        const filteredConversations = await Conversations.find({
            participants: {$all: [senderId]}
        });
        res.status(201).json(filteredConversations);
    } catch (error) {
        res.status(500).json(error.message);
    }
});

conversationController.get('/getConvByUsers/:id', verifyToken, async(req,res)=>{
    try {
        const senderId = req.user.id;
        const receiverId = req.params.id;
        const conversation = await Conversations.findOne({
            participants:{$all:[senderId,receiverId]}
        });
        res.status(201).json(conversation);
    } catch (error) {
        res.status(500).json(error.message);
    }
})

module.exports = conversationController;