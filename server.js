let express = require('express');
let app = express();
let bodyParser = require('body-parser');
let mongoose = require('mongoose');
let request = require('request');
let cheerio = require('cheerio');

mongoose.connect('mongodb://localhost/food');
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
    sugar : String, cholesterol : String,
    protein : String,
    sodium : String,
    calcium : String,
    ingredients : String,
    allergens : String
});

app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());

let scrapeMenu = function(date, locationId, meal, callback) {
    //let dateString = ('0' + date.getMonth()+1).slice(-2) + '/' + ('0' + (date.getDate())).slice(-2) + '/' + date.getFullYear();
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

let getMenu = function(date, locationId, meal, callback) {
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

//let scrapeMenu = function(date, locationId, meal, callback) {
//    
//    scrapeRecipeIds(date, locationId, meal, function(recipeIds){
//        let body = 'Action=';
//        for(i in recipeIds) {
//            body += '&recipe='+recipeIds[i]+'&QTY=1';
//        }
//        let dateString = ('0' + date.getMonth()+1).slice(-2) + '/'
//                         + ('0' + (date.getDate())).slice(-2) + '/'
//                         + date.getFullYear();
//        let url = 'http://nutrition.umd.edu/nutRpt.aspx?locationNum='+locationId+'&dtdate='+dateString+'&mealName='+meal;
//        request.post({
//            headers: {
//                    'content-type':'application/x-www-form-urlencoded',
//                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
//                    'referer': 'http://nutrition.umd.edu/longmenu.aspx?sName=%3cfont+style%3d%22color%3aRed%22%3eDining+%40+Maryland%3c%2ffont%3e&locationNum=04&locationName=%3cfont+style%3d%22color%3aRed%22%3eThe+Diner%3c%2ffont%3e&naFlag=1&WeeksMenus=This+Week%27s+Menus&dtdate=01%2f28%2f2017&mealName=Lunch',
//                    'accept-encoding': 'gzip, deflate',
//                    'accept-language': 'en-US,en;q=0.8',
//                    'cookie': 'WebInaCartLocation='+locationId+'; WebInaCartDates=; WebInaCartMeals=; WebInaCartRecipes=; WebInaCartQtys='
//            },
//            url: url,
//            body: body
//        }, function(error, response, body) {
//            let $ = cheerio.load(body);
//            let foods = [];
//            $('.nutrptnames').each(function(i, element) {
//                let name = $(this).children('a').text();
//                foods.push(name);
//                //let portion = $(this).parent().next().children('.nutrptportions').text();
//                //let calories = $(this).parent().next().next().next().children('.nutrptvalues').text();
//            });
//            
//            let menuJson = {
//                location_id: locationId,
//                date: date,
//                meal_name: meal,
//                menu: foods
//            };
//            callback(menuJson);
//        });
//    });
//};


let getNutritionFacts = function(recipeId, callback) {
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

let scrapeNutritionFacts = function(recipeId, callback) {
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
app.listen(8080, function() {
    console.log("Server started on port 8080");
});
