const mongoose = require("mongoose");

const Feedback = new mongoose.Schema({
    name:{
        type: String,
        required: true,
    },
    feedback:{
        type:String,
        required:true,
    },
    rating:{
        type:Number,
        required: true,
    },
    profileImg:{
        type:String,
        required:true,
    }
})
module.exports = mongoose.model("Feedback", Feedback);