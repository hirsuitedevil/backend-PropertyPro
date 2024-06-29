const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiverId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required: true
    },
    content:{
        type: String,
        required:true
    },
},{timestamps:true})

module.exports = mongoose.model("Messages",MessageSchema) 