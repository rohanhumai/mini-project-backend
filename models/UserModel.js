const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    verifyOtp: {type: String, default: ''},
    verifyOtpExpiresAt: {type: Date, default: null},
    isAccountVerified: {type: Boolean, default: false},
    resetOtp: {type: String, default: false},
    resetOtpExpiresAt: {type: Number, default: 0},
})

const UserModel = mongoose.model.user || mongoose.model('user', userSchema);

module.exports = UserModel;