let mongoose = require('mongoose');

let factsSchema = mongoose.Schema({
    portionnum : Number,
    portionunits : String,
    calories : Number,
    fatcalories : Number,
    totalfat : Number,
    carb : Number,
    satfat : Number,
    fiber : Number,
    transfat : Number,
    sugar : Number,
    cholesterol : Number,
    protein : Number,
    sodium : Number,
    ingredients : String,
    allergens : [String]
}, {_id: false});

let nutritionSchema = mongoose.Schema({
    recipe: String,
    name: String,
    facts: factsSchema
});

nutritionSchema.index({recipe: 1});

module.exports = nutritionSchema;