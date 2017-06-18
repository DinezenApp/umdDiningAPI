let request = require('request');
let cheerio = require('cheerio');
let reporter = require('../../analytics/reporter');//Only 'graceful' errors are reported here

let locations = {
    '0': '04',//NCD
    '1': '16',//SCD
    '2': '51'//241
}

let meals = {
    '0': 'Breakfast',
    '1': 'Lunch',
    '2': 'Dinner'
}

function scrapeMenu(date, location, meal, callback) {
    if(!locations[location]) {
        callback("Invalid location code", null);
        return;
    }
    if(!meals[meal]) {
        callback("Invalid meal code", null);
        return;
    }
    let url = 'http://nutrition.umd.edu/longmenu.aspx?locationNum='+locations[location]+'&dtdate='+date+'&mealName='+meals[meal];
    let headers = {
        'Cookie' : 'WebInaCartLocation=04; WebInaCartDates=; WebInaCartMeals=; WebInaCartRecipes=; WebInaCartQtys='
    };
    request({url: url, headers: headers}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try{
                if(body == null) {
                    callback("Could not find menu page", null);
                    return;
                }
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
                callback(null, menu);
            } catch (err) {
                callback(err, null);
            }
        } else {
            callback(error, null);
        }
    });
};

function getNutritionInt(recipeId, s, nutrient) {
    let n = parseInt(s);
    if(isNaN(n)) {
        reporter.reportNutritionError('umd', recipeId, "Could not parse " + nutrient);
        return -1;
    }
    return n;
}

function getNutritionFloat(recipeId, s, nutrient) {
    let n = parseFloat(s);
    if(isNaN(n)) {
        reporter.reportNutritionError('umd', recipeId, "Could not parse " + nutrient);
        return -1;
    }
    return n;
}

function scrapeNutritionFacts(recipeId, callback) {
    let url = 'http://nutrition.umd.edu/label.aspx?RecNumAndPort='+recipeId;
    request(url, function (error, response, body) {
        try {
            if(body == null) {
                callback("Could not find nutrition label page", null);
                return;
            }
            let $ = cheerio.load(body);
            if($('.labelnotavailable').length != 0) {
                callback(null, {name: $('.labelrecipe').text(), recipe: recipeId});
                reporter.reportNutritionError('umd', recipeId, "Nutrition not available");
            } else {
                let table = $('table > tbody > tr > td > table > tbody').first().children('tr');

                let portionsplit = table.eq(0).children('td').first().children('font').eq(2).text().split(' ');
                let caloriessplit = table.eq(0).children('td').first().children('font').eq(3).text().split('\xa0');
                let fatcaloriessplit = table.eq(0).children('td').first().children('font').eq(4).text().split('\xa0');

                let facts = {
                    name : $('.labelrecipe').text(),
                    recipe: recipeId,
                    facts: {
                        portionnum : getNutritionFloat(recipeId, (portionsplit[0]), 'portionNum'),
                        portionunits : portionsplit[1],
                        calories : getNutritionInt(recipeId, (caloriessplit[caloriessplit.length-1]), 'calories'),
                        fatcalories : getNutritionInt(recipeId, (fatcaloriessplit[fatcaloriessplit.length-1]), 'fatcalories'),
                        totalfat : getNutritionFloat(recipeId, (table.eq(1).children('td').first().children('font').eq(1).text()), 'totalfat'),
                        carb : getNutritionFloat(recipeId, (table.eq(1).children('td').eq(2).children('font').eq(1).text()), 'carb'),
                        satfat : getNutritionFloat(recipeId, (table.eq(2).children('td').first().children('font').eq(1).text()), 'satfat'),
                        fiber : getNutritionFloat(recipeId, (table.eq(2).children('td').eq(2).children('font').eq(1).text()), 'fiber'),
                        transfat : getNutritionFloat(recipeId, (table.eq(3).children('td').first().children('font').eq(1).text()), 'transfat'),
                        sugar : getNutritionFloat(recipeId, (table.eq(3).children('td').eq(2).children('font').eq(1).text()), 'sugar'),
                        cholesterol : getNutritionFloat(recipeId, (table.eq(4).children('td').first().children('font').eq(1).text()), 'cholesterol'),
                        protein : getNutritionFloat(recipeId, (table.eq(4).children('td').eq(2).children('font').eq(1).text()), 'protein'),
                        sodium : getNutritionFloat(recipeId, (table.eq(5).children('td').first().children('font').eq(1).text()), 'sodium'),
                        ingredients : $('.labelingredientsvalue').text(),
                        allergens : $('.labelallergensvalue').text().split("/[ ,]+/")
                    }
                };
                callback(null, facts);
            }
        } catch (err) {
            callback(err, null);
        }
    });
};

module.exports = {
    scrapeMenu: scrapeMenu,
    scrapeNutritionFacts: scrapeNutritionFacts
}