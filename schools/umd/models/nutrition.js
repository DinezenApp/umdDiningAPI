let mongoose = require('mongoose');

let nutritionSchema = mongoose.Schema({
    recipe: String,
    name : String,
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
});

nutritionSchema.index({recipe: 1});

module.exports = nutritionSchema;