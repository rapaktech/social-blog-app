require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('./../models/user');
const jwtSecretKey = process.env.JWT_SECRET_KEY;

module.exports = () => {
    return async (req, res, next) => {
        try {
            const token = req.headers.authorization;
            if (!token) return res.status(400).json({ message: "Token Missing. Please Sign In Again To Access This Page. "});

            let id;

            jwt.verify(token, jwtSecretKey, function (err, decodedToken) {
                if (err && err.name == 'TokenExpiredError') return res.status(400)
                .json({ message: "Token Expired. Please Sign In Again To Access This Page. "});
                if (err && err.name == 'JsonWebTokenError') throw err;

                id = decodedToken.userId
            });

            User.findById(id, (err, foundUser) => {
                if (err) throw err;
                if (!foundUser) return res.status(400).json({ message: "Unauthorized!"});
                id = foundUser._id;
            });

            req.USER_ID = id;

            next();
        } catch (error) {
            next(error);
        }
    }
}