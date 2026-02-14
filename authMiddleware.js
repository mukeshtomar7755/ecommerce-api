const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {

    if (process.env.BYPASS_AUTH === "true") {
        req.userId = "dev-user";
        req.userRole = "SuperAdmin"; // ya SuperAdmin
        return next();
    }

    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(401).json({ message: "Token missing" });
    }

    const token = authHeader.split(" ")[1]; // Bearer TOKEN

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    });
};
