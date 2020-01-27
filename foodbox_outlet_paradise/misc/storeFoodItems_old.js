var debug = require('debug')('outlet_app:server');
var format = require('string-format');
var request = require('request');
//var firebase = require('firebase');
var helper = require('../routes/helper');
var redis = require('redis');

// Initiating the redisClient
var redisClient = redis.createClient({ connect_timeout: 2000, retry_max_delay: 5000 });

redisClient.on('error', function(msg) {
    console.error(msg);
});


//function to fetch the data from HQ url and store the same in redis with hash object
/*
    Steps
    1. Try to connect to food items url (trying to connect the url 5 times with 5 sec delay)
    2. if we get connected then 
        2.1 convert the array in to object with key as id
        2.2. delete the old data 
        2.3. store all the converted data
    3. if we may not get connected then return false
*/

function storeFoodItems() {
    // Posting it to HQ
    var hq_url = process.env.HQ_URL;
    var outlet_id = process.env.OUTLET_ID;
    var FOOD_ITEM_HQ_URL = hq_url + '/food_item/price_info/' + outlet_id;
    var food_items = [];
    var data = {};
    request({
        url: FOOD_ITEM_HQ_URL,
        // The below parameters are specific to request-retry 
        maxAttempts: 5, // (default) try 5 times 
        retryDelay: 5000, // (default) wait for 5s before trying again 
    }, function(error, response, body) {
        if (error || (response && response.statusCode != 200)) {
            console.error('route storefooditems.js error in storing  the data from hq {}: {} {}'.format(FOOD_ITEM_HQ_URL, error, body));
            return;
        } else {
            //2. if we get connected then 
            // 2.1. convert the array in to object with key as id
            // bodydata = JSON.parse(body);
            // bodydata.forEach(function(item,index) {
            //         data[item.id] = JSON.stringify(item);
            // }); 
            console.log('##############################');
            console.log('stroing the string');
            console.log('##############################');

            if (body !== "undefined" && body != null) {
                //     // 2.2. delete the old data 
                //     redisClient.del(helper.outlet_HASH_KEY, function(err, reply) {
                //         console.log("deleted old data");
                //         console.log(reply);
                //     }); 
                //    // console.log("data = "+JSON.stringify(data));
                //     //2.3. store all the converted data
                //     redisClient.hmset(helper.outlet_HASH_KEY,data,function(err,reply) {
                //             console.log("provided with new data");
                //             console.log("error"+err);
                //             console.log("reply"+reply);
                //     }); 
                redisClient.set(helper.outlet_menu_items, body, function(err, reply) {
                    console.log("provided with new data");
                    console.log("error" + err);
                    console.log("reply" + reply);
                });
            }

            console.log('##############################');
            console.log('stroing the string end');
            console.log('##############################');
        }
    });


}
module.exports = storeFoodItems;