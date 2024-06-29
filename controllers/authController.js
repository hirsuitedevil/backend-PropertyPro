const authController = require('express').Router()
const User = require('../models/User')
const bcrypt = require('bcrypt')  
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer');
const path = require('path')

// google signin
authController.post('/googlesign', async (req, res) => {
  try {
    const { email, name, picture } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await User.findByIdAndUpdate(existingUser._id, { isGoogleSignedIn: true });
      const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRET, {expiresIn: '4h' });
      return res.status(200).json({ user: existingUser, token });
    } else {
      const newUser = await User.create({ email, name, profileImg: picture, isGoogleSignedIn: true });
      const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {expiresIn: '4h' });
      return res.status(201).json({ user: newUser, token });
    }
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json(error.message);
  }
});

//register
authController.post('/register', async(req,res) => {
    try {
        const isExisting = await User.findOne({email: req.body.email})
        if(isExisting){
            throw new Error("Email already exists")
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const newUser = await User.create({...req.body, password: hashedPassword})
        const {password, ...others} = newUser._doc
        const token = jwt.sign({id: newUser._id}, process.env.JWT_SECRET, {expiresIn: '4h'})

        return res.status(201).json({others,token})
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: error.message });
    }
})

//login
authController.post('/login', async(req,res) => {
    try {
        const user = await User.findOne({email: req.body.email})
        if(!user){
            throw new Error("Wrong Credentials!!")
        }
        const comparePass = await bcrypt.compare(req.body.password, user.password)
        if(!comparePass){
            throw new Error("Wrong Credentials!!")
        }
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '4h'})
        const {password, ...others} = user._doc
        return res.status(200).json({others,token})
    } catch (error) {
        return res.status(500).json(error.message)
    }
})


// profile update
authController.put('/update', async (req, res) => {
  try {
    const { name,email, profileImg } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error('User not found');
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
      expiresIn: '4h',
    });
    return res.status(200).json({ user: userWithoutPassword, token });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


//forgot-password
authController.post('/forgot-password', async(req,res) => {
    try {
        const user = await User.findOne({email: req.body.email})
        if(!user){
            throw new Error("Email not found")
        }
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '4h'})
        
        var transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: `${USER_EMAIL}`,
            pass: `${EMAIL_PASSKEY}`
          }
        });

        var mailOptions = {
          from: `${USER_EMAIL}`,
          to: req.body.email,
          subject: "Reset Password Link",
          text: `${CLIENT_URL}/resetpassword/${user._id}/${token}`,
        };

        transporter.sendMail(mailOptions, function(error, info) {
          if (error) {
            console.log(error);
            return res.status(500).json("Error sending reset email");
          } else {
            return res.status(201).json({ token });
          }
        });
        return res.status(201).json({token})
    } catch (error) {
        return res.status(500).json(error.message)
    }
})

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
    return res.status(200).json({ others, token });
    });
  } catch (error) {
    return res.status(500).json(error.message);
  }
});

authController.get('/profileImages', async (req, res) => {
  try {
    const userId = req.query.ownerId; // Use req.query to get the query parameter
    const user = await User.findById(userId); // Use userId directly
    if (!user) {
      throw new Error('User not found');
    }
    const profileImg = user.profileImg; // Assuming user.profileImg holds the image name
    res.status(200).json({ profileImg })
  } catch (error) {
    console.error('Error retrieving profile image:', error);
    res.status(404).json({ error: 'Profile image not found' });
  }
});

authController.get('/getUserbyId/:id', async (req,res)=>{
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
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