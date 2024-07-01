const express = require("express");
const feedbackController = express.Router();
const Feedback = require("../models/Feedback");

feedbackController.post('/send',async(req,res)=>{
    try {
        const {name, feedback, rating, profileImg} = req.body;
        await Feedback.create({name, feedback, rating, profileImg});
        return res
          .status(201)
          .json({ message: "Feedback submitted successfully" });
    } catch (error) {
         return res.status(500).json({ error: error.message });
    }
});

feedbackController.get("/get", async (req,res)=>{
    try {
        const data = await Feedback.find({ rating: { $gte: 4 } });
        return res.status(200).json(data);
    } catch (error) {
        return res.status(404).json({error:error.message});
    }
})
module.exports = feedbackController;