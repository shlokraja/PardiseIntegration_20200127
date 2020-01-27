var debug = require('debug')('outlet_app:server');
var format = require('string-format');
var request = require('request');
var helper = require('../routes/helper');
var internetAvailable = require("internet-available"); /* peerbits, rajesh end*/
var _ = require('underscore');
format.extend(String.prototype);
/* peerbits, rajesh*/
var redis = require('redis');
// Initiating the redisClient
var redisClient = redis.createClient({ connect_timeout: 2000, retry_max_delay: 5000 });


redisClient.on('error', function(msg) {
    console.error(msg);
});
/* peerbits, rajesh end*/


// get all outstanding POs in the last 15mins
// get the dict of rest_id, po_id and batch_id from the HQ
// pass that along to the browser
// when the user click, store that item against the rest_id as the key in the outlet
/*
2. during unscanned items, show the list of item ids from what was selected for the incoming po button and is stored in redis
 let the user select what item id was unscanned and put the quantity

then get the barcodes from that po_id and batch_id

the query shall group by po-id, batch-id, rest-id and sum the items and qty
*/

function checkIncomingPOold() {
    var outlet_host = process.env.OUTLET_HOST;
    var port = process.env.PORT;
    var outlet_url = outlet_host + port;

    var outlet_id = process.env.OUTLET_ID;
    var hq_url = process.env.HQ_URL;
    var GET_PO_URL = '/outlet/get_outstanding_po/';
    // Getting the response from HQ
    request(hq_url + GET_PO_URL + outlet_id, { forever: true },
        function(error, response, body) {
            if (error || (response && response.statusCode != 200)) {
                console.error('{}: {} {}'.format(hq_url, error, body));
                return;
            }

            var result_pos = _.groupBy(JSON.parse(body), "po_id");

            request({
                    url: outlet_url + '/outlet_app/store_po_details_in_redis',
                    method: "POST",
                    json: { "po_details": result_pos }
                },
                function(error, response, data) {
                    if (error || (response && response.statusCode != 200)) {
                        console.error("store_po_details_in_redis failed: " + error);
                        return;
                    }

                    // console.log(result_pos);
                });

            io.emit('incoming_po', JSON.parse(body));
        });
}


function checkIncomingPO() {
    var outlet_host = process.env.OUTLET_HOST;
    var port = process.env.PORT;
    var outlet_url = outlet_host + port;

    var outlet_id = process.env.OUTLET_ID;
    var hq_url = process.env.HQ_URL;
    var GET_PO_URL = '/outlet/get_outstanding_po/';
    internetAvailable({
            timeout: 1000,
            retries: 3,
        })
        .then(function() {
            /*i put my code in the is online function */
            // Getting the response from HQ
            request(hq_url + GET_PO_URL + outlet_id, { timeout: 5000 },
                function(error, response, body) {
                    if (error || (response && response.statusCode != 200)) {
                        console.error('{}: {} {}'.format(hq_url, error, body));
                        return;
                    }

                    var result_pos = _.groupBy(JSON.parse(body), "po_id");
                    /*
                            FOR STORING DATA IN OFFLINE MODE 
                            6-AUG-2017
                    */
                    redisClient.get(helper.offline_po_request_node, function(err, offline_po_details) {
                        if (err) {
                            debug('error while retreiving from redis- {}'.format(err));
                            // callback(err, null);
                            // return;
                        } else {

                            if (!offline_po_details) {
                                console.log('opps coming in offlinbe po details');
                                //we dont have the data in the offline key so lets set as its
                                redisClient.set(helper.offline_po_request_node,
                                    JSON.stringify(result_pos),
                                    function(store_po_details_err, store_po_details_reply) {
                                        if (store_po_details_err) {
                                            console.error('error while inserting in redis- {}'.format(store_po_details_err));
                                            console.error('rajesh there is eeror in inbiult funcion');
                                        }

                                    });
                            } else {

                                //we have length of the details
                                console.log("rajesh every thing working fine till now now code on the new things");
                                data = JSON.parse(offline_po_details);
                                for (var key in data) {
                                    if (data.hasOwnProperty(key)) {
                                        for (var itemcount = 0; itemcount < data[key].length; itemcount++) {
                                            if (typeof(data[key][itemcount].is_offline_reconcile_done) != 'undefined' && data[key][itemcount].is_offline_reconcile_done == 'y') {
                                                data[key][itemcount].is_offline_reconcile_done = "y";
                                            } else {
                                                data[key][itemcount].is_offline_reconcile_done = "n";
                                            }
                                            if (typeof(data[key][itemcount].is_set_on_HQ) != 'undefined' && data[key][itemcount].is_set_on_HQ == 'y') {
                                                data[key][itemcount].is_set_on_HQ = "y";
                                            } else {
                                                data[key][itemcount].is_set_on_HQ = "n";
                                            }

                                        }
                                    }
                                }
                                //maindata = result_pos;

                                /* merge the live data*/

                                for (var key in result_pos) {
                                    if (result_pos.hasOwnProperty(key)) {
                                        // check if id is present in the local data
                                        if (typeof data[key] != "undefined" && data[key].length > 0) {
                                            //do what ever you wnat to do
                                        } else {
                                            data[key] = result_pos[key];
                                        }
                                    }
                                }

                                //for storing data of latest merge
                                redisClient.set(helper.offline_po_request_node,
                                    JSON.stringify(data),
                                    function(store_po_details_err, store_po_details_reply) {
                                        if (store_po_details_err) {
                                            console.error('error while inserting in redis- {}'.format(store_po_details_err));
                                            console.error('rajesh there is eeror in inbiult funcion');
                                        }

                                    });
                                /*end merging */





                            }
                        }
                    });




                    /*END OF THE CODE */

                    request({
                            url: outlet_url + '/outlet_app/store_po_details_in_redis',
                            method: "POST",
                            json: { "po_details": result_pos }
                        },
                        function(error, response, data) {
                            if (error || (response && response.statusCode != 200)) {
                                console.error("store_po_details_in_redis failed: " + error);
                                return;
                            }
                        });





                    // io.emit('incoming_po', JSON.parse(body));
                });

        })
        .catch(function(err) {

            console.log("oops system is offline");
            //juse put the below code out side here

        });

    /*now for the offline things i get the data from the redis and emit RESULT as above function */
    redisClient.get(helper.offline_po_request_node, function(err, reply) {
        if (err) {
            console.error(err);
            //NEED TO CHECK THAT WE GOT ERROR OR NOT
            console.error('{}: {} {}'.format(hq_url, error, body));
            return;

        }
        data = JSON.parse(reply);
        var maindata = [];
        var index = 0;
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                for (var itemcount = 0; itemcount < data[key].length; itemcount++) {
                    // console.log('inside the big dtas', data[key][itemcount]);
                    //maindata[index] = data[key][0];
                    //if ('is_offline_reconcile_done' in data[key] && data[key].is_offline_reconcile_done == 'n') {

                    if (typeof(data[key][itemcount].is_offline_reconcile_done) != 'undefined' && data[key][itemcount].is_offline_reconcile_done == 'n') {
                        console.log('in');
                        console.log(data[key][itemcount].is_offline_reconcile_done);
                        maindata[index] = data[key][itemcount];
                        console.log('in1');
                        index++;
                    }
                    if (typeof(data[key][itemcount].is_offline_reconcile_done) == 'undefined') {
                        maindata[index] = data[key][itemcount];
                        index++;
                    }

                }
            }
        }
        io.emit('incoming_po', maindata);
    });



}



module.exports = checkIncomingPO;