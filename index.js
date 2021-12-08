const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const saltRounds = Number(process.env.SALT_ROUNDS);
const morgan = require('morgan');
const app = express();
const User = require('./models/user');
const Post = require('./models/post');
const auth = require('./middleware/auth');

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
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);
        data.password = hashedPassword;
        const user = await new User({ ...data }).save();
        const token = jwt.sign({ userId: user._id }, jwtSecretKey, { expiresIn: '1h' });
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
        const isValidPassword = bcrypt.compare(data.password, user.password);
        if (!user || !isValidPassword) return res.status(400).json({ message: "Invalid Email Or Password" });
        const token = jwt.sign({ userId: user._id }, jwtSecretKey, { expiresIn: '1h' });
        user.password = null;
        return res.status(201).json({ message: "User Logged In Successfully!", token, user });
    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.post('/post', auth(), async (req, res) => {
    const data = req.body;
    data.userId = req.USER_ID;

    try {
        const post = await new Post({ ...data }).save();
        return res.status(201).json({ message: "Post Created Successfully!", post });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.get('/post', auth(), async (req, res) => {
    try {
        const posts = await Post.find().populate("userId", "email fullName");
        return res.status(201).json({ message: "All Posts: ", posts });
        
    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.get('/post/:postId', auth(), async (req, res) => {
    const postId = req.params.postId;
    const userId = req.USER_ID;

    try {
        const post = await Post.findOne({ _id: postId, userId: userId }).populate("userId", "email fullName");
        if (!post) return res.status(400).json({ message: "Invalid Post ID or User ID" });
        return res.status(201).json({ message: "Here's Your Post: ", post });
        
    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.patch('/post/:postId', auth(), async (req, res) => {
    const data = req.body;
    const postId = req.params.postId;
    const userId = req.USER_ID;

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

app.delete('/post/:postId', auth(), async (req, res) => {
    const postId = req.params.postId;
    const userId = req.USER_ID;

    try {
        const post = await Post.findOne({ _id: postId, userId: userId });
        if (!post) return res.status(400).json({ message: "Invalid Post ID or User ID" });
        const deletedPost = await Post.findByIdAndDelete(postId);
        return res.status(201).json({ message: "Post Deleted Successfully!", deletedPost });
        
    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.get('/user', auth(), async (req, res) => {
    const userId = req.USER_ID;

    try {
        const user = await User.findById(userId);
        user.password = null;
        if (!user) return res.status(400).json({ message: "Invalid User ID" });
        return res.status(201).json({ message: "Here is your profile information", user });

    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.patch('/user', auth(), async (req, res) => {
    const data = req.body;
    const userId = req.USER_ID;

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

app.delete('/user', auth(), async (req, res) => {
    const userId = req.USER_ID;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(400).json({ message: "Invalid User ID" });
        const deletedUser = await User.findByIdAndDelete(userId);
        return res.status(201).json({ message: "User Deleted Successfully!", deletedUser });
        
    } catch (error) {
        return res.status(500).json({ message: "Some Error Occured. Please Try Again Later!" });
    }
});

app.use('**', (req, res)=> {
    return res.status(400).json({ message: 'Page Not Found!'});
});

app.use((error, req, res, next)=> {
    console.log(error);
    return res.status(500).json({ message: 'Some Error Occured. Please Try Again Later!' });
});

app.listen(port, async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log("Database Connection Successful!");
    } catch (error) {
        console.error(error);
    }
    console.log(`Server is live at port ${port}`);
});