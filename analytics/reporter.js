let mongoose = require('mongoose');
let nutritionError = require('./models/nutritionError');
let menuError = require('./models/menuError');
let dbError = require('./models/dbError');

let mongoURI = process.env.MONGODB_URI || process.env.MONGOLAB_URI || 'mongodb://localhost/';
let connection = mongoose.createConnection(mongoURI+"errors");
let NutritionError = connection.model('NutritionError', nutritionError);
let MenuError = connection.model('MenuError', menuError);
let DbError = connection.model('DbError', dbError);


function reportNutritionError(school, recipe, err) {
    console.log("Nutrition information error (School: " + school + ", recipe: " + recipe + " error: " + err + ")");
    let error = new NutritionError({school: school, recipe: recipe, error: err});
    error.save(function(err) {
        if(err) {
            console.log("Error saving nutrition info error!");
        }
    });
}

function reportMenuError(school, date, meal, location, err) {
    console.log("Menu error (School: " + school + ", date: " + date + " meal: " + meal + ", location: " + location + ", error: " + err + ")");
    let error = new MenuError({school: school, date: date, meal: meal, location: location, error: err});
    error.save(function(err) {
        if(err) {
            console.log("Error saving menu info error!");
        }
    });
}

function reportDbError(school, err) {
    console.log("Database error (School: " + school + ", error: " + err + ")");
    let error = new DbError({school: school, error: err});
    error.save(function(err) {
        if(err) {
            console.log("Error saving database error!");
        }
    });
}

module.exports = {
    reportNutritionError: reportNutritionError,
    reportMenuError: reportMenuError,
    reportDbError: reportDbError
}