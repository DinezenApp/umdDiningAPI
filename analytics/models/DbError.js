let mongoose = require('mongoose');

let dbErrorSchema = mongoose.Schema({
    school: String,
    error: String
});

module.exports = dbErrorSchema;