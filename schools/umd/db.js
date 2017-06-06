let mongoose = require('mongoose');
let nutrition = require('./models/nutrition');
let menu = require('./models/menu');

let mongoURI = process.env.MONGODB_URI || process.env.MONGOLAB_URI || 'mongodb://localhost/';
let connection = mongoose.createConnection(mongoURI+'umd');
connection.on('error', () => {
  console.log('MongoDB connection error. Please make sure MongoDB \"umd\" is running on ' + process.env.MONGODB_URI || process.env.MONGOLAB_URI + '.');
  process.exit();
});

module.exports = {
    Nutrition: connection.model("Nutrition", nutrition),
    Menu: connection.model("Menu", menu)
};