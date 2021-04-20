const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 5 },
    cash: { type: Number, default: 10000 },
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "transaction" }]
})

module.exports = User = mongoose.model("user", userSchema);