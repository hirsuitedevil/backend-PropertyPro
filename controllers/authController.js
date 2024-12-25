const authController = require('express').Router()
const User = require('../models/User')
const bcrypt = require('bcrypt')  
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer');
const path = require('path');
const {cacheFetch, cacheSet} = require('../redis/redis');
require("dotenv").config();

// google signin
authController.post("/googlesign", async (req, res) => {
  try {
    const { email, name, picture } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await User.findByIdAndUpdate(existingUser._id, {
        isGoogleSignedIn: true,
      });
      const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRET, {
        expiresIn: "4h",
      });
      return res.status(200).json({ user: existingUser, token });
    } else {
      const newUser = await User.create({
        email,
        name,
        profileImg: picture,
        isGoogleSignedIn: true,
      });
      const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
        expiresIn: "4h",
      });
      return res.status(201).json({ user: newUser, token });
    }
  } catch (error) {
    console.error("Error in Google sign-in:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

//register
authController.post("/register", async (req, res) => {
  try {
    const isExisting = await User.findOne({ email: req.body.email });

    if (isExisting) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    if (!req.body.email || !req.body.password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const newUser = await User.create({
      ...req.body,
      password: hashedPassword,
    });

    const { password, ...userResponse } = newUser._doc;

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "4h",
    });
    await cacheSet(`user:${req.body.email}:${newUser._id}`, newUser, 3600);
    return res.status(201).json({
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid user data",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    if (error.code === 11000) {
      return res.status(409).json({
        message: "User with this email already exists",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

//login
authController.post("/login", async (req, res) => {
  try {
    const email = req.body.email;
    const pattern = `user:${email}:*`;
    const cachedData = await cacheFetch(pattern);
    let user;
    if (cachedData) {
      user = cachedData;
      await cacheSet(pattern, user, 3600);
    } else {
      user = await User.findOne({ email: req.body.email });
      if (!user) {
        return res.status(404).json({ message: "Email not registered" });
      }
      const keyPattern = `user:${user.email}:${user._id}`;
      await cacheSet(keyPattern, user, 3600);
    }
    const comparePass = await bcrypt.compare(req.body.password, user.password);
    if (!comparePass) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "4h",
    });
    const { password, ...others } = user;
    return res.status(200).json({ others, token });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

// profile update
authController.put("/update", async (req, res) => {
  try {
    const { name, email, profileImg } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (name) {
      user.name = name;
    }
    if (profileImg) {
      user.profileImg = profileImg;
    }

    const updatedUser = await user.save();
    const { password, ...userWithoutPassword } = updatedUser.toObject();

    const token = jwt.sign({ id: updatedUser._id }, process.env.JWT_SECRET, {
      expiresIn: "4h",
    });
    await cacheSet(`user:${updatedUser.email}:${updatedUser._id}`,updatedUser,3600);
    return res.status(200).json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error("Profile update error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

//forgot-password
authController.post("/forgot-password", async (req, res) => {
  try {
    const email = req.body.email;
    const pattern = `user:${email}:*`;
    const cachedData = await cacheFetch(pattern);
    let user;
    if (cachedData) {
      user = cachedData;
    } else {
      user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "Email not found" });
      }
      await cacheSet(`user:${user.email}:${user._id}`, user, 3600);
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "4h",
    });

    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: `${USER_EMAIL}`,
        pass: `${EMAIL_PASSKEY}`,
      },
    });

    var mailOptions = {
      from: `${USER_EMAIL}`,
      to: req.body.email,
      subject: "Reset Password Link",
      text: `${CLIENT_URL}/resetpassword/${user._id}/${token}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error("Error sending reset email:", error);
        return res
          .status(500)
          .json({ message: "Error sending reset email", error: error.message });
      } else {
        console.log("Email sent:", info.response);
        return res.status(200).json({ token });
      }
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

// reset Password
authController.post('/reset-password/:id/:token', async (req, res) => {
  try {
    const {id,token} = req.params
    const {newPassword} = req.body
    const user = await User.findById(id);
    if(!user){
      throw new Error("Email not found")
    }
    jwt.verify(token, process.env.JWT_SECRET, async (err, data) => {
        if (err) {
            throw new Error("Invalid or expired token");
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashedPassword;
        const updatedUser = await user.save();
        const token = jwt.sign({ id: updatedUser._id }, process.env.JWT_SECRET, {expiresIn: '4h'});

    // Return the updated user data and token
    const { password, ...others } = updatedUser._doc;
    cacheSet(`user:${req.body.email}:${updatedUser._id}`,updatedUser,3600);
    return res.status(200).json({ others, token });
    });
  } catch (error) {
    return res.status(500).json(error.message);
  }
});

authController.get('/profileImages', async (req, res) => {
  try {
    const userId = req.query.ownerId;
    const pattern = `user:*:${userId}`;
    const cachedData = await cacheFetch(pattern);
    let user;
    if(cachedData){
      user = cachedData;
    }else{
      user = await User.findById(userId);
      await cacheSet(`user:${user.email}:${userId}`,user,3600);
    }

    if (!user) {
      throw new Error('User not found');
    }
    const profileImg = user.profileImg;
    res.status(200).json({ profileImg })
  } catch (error) {
    console.error('Error retrieving profile image:', error);
    res.status(404).json({ error: 'Profile image not found' });
  }
});

authController.get('/getUserbyId/:id', async (req,res)=>{
  try {
    const userId = req.params.id;
    
    const pattern = `user:*:${userId}`;
    const cachedData = await cacheFetch(pattern);
    let user;
    if (cachedData) {
      user = cachedData;
    } else {
      user = await User.findById(userId);
      await cacheSet(`user:${user.email}:${userId}`, user, 3600);
    }
    if(!user){
      throw new Error('User not Found!');
    }
    res.status(200).json({user});
  } catch (error) {
    console.error("Error retrieving user: ", error);
    res.status(404).json({ error: "User not found" });
  }
});
module.exports = authController;