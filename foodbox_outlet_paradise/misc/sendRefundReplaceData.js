var debug = require('debug')('outlet_app:server');
var format = require('string-format');
var redis = require('redis');
var request = require('request');
var helper = require('../routes/helper');
var async = require('async');
var startPrint = require('../misc/printer').startPrint;
var sendUpdatedSMS = require('../misc/printer').sendUpdatedSMS;
var requestretry = require('requestretry');
var firebase = require('firebase');
var internetAvailable = require("internet-available");
format.extend(String.prototype);
var redisClient = redis.createClient({ connect_timeout: 2000, retry_max_delay: 5000 });
redisClient.on('error', function(msg) {
    console.log(msg);
    //process.exit;cl
});

function sendRefundReplaceData() {

    console.log('##############################');
    console.log('in funciton sendRefundReplaceData');
    console.log('##############################');
    internetAvailable({
            timeout: 1000,
            retries: 3,
        })
        .then(function() {
            async.parallel({
                refund_data_to_send: function(callback) {
                    redisClient.lrange(helper.refund_data_list_node, 0, 50, function(error, refunddata) {
                        callback(null, refunddata);
                    });
                },
                replace_data_to_send: function(callback) {
                    redisClient.lrange(helper.replace_data_to_send_node, 0, 50, function(error, replace_data_to_send) {
                        callback(null, replace_data_to_send);
                    });
                },
            }, function(err, results) {

                async.series([
                        function(callback) {
                            calls = [];
                            refund_data_to_send = results.refund_data_to_send;
                            refund_data_to_send.forEach(function(refundata) {
                                funtion_to_call = "";
                                funtion_to_call = function(callback) {
                                    original_data = refundata;
                                    refundata = JSON.parse(refundata);
                                    console.log("refundata", refundata);
                                    REFUND_ORDER_ITEMS_URL = process.env.HQ_URL + '/outlet/refund_items_offline/' + "-1";
                                    console.log("before HQ request retry", REFUND_ORDER_ITEMS_URL);
                                    requestretry({
                                            url: REFUND_ORDER_ITEMS_URL,
                                            json: refundata,
                                            maxAttempts: 5,
                                            _timeout: 1000,
                                            method: "POST"
                                        },
                                        function(error, response, body) {
                                            console.log("after request retry");
                                            if (
                                                error ||
                                                (response && response.statusCode != 200)
                                            ) {
                                                console.log("outlet_app.js :: showorders " + "{}: errror = {} {}".format(REFUND_ORDER_ITEMS_URL, error, JSON.stringify(response)));
                                                callback(error, null);
                                                return;
                                            }
                                            console.log('************************************************');
                                            console.log('original_data', original_data);
                                            console.log('************************************************');
                                            console.log('************************************************');
                                            console.log('JSON.stringify(refundata)', JSON.stringify(refundata));
                                            console.log('************************************************');
                                            removeelementsfromlistfunction(helper.refund_data_list_node, JSON.stringify(refundata), function(error, reply) {
                                                console.log('************************************************');
                                                console.log('removed element');
                                                console.log('************************************************');
                                                callback(null, 1);
                                            });

                                        }
                                    );
                                };

                                calls.push(funtion_to_call);
                            });

                            console.log('************************************************');
                            console.log('calls', calls);
                            console.log('************************************************');
                            callallfunctions(calls, function(error, reply) {
                                console.log('************************************************');
                                console.log('from call all funciton');
                                console.log('************************************************');
                                callback(null, reply);
                            });
                        },
                        function(callback) {
                            calls = [];
                            replace_data_to_send = results.replace_data_to_send;
                            console.log('##############################');
                            console.log('replace_data_to_send', replace_data_to_send.length);
                            console.log('##############################');

                            replace_data_to_send.forEach(function(replacedata) {
                                funtion_to_call = "";
                                funtion_to_call = function() {
                                    // console.log('##############################');
                                    // console.log('replacedata typeof ', replacedata ,typeof replacedata);
                                    // console.log('##############################');
                                    replacedata = JSON.parse(replacedata);
                                    var hq_url = process.env.HQ_URL;
                                    var REPLACE_ITEMS_URL = hq_url + '/outlet/replace_items_offline/' + "-1";
                                    // console.log('##############################');
                                    // console.log('replacedata typeof2 ', replacedata ,typeof replacedata);
                                    // console.log('##############################');
                                    requestretry({
                                            url: REPLACE_ITEMS_URL,
                                            json: replacedata,
                                            maxAttempts: 5,
                                            _timeout: 1000,
                                            method: "POST"
                                        },
                                        function(error, response, body) {
                                            if (error || (response && response.statusCode != 200)) {
                                                console.log("outlet_app.js :: showorders " + "{}: errror = {} {}".format(REPLACE_ITEMS_URL, error, JSON.stringify(response)));
                                                callback(error, null);
                                                return;
                                            }
                                            console.log('##############################');
                                            //console.log('body', body);
                                            console.log('##############################');
                                            redisClient.lrem(helper.replace_data_to_send_node, 1, JSON.stringify(replacedata), function(error, reply) {
                                                console.log('##############################');
                                                console.log('reply', reply);
                                                console.log('##############################');
                                                callback(null, reply);
                                                return;
                                            });
                                        }
                                    );
                                };
                                calls.push(funtion_to_call);
                            });
                            console.log('##############################');
                            console.log('calls', calls);
                            console.log('##############################');

                            callallfunctions(calls, function(error, reply) {
                                callback(null, reply);
                            });
                        },

                    ],
                    function(error, reply) {
                        if (error) {
                            console.log('##############################');
                            console.log('eroror', error);
                            console.log('##############################');
                        }
                        console.log('##############################');
                        console.log('reply', reply);
                        console.log('##############################');
                    });

            });
        })
        .catch(function(err) {
            console.log('##############################');
            console.log('internet is not online refund replace');
            console.log('##############################');

        });

}


//if call stack of all the calles parrallely
//call all functions start
function callallfunctions(calls, callback) {
    async.series(calls, function(err, result) {
        /* this code will run after all calls finished the job or
            when any of the calls passes an error */

        if (err) {
            console.log('##############################');
            console.log(err);
            console.log('##############################');
        }
        console.log('##############################');
        console.log('all function called');
        console.log('##############################');
        callback(null, result)
    });
}


function callallfunctionsinloop(datatoloop, callfunction, callback) {
    async.map(datatoloop, callfunction, function(err, reply) {
        if (err) {
            console.log(err);
        }
        console.log('##############################');
        console.log('reply', reply);
        console.log('##############################');
        callback(err, reply);
    });
}

function removeelementsfromlistfunction(node, string, callback) {
    redisClient.lrem(node, 0, string, function(err, reply) {
        if (err) {
            console.error("data not deleted form sending cron");
        }
        console.log('##############################');
        console.log('removed item node', reply, node, string);
        console.log('##############################');
        callback(null, reply);
    });
}




module.exports = sendRefundReplaceData;