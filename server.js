let express = require('express');
let app = express();
let bodyParser = require('body-parser');
let mongoose = require('mongoose');
let request = require('request');
let cheerio = require('cheerio');

app.set('port', process.env.PORT || 3000);

/**
 * Connect to MongoDB.
 */
mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI || 'mongodb://localhost');
mongoose.connection.on('error', () => {
  console.log('MongoDB connection error. Please make sure MongoDB is running on ' + process.env.MONGODB_URI || process.env.MONGOLAB_URI + '.');
  process.exit();
});

function allowCrossDomain(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
};
app.use(allowCrossDomain);

let Menu = mongoose.model('Menu', {
    location_id: String,
    date: String,
    meal_name: String,
    menu: [{area: String,
            menu: [{
                name: String,
                recipe: String,
                tags: [String]}]
            }]
});

let Nutrition = mongoose.model('Nutrition', {
    name : String,
    recipe: String,
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

function scrapeMenu(date, locationId, meal, callback) {
    let url = 'http://nutrition.umd.edu/longmenu.aspx?locationNum='+locationId+'&dtdate='+date+'&mealName='+meal;
    let headers = {
        'Cookie' : 'WebInaCartLocation=04; WebInaCartDates=; WebInaCartMeals=; WebInaCartRecipes=; WebInaCartQtys='
    };
    request({url: url, headers: headers}, function (error, response, body) {
	if (!error && response.statusCode == 200) {
            let $ = cheerio.load(body);
            let menu = [];
            let area = undefined;
            $('.longmenugridheader').first().parent().siblings('tr').each(function(i, element) {
                if($(this).find('.longmenucolmenucat').length != 0) {
                    if(area != undefined) {
                        menu.push(area);
                    }
                    let cat = $(this).find('.longmenucolmenucat').first();
                    let pattern = /-- (.+) --/;
                    let text = cat.text();
                    if(pattern.test(text)) {
                        text = (pattern.exec(text))[1];
                    }
                    area = {area: text, menu: []}
                } else if($(this).find('.longmenucoldispname').length != 0) {
                    let disp = $(this).find('.longmenucoldispname').first();
                    let tags = disp.parent().siblings('td').map(function(i, ele) {
                        let img = $(this).children().first().attr('src');
                        let regexp = /\w+_([A-Za-z]*)\.gif/;
                        return (regexp.exec(img)[1]);
                    });
                    item = {name: disp.children('a').text(), recipe: disp.children('input').val(), tags: tags.toArray()};
                    area.menu.push(item);
                }
            });
            callback(menu);
	} else {
            console.log("ERROR: " + error);
            callback("ERROR");
        }
    });
};

function getMenu(date, locationId, meal, callback) {
    Menu.findOne({date: date, location_id: locationId, meal_name: meal}, "menu", function(err, menu){
        let ret;
        if(menu == null){
            scrapeMenu(date, locationId, meal, function(res) {
                let entry = new Menu({location_id: locationId, date: date, meal_name: meal, menu: res});
                entry.save(new function(err) {
                    if(err) {
                        console.log(err);
                    }else {
                        console.log("Menu for " + meal + " on " + date + " at " + locationId + " saved");
                    }
                });
                callback(res);
            });
        } else {
            callback(menu['menu']);
        }
    });
};

function getNutritionFacts(recipeId, callback) {
    Nutrition.findOne({recipe: recipeId}, function(err, facts){
        if(facts == null){
            scrapeNutritionFacts(recipeId, function(res) {
                if(res == null) {
                    callback(null);
                } else {
                    let entry = new Nutrition(res);
                    entry.save(new function(err) {
                        if(err) {
                            console.log(err);
                        }else {
                            console.log("Nutrition facts for " + res['name'] + " saved");
                        }
                    });
                    callback(res);
                }
            });
        } else {
            callback(facts);
        }
    });
};

function scrapeNutritionFacts(recipeId, callback) {
    let url = 'http://nutrition.umd.edu/label.aspx?RecNumAndPort='+recipeId;
    request(url, function (error, response, body) {
        let $ = cheerio.load(body);
        if($('.labelnotavailable').length != 0) {
            callback(null);
        } else {
            let table = $('table > tr > td > table').first().children('tr');
            let calciumsplit = table.eq(6).find('font').eq(1).text().split('\xa0');
            let caloriessplit = table.eq(0).children('td').first().children('font').eq(3).text().split('\xa0');
            let fatcaloriessplit = table.eq(0).children('td').first().children('font').eq(4).text().split('\xa0');
            let facts = {
                name : $('.labelrecipe').text(),
                recipe: recipeId,
                portion : table.eq(0).children('td').first().children('font').eq(2).text(),
                calories : caloriessplit[caloriessplit.length-1],
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
};

app.get('/', function(req, res) {
    res.send("Welcome to the UMD Dining Service API!");
});

app.get('/get_menu.json', function(req, res) {
    let locationId = req.query.location_id;
    let date = req.query.date;
    let meal = req.query.meal_name;
    if(locationId == null || date == undefined || meal == undefined) {
        res.send("Invalid Parameters");
    }
    console.log("Menu for " +meal + " on " + date + " at " + locationId + " requested");
    getMenu(date, locationId, meal, function(data) {
        res.json(data);
    });
});

app.get('/get_nutrition.json', function(req, res) {
    let recipeId = req.query.recipe;
    if(recipeId == null) {
        res.send("Invalid Parameters");
    }
    console.log("Nutrition info for " + recipeId + " requested");
    getNutritionFacts(recipeId, function(data) {
        res.json(data);
    });
});

app.get('/get_full_menu.json', function(req, res) {
    let locationId = req.query.location_id;
    let date = req.query.date;
    let meal = req.query.meal_name;
    if(locationId == null || date == undefined || meal == undefined) {
        res.send("Invalid Parameters");
    }
    console.log("Full menu for " +meal + " on " + date + " at " + locationId + " requested");
    getMenu(date, locationId, meal, (menu) => {
        if(menu.length == 0) {
            res.json([]);
            return;
        }
        let numProcessed = 0;
        let total = 0;
        for(let a = 0; a < menu.length; a++) {
            total += menu[a].menu.length;
        }
        let full = [];
        menu.forEach((area) => {
            let areaJson= {area: area.area, menu: []}
            full.push(areaJson);
            area.menu.forEach((menuItem) => {
                getNutritionFacts(menuItem.recipe, (data) => {
                    areaJson.menu.push({name: menuItem.name, recipe: menuItem.recipe, tags: menuItem.tags, nutrition: data});
                    numProcessed++;
                    if(numProcessed == total) {
                        res.json(full);
                    }
                });
            });
        });
    });
});

app.get('/get_all_items.json', function(req, res) {
    Nutrition.find({}, "name recipe", function(err, items){
        res.json(items);
    });
});
app.listen(app.get('port'), () => {
  console.log('App is running at http://localhost:%d in %s mode', app.get('port'), app.get('env')); 
  console.log('  Press CTRL-C to stop\n');
});
