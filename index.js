const express = require('express')
const mongoose = require("mongoose")
const dotenv = require('dotenv')
const cors= require('cors')
const authController = require('./controllers/authController')
const propertyController = require('./controllers/propertyController')
const {app, server} = require('./socket/socket');
const bodyParser = require('body-parser');
const path = require('path');
const conversationController = require("./controllers/conversationController")
const messageController = require("./controllers/messageController");
const feedbackController = require('./controllers/feedbackController')
dotenv.config();
// routes and middlewares
mongoose.set('strictQuery', false)
mongoose.connect(process.env.MONGO_URL, ()=> console.log('MONGODB has been started'))

// middlewares
app.use(
  cors()
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/auth", authController);
app.use("/property", propertyController);
app.use("/messages",messageController);
app.use("/conversations",conversationController);
app.use("/feedback", feedbackController);
//starting server

//npm run start
server.listen(process.env.PORT, ()=> console.log('Server has been started '))