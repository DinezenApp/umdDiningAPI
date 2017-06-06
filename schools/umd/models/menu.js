let mongoose = require('mongoose');

let Menu = mongoose.Schema({
    _id: String,
    location: String,
    date: String,
    meal: String,
    menu: [{area: String,
            menu: [{
                name: String,
                recipe: String,
                tags: [String]}]
            }]
});

module.exports = Menu;