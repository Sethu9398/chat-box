// middleware/attachIO.js
module.exports = (req, res, next) => {
  req.io = req.app.get("io");
  next();
};
