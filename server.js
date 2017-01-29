var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var request = require('request');
var cheerio = require('cheerio');

mongoose.connect('mongodb://localhost/');
var menuModel = mongoose.model('Menu', {
    location_id: Number,
    date: Date,
    meal_name: String,
    menu: [String]
});

var nutritionModel = mongoose.model('Nutrition', {
    name : String,
    portion : String,
    calories : String,
    fatcalories : String,
    totalfat : String,
    carb : String,
    satfat : String,
    fiber : String,
    transfat : String,
    sugar : String,
    cholesterol : String,
    protein : String,
    sodium : String,
    calcium : String,
    ingredients : String,
    allergens : String
});
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());

var getRecipeIds = function(date, locationId, meal, callback) {
    var dateString = ('0' + date.getMonth()+1).slice(-2) + '/'
                     + ('0' + (date.getDate())).slice(-2) + '/'
                     + date.getFullYear();
    var url = 'http://nutrition.umd.edu/longmenu.aspx?locationNum='+locationId+'&dtdate='+dateString+'&mealName='+meal;
    var headers = {
        'Cookie' : 'WebInaCartLocation=04; WebInaCartDates=; WebInaCartMeals=; WebInaCartRecipes=; WebInaCartQtys='
    };
    request({url: url, headers: headers}, function (error, response, body) {
	if (!error && response.statusCode == 200) {
            var $ = cheerio.load(body);
            var ids = [];
            $('.longmenucoldispname').each(function(i, elem) {
                //console.log($(this).children('a').text());
                ids.push($(this).children('input').val());
            });
            callback(ids);
	} else {
            console.log("ERROR: " + error);
        }
    });
}

var getFullMenu = function(date, locationId, meal, callback) {
    getRecipeIds(date, locationId, meal, function(recipeIds){
        var body = 'Action=';
        for(i in recipeIds) {
            body += '&recipe='+recipeIds[i]+'&QTY=1';
        }
        var dateString = ('0' + date.getMonth()+1).slice(-2) + '/'
                         + ('0' + (date.getDate())).slice(-2) + '/'
                         + date.getFullYear();
        var url = 'http://nutrition.umd.edu/nutRpt.aspx?locationNum='+locationId+'&dtdate='+dateString+'&mealName='+meal;
        request.post({
            headers: {
                    'content-type':'application/x-www-form-urlencoded',
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'referer': 'http://nutrition.umd.edu/longmenu.aspx?sName=%3cfont+style%3d%22color%3aRed%22%3eDining+%40+Maryland%3c%2ffont%3e&locationNum=04&locationName=%3cfont+style%3d%22color%3aRed%22%3eThe+Diner%3c%2ffont%3e&naFlag=1&WeeksMenus=This+Week%27s+Menus&dtdate=01%2f28%2f2017&mealName=Lunch',
                    'accept-encoding': 'gzip, deflate',
                    'accept-language': 'en-US,en;q=0.8',
                    'cookie': 'WebInaCartLocation='+locationId+'; WebInaCartDates=; WebInaCartMeals=; WebInaCartRecipes=; WebInaCartQtys='
            },
            url: url,
            body: body
        }, function(error, response, body) {
            var $ = cheerio.load(body);
            var foods = [];
            $('.nutrptnames').each(function(i, element) {
                var name = $(this).children('a').text();
                foods.push(name);
                //var portion = $(this).parent().next().children('.nutrptportions').text();
                //var calories = $(this).parent().next().next().next().children('.nutrptvalues').text();
            });
            
            var menu = {
                location_id: locationId,
                date: date,
                meal_name: meal,
                menu: foods
            };
            callback(menu);
        });
    });
};

var getNutritionFacts = function(recipeId, callback) {
        
    var url = 'http://nutrition.umd.edu/label.aspx?RecNumAndPort='+recipeId;
    request(url, function (error, response, body) {
        var $ = cheerio.load(body);
        if($('.labelnotavailable').length != 0) {
            callback("Not available");
        } else {
            var table = $('table > tr > td > table').first().children('tr');
            var calciumsplit = table.eq(6).find('font').eq(1).text().split('\xa0');
            var fatcaloriessplit = table.eq(0).children('td').first().children('font').eq(4).text().split('\xa0'[0]);
            var facts = {
                name : $('.labelrecipe').text(),
                portion : table.eq(0).children('td').first().children('font').eq(2).text(),
                calories : table.eq(0).children('td').first().children('font').eq(3).text(),
                fatcalories : fatcaloriessplit[fatcaloriessplit.length-1],
                totalfat : table.eq(1).children('td').first().children('font').eq(1).text(),
                carb : table.eq(1).children('td').eq(2).children('font').eq(1).text(),
                satfat : table.eq(2).children('td').first().children('font').eq(1).text(),
                fiber : table.eq(2).children('td').eq(2).children('font').eq(1).text(),
                transfat : table.eq(3).children('td').first().children('font').eq(1).text(),
                sugar : table.eq(3).children('td').eq(2).children('font').eq(1).text(),
                cholesterol : table.eq(4).children('td').first().children('font').eq(1).text(),
                protein : table.eq(4).children('td').eq(2).children('font').eq(1).text(),
                sodium : table.eq(5).children('td').first().children('font').eq(1).text(),
                calcium : calciumsplit[calciumsplit.length-1],
                ingredients : $('.labelingredientsvalue').text(),
                allergens : $('.labelallergensvalue').text()
            };
            callback(facts);
        }
    });
}

app.get('/', function(req, res) {
    res.send("Welcome to the UMD Dining Service API!");
});

app.get('/get_menu.json', function(req, res) {
});

app.get('/get_nutrition.json', function(req, res) {
    req.query.locationId
});

app.get('/get_full_menu.json', function(req, res) {
});

app.listen(8080, function() {
    console.log("Server started on port 8080");
});
getNutritionFacts("126309*1", function(facts){console.log(facts)});
//getFullMenu(new Date(), "04", "Lunch", function(menu){console.log(menu)});
//getRecipeIds(new Date(), "04", "Lunch", function(ids){console.log(ids)});
