let mongoose = require('mongoose');
let nutritionSchema = require('./models/nutrition');
let menuSchema = require('./models/menu');

let mongoURI = process.env.MONGODB_URI || process.env.MONGOLAB_URI || 'mongodb://localhost/';
let connection = mongoose.createConnection(mongoURI+'umd');
connection.on('error', () => {
  console.log('MongoDB connection error. Please make sure MongoDB \"umd\" is running on ' + process.env.MONGODB_URI || process.env.MONGOLAB_URI + '.');
  process.exit();
});

module.exports = {
    Nutrition: connection.model("Nutrition", nutritionSchema),
    Menu: connection.model("Menu", menuSchema)
};