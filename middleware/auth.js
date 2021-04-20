const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");

const auth = Object();


auth.check_auth = function (req, res, next) {
  try {
    const token = req.header("x-auth-token");
    if (!token)
      return res
        .status(401)
        .json({ error: "No authentication token, authorization denied." });

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (!verified)
      return res
        .status(401)
        .json({ error: "Token verification failed, authorization denied." });

    req.user = verified.sub;
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};



auth.login = async function (req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password must be provided" })
    }

    const user = await User.findOne({ username: username });
    if (user) {
      // console.log(user)
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ error: "Invalid credentials." });
      const token = jwt.sign({ sub: user._id, uname: username, role: user.role }, process.env.SECRET_TPASS)
      res.json({ token: token, uname: user.username, user: user._id });
    }
    else {
      return res.status(400).json({ error: "Username not registered" });
    }
  } catch (err) {
    // console.log(err.message)
    return res.status(500).json({ error: err.message });
  }
}

auth.logged_in_user = function (req, res, next) {
  try {
    const token = req.header("x-auth-token");
    if (!token)
      return res.json(false);

    const verified = jwt.verify(token, process.env.SECRET_TPASS);
    if (!verified)
      return res.json(false);
    return res.json({ id: verified.sub, uname: verified.uname });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

auth.get_logged_in_user = function (req, res) {
  try {
    const token = req.header("x-auth-token");
    if (!token)
      return null;
    const verified = jwt.verify(token, process.env.SECRET_TPASS);
    if (!verified)
      return null;
    return verified.sub;
  } catch (err) {
    // console.log(err);
    return null;
  }
};


auth.register = async function (req, res) {
  try {
    let { username, password, role } = req.body;
    // console.log(username, password)
    if (!username || !password) {
      return res.status(406).json({ error: "Username and password must be provided" })
    }

    const user = await User.findOne({ username: username });
    if (user) {
      return res.status(406).json({ error: "user already exists" });
    }
    if (!role) role = "user";
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      password: passwordHash,
      transactions: []
    });
    const savedUser = await newUser.save();
    return res.status(201).json('user added')
  }
  catch (err) {
    // console.log(err);
    res.status(500).json({ error: err.message });
  }
}


module.exports = auth;