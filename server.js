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
}
app.use(allowCrossDomain);
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());

function getMenu(school, date, location, meal, callback) {
    schools[school].db.Menu.findOne({id: getMenuId(date, meal, location)}, function(err, menu){
        if(err) {
            console.log(err);
            res.send(err);
            return;
        }
        let ret;
        if(menu == null){
            schools[school].scraper.scrapeMenu(date, location, meal, function(res) {
                let entry = new schools[school].db.Menu({id: getMenuId(date, meal, location), location: location, date: date, meal: meal, menu: res});
                entry.save(function(err) {
                    if(err) {
                        console.log(err);
                        callback(err, null);
                    } else {
                        console.log("Menu for " + meal + " on " + date + " at " + location + " saved");
                        callback(null, res);
                    }
                });
            });
        } else {
            callback(null, menu['menu']);
        }
    });
}

function getNutritionFacts(school, recipeId, callback) {
    schools[school].db.Nutrition.findOne({recipe: recipeId}, {'_id': 0}, function(err, facts){
        if(facts == null){
            schools[school].scraper.scrapeNutritionFacts(recipeId, function(res) {
                if(res == null) {
                    callback(null);
                } else {
                    let entry = new schools[school].db.Nutrition(res);
                    entry.save(function(err) {
                        if(err) {
                            console.log(err);
                            callback(err, null);
                        }else {
                            console.log("Nutrition facts for " + res['name'] + "(" + recipeId + ")" + " saved");
                            callback(null, res);
                        }
                    });
                }
            });
        } else {
            callback(null, facts);
        }
    });
}

function getMenuId(date, meal, location) {
    return date+"|"+meal+"|"+location;
}

app.get('/', function(req, res) {
    res.sendFile('index.html', { root: __dirname});
});

app.get('/get_menu.json', function(req, res) {
    let location = req.query.location;
    let date = req.query.date;
    let meal = req.query.meal;
    if(location == null || date == undefined || meal == undefined) {
        res.send("Invalid Parameters");
    }
    console.log("Menu for " +meal + " on " + date + " at " + location + " requested");
    getMenu('umd', date, location, meal, function(err, data) {
        if(err) {
            res.send(err);
        } else {
            res.json(data);
        }
    });
});

app.get('/get_nutrition.json', function(req, res) {
    let recipeId = req.query.id;
    if(recipeId == null) {
        res.send("Invalid Parameters");
    }
    console.log("Nutrition info for " + recipeId + " requested");
    getNutritionFacts('umd', recipeId, function(err, data) {
        if(err) {
            res.send(err);
        } else {
            res.json(data);
        }    });
});

app.get('/get_full_menu.json', function(req, res) {
    let location = req.query.location;
    let date = req.query.date;
    let meal = req.query.meal;
    if(location == null) {
        res.send("A location must be specified");
        return;
    }
    if(date == undefined) {
        res.send("A date must be specified");
        return;
    }
    if(meal == undefined) {
        res.send("A meal must be specified");
        return;
    }
    console.log("Full menu for " + meal + " on " + date + " at " + location + " requested");
    //TODO store full menus to prevent building on each request
    getMenu('umd', date, location, meal, (err, menu) => {
        if(err) {
            res.send(err);
            return;
        }
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
                getNutritionFacts('umd', menuItem.recipe, (err, data) => {
                    if(err) {
                        //Nutrition could not be retrieved
                        console.log(err);
                    }
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
