let mongoose = require('mongoose');

let areaMenuSchema = mongoose.Schema({
    name: String,
    recipe: String,
    tags: [String]
}, {_id: false});

let areaSchema = mongoose.Schema({
    area: String,
    menu: [areaMenuSchema]
}, {_id: false});

let menuSchema = mongoose.Schema({
    id: String,
    location: String,
    date: String,
    meal: String,
    menu: [areaSchema]
}, {_id: false});

menuSchema.index({id: 1});

module.exports = menuSchema;