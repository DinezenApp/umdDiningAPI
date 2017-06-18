let mongoose = require('mongoose');

let menuErrorSchema = mongoose.Schema({
    school: String,
    location: String,
    date: String,
    meal: String,
    error: String
});

module.exports = menuErrorSchema;