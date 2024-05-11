const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
        return res.status(401).json({ msg: "Unauthorized. No or invalid token provided." });
    }
    const token = authorizationHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, data) => {
        if (err) {
            handleTokenError(err, res);
        } else {
            req.user = data;
            next();
        }
    });
};

const handleTokenError = (err, res) => {
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ msg: 'Token expired' });
    } else {
        return res.status(401).json({ msg: 'Invalid token' });
    }
};

module.exports = verifyToken;
