const mongoose = require('mongoose')

const transSchema = new mongoose.Schema({
    stockid: { type: String, required: true },
    stockname: { type: String },
    price: { type: Number, required: true, min: 0 },
    type: { type: String, required: true, enum: ['b', 's'] },
    qty: { type: Number, required: true, min: 1 },
    ttime: { type: Date, default: Date.now }
})

module.exports = Transaction = mongoose.model("transaction", transSchema);