let request = require('request');
let cheerio = require('cheerio');


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


function scrapeNutritionFacts(recipeId, callback) {
    let url = 'http://nutrition.umd.edu/label.aspx?RecNumAndPort='+recipeId;
    request(url, function (error, response, body) {
        let $ = cheerio.load(body);
        if($('.labelnotavailable').length != 0) {
            callback(null);
        } else {
            let table = $('table > tbody > tr > td > table > tbody').first().children('tr');

            let portionsplit = table.eq(0).children('td').first().children('font').eq(2).text().split(' ');
            let caloriessplit = table.eq(0).children('td').first().children('font').eq(3).text().split('\xa0');
            let fatcaloriessplit = table.eq(0).children('td').first().children('font').eq(4).text().split('\xa0');
            //Fallback value if number can not be parsed/does not exist
            let defaultVal = null;
            let facts = {
                name : $('.labelrecipe').text(),
                recipe: recipeId,
                portionnum : parseFloat(portionsplit[0]) || defaultVal,
                portionunits : portionsplit[1],
                calories : parseInt(caloriessplit[caloriessplit.length-1]) || defaultVal,
                fatcalories : parseInt(fatcaloriessplit[fatcaloriessplit.length-1]) || defaultVal,
                totalfat : parseFloat(table.eq(1).children('td').first().children('font').eq(1).text()) || defaultVal,
                carb : parseFloat(table.eq(1).children('td').eq(2).children('font').eq(1).text()) || defaultVal,
                satfat : parseFloat(table.eq(2).children('td').first().children('font').eq(1).text()) || defaultVal,
                fiber : parseFloat(table.eq(2).children('td').eq(2).children('font').eq(1).text()) || defaultVal,
                transfat : parseFloat(table.eq(3).children('td').first().children('font').eq(1).text()) || defaultVal,
                sugar : parseFloat(table.eq(3).children('td').eq(2).children('font').eq(1).text()) || defaultVal,
                cholesterol : parseFloat(table.eq(4).children('td').first().children('font').eq(1).text()) || defaultVal,
                protein : parseFloat(table.eq(4).children('td').eq(2).children('font').eq(1).text()) || defaultVal,
                sodium : parseFloat(table.eq(5).children('td').first().children('font').eq(1).text()) || defaultVal,
                ingredients : $('.labelingredientsvalue').text(),
                allergens : $('.labelallergensvalue').text().split("/[ ,]+/")
            };
            callback(facts);
        }
    });
};

module.exports = {
    scrapeMenu: scrapeMenu,
    scrapeNutritionFacts: scrapeNutritionFacts
}