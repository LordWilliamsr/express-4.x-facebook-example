const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

var userSchema = new mongoose.Schema({
    googleId: String,
    email: String,
    name: String,
    username: String,
    provider: String,
    providerUserId: String,
    accesstoken: String,
    refreshtoken: String,
    userId: {type: ObjectId}
},{timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }});

//compile into model
var User = mongoose.model('User', userSchema);

module.exports = User;