let express = require('express');
let app = express();
let bodyParser = require('body-parser');
let mongoose = require('mongoose');
let schools = require('./schools');

app.set('port', process.env.PORT || 3000);

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
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());

function getMenu(school, date, location, meal, callback) {
        schools[school].db.Menu.findOne({_id: getMenuId(date, meal, location)}, "menu", function(err, menu){
        let ret;
        if(menu == null){
            schools[school].scraper.scrapeMenu(date, location, meal, function(res) {
                let entry = new schools[school].db.Menu({_id: getMenuId(date, location, meal), location: location, date: date, meal: meal, menu: res});
                entry.save(new function(err) {
                    if(err) {
                        console.log(err);
                    }else {
                        console.log("Menu for " + meal + " on " + date + " at " + location + " saved");
                    }
                });
                callback(res);
            });
        } else {
            callback(menu['menu']);
        }
    });};

function getNutritionFacts(school, recipeId, callback) {
    schools[school].db.Nutrition.findOne({_id: recipeId}, function(err, facts){
        if(facts == null){
            schools[school].scraper.scrapeNutritionFacts(recipeId, function(res) {
                if(res == null) {
                    callback(null);
                } else {
                    let entry = new schools[school].db.Nutrition(res);
                    entry._id = recipeId;
                    entry.save(new function(err) {
                        if(err) {
                            console.log(err);
                        }else {
                            console.log("Nutrition facts for " + res['name'] + "(" + recipeId + ")" + " saved");
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

function getMenuId(date, meal, location) {
    return date+"|"+meal+"|"+location;
}

app.get('/', function(req, res) {
    res.send("Welcome to the UMD Dining Service API!");
});

app.get('/get_menu.json', function(req, res) {
    let location = req.query.location;
    let date = req.query.date;
    let meal = req.query.meal;
    if(location == null || date == undefined || meal == undefined) {
        res.send("Invalid Parameters");
    }
    console.log("Menu for " +meal + " on " + date + " at " + location + " requested");
    getMenu('umd', date, location, meal, function(data) {
        res.json(data);
    });
});

app.get('/get_nutrition.json', function(req, res) {
    let recipeId = req.query.recipe;
    if(recipeId == null) {
        res.send("Invalid Parameters");
    }
    console.log("Nutrition info for " + recipeId + " requested");
    getNutritionFacts('umd', recipeId, function(data) {
        res.json(data);
    });
});

app.get('/get_full_menu.json', function(req, res) {
    let location = req.query.location;
    let date = req.query.date;
    let meal = req.query.meal;
    if(location == null || date == undefined || meal == undefined) {
        res.send("Invalid Parameters");
        return;
    }
    console.log("Full menu for " +meal + " on " + date + " at " + location + " requested");
    getMenu('umd', date, location, meal, (menu) => {
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
                getNutritionFacts('umd', menuItem.recipe, (data) => {
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
    schools['umd'].db.Nutrition.find({}, "name recipe", function(err, items){
        res.json(items);
    });
});

app.listen(app.get('port'), () => {
  console.log('App is running at http://localhost:%d in %s mode', app.get('port'), app.get('env'));
  console.log('  Press CTRL-C to stop\n');
});
