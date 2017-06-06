let mongoose = require('mongoose');

let Nutrition = mongoose.Schema({
    _id: String,
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

module.exports = Nutrition;