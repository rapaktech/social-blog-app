const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const app = express();
const User = require('./models/user');
const Post = require('./models/post');

require('dotenv').config();
const port = process.env.PORT;
const mongoURI = process.env.MONGO_URI;
const jwtSecretKey = process.env.JWT_SECRET_KEY;

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.get('/', async (req, res) => {
    return res.status(200).json({ message: "Welcome to the Social Blog App!" });
});

app.post('/auth/signup', async (req, res) => {
    const data = req.body;

    try {
        const user = await new User({ ...data }).save();
        const token = jwt.sign({ userId: user._id }, jwtSecretKey, { expiresIn: 600 });
        user.password = null;
        return res.status(201).json({ message: "User Created Successfully!", token, user });
    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.post('/auth/signin', async (req, res) => {
    const data = req.body;

    try {
        const user = await User.findOne({ email: data.email });
        if (!user || user.password != data.password) return res.status(400).json({ message: "Invalid Email Or Password" });
        const token = jwt.sign({ userId: user._id }, jwtSecretKey, { expiresIn: 600 });
        user.password = null;
        return res.status(201).json({ message: "User Logged In Successfully!", token, user });
    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.post('/post', async (req, res) => {
    const data = req.body;

    try {
        const post = await new Post({ ...data }).save();
        return res.status(201).json({ message: "Post Created Successfully!", post });
    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.get('/post', async (req, res) => {
    try {
        const posts = await Post.find().populate("userId", "email fullName");
        return res.status(201).json({ message: "All Posts: ", posts });
        
    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.get('/post/:userId/:postId', async (req, res) => {
    const postId = req.params.postId;
    const userId = req.params.userId;

    try {
        const post = await Post.findOne({ _id: postId, userId: userId }).populate("userId", "email fullName");
        if (!post) return res.status(400).json({ message: "Invalid Post ID or User ID" });
        return res.status(201).json({ message: "Here's Your Post: ", post });
        
    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.patch('/post/:userId/:postId', async (req, res) => {
    const data = req.body;
    const postId = req.params.postId;
    const userId = req.params.userId;

    try {
        const post = await Post.findOne({ _id: postId, userId: userId });
        if (!post) return res.status(400).json({ message: "Invalid Post ID or User ID" });

        const title = data.title || post.title;
        const body = data.body || post.body;

        const updatedPost = await Post.findByIdAndUpdate(
            postId,
            {
                $set: {
                    title: title,
                    body: body
                }
            },
            {
                new: true
            }
        );

        return res.status(201).json({ message: "Post Updated Successfully!", updatedPost });
    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.delete('/post/:userId/:postId', async (req, res) => {
    const postId = req.params.postId;
    const userId = req.params.userId;

    try {
        const post = await Post.findOne({ _id: postId, userId: userId });
        if (!post) return res.status(400).json({ message: "Invalid Post ID or User ID" });
        const deletedPost = await Post.findByIdAndDelete(postId);
        return res.status(201).json({ message: "Post Deleted Successfully!", deletedPost });
        
    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.get('/user/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        const user = await User.findById(userId);
        user.password = null;
        if (!user) return res.status(400).json({ message: "Invalid User ID" });
        return res.status(201).json({ message: "Here is your profile information", user });

    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.patch('/user/:userId', async (req, res) => {
    const data = req.body;
    const userId = req.params.userId;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(400).json({ message: "Invalid User ID" });

        const fullName = data.fullName || user.fullName;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    fullName: fullName,
                }
            },
            {
                new: true
            }
        );

        return res.status(201).json({ message: "User Updated Successfully!", updatedUser });
    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.delete('/user/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(400).json({ message: "Invalid User ID" });
        const deletedUser = await User.findByIdAndDelete(userId);
        return res.status(201).json({ message: "User Deleted Successfully!", deletedUser });
        
    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});


app.listen(port, async () => {
    try {
        await mongoose.connect(mongoURI).then(console.log("Database Connection Successful!")).catch(console.log('Database Connection failed!'));
    } catch (error) {
        console.error(error);
    }
    console.log(`Server is live at port ${port}`);
});