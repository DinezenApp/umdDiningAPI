let mongoose = require('mongoose');

let nutritionErrorSchema = mongoose.Schema({
    school: String,
    recipe: String,
    error: String
});

module.exports = nutritionErrorSchema;