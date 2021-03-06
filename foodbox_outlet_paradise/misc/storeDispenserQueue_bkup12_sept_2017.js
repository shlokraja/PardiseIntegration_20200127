var debug = require('debug')('outlet_app:server');
var format = require('string-format');
var redis = require('redis');
var request = require('request');
var async = require("async");
var helper = require('../routes/helper');
var PlaceOrderModel = require("../models/PlaceOrderModel");
var firebase = require('firebase');
var internetAvailable = require("internet-available");
format.extend(String.prototype);
// Initiating the redisClient
var redisClient = redis.createClient();
redisClient.on('error', function(msg) {
    console.error(msg);
});

/*
changes done on sat 19 aug
by peerbits
 */
function storeDispenserQueue() {
    console.log('##############################');
    console.log('dispense queue node called');
    console.log('##############################');

    internetAvailable({
            timeout: 1000,
            retries: 3,
        })
        .then(function() {
            async.series([
                function(callback) {

                    searchobj = { is_send_to_HQ: false };

                    var fields = {
                        __v: false,
                        is_set_on_HQ: false,
                    };
                    var sort = { "sort": { "time": -1 } };
                    taskarray = [];
                    taskobject = {};
                    PlaceOrderModel.find(searchobj, fields, sort, function(err, order) {
                        console.log('##############################');
                        console.log('in seding details to HQ', order);
                        console.log('##############################');
                        if (typeof order != "undefined" && order.length > 0) {
                            for (var index = 0; index < order.length; index++) {
                                var element = order[index];
                                if (typeof element.sides == "undefined") {
                                    element.sides = {};
                                }
                                taskelement = {
                                    "name": element.name,
                                    "order_details": element.order_details,
                                    "sides": element.sides,
                                    "counter_code": element.counter_code,
                                    "payment_mode": element.payment_mode,
                                    "outlet_id": process.env.OUTLET_ID,
                                    "order_barcodes": element.order_barcodes,
                                    "mobile_num": element.mobile_num,
                                    "credit_card_no": element.credit_card_no,
                                    "cardholder_name": element.cardholder_name,
                                    "bill_no": element.bill_no,
                                    "food_details": element.food_details,
                                    "unique_Random_Id": element.unique_Random_Id,
                                    "is_mobile_order": element.is_mobile_order
                                };
                                var ref = new Firebase(process.env.FIREBASE_QUEUE);
                                ref = ref.child("tasks").push(taskelement, function(error, reply) {
                                    if (error) {
                                        console.log('##############################');
                                        console.log('error in sending data to firebase queue', error);
                                        console.log('##############################');
                                    } else {
                                        search_order_item = { is_send_to_HQ: false };
                                        order_items = {};
                                        order_items = Object.assign(order_items, PlaceOrderModel._doc);
                                        order_items.is_send_to_HQ = true;
                                        // PlaceOrderModel.update(search_order_item, order_items, function (err, numberAffected, rawResponse) {
                                        //   //handle it
                                        //   console.log('##############################');
                                        //   console.log('numberAffected', numberAffected);
                                        //   console.log('##############################');
                                        // });
                                    }
                                });

                            }
                        }
                        callback(null, order);
                    });
                },

                function(callback) {
                    redisClient.lrange(helper.dispense_local_status_node, 0, -1, function(err, reply) {
                        if (typeof reply != "undefined" && reply.length > 0) {
                            console.log('##############################');
                            console.log('reply typeof', reply, typeof reply);
                            console.log('##############################');
                            for (var index = 0; index < reply.length; index++) {
                                var dispens_obj = JSON.parse(reply[index]);
                                debug("Sending dispense status data as- ", dispens_obj);
                                var ref = new Firebase(process.env.FIREBASE_QUEUE);
                                ref.child('tasks').push(dispens_obj, function(error, reply) {
                                    if (error) {
                                        callback(error, null);
                                    } else {
                                        redisClient.del(helper.dispense_local_status_node, function(error, reply) {
                                            if (error) {
                                                console.log('##############################');
                                                console.log('eror', error);
                                                console.log('##############################');
                                                callback(error, null);
                                            }
                                            callback(null, reply);
                                        });
                                    }
                                });
                            }
                        }
                    });
                }

            ], function(error, reply) {
                if (error) {
                    console.log('##############################');
                    console.log('Store Dispense Queue Error', storeDispenserQueue);
                    console.log('##############################');
                    return;
                }
                console.log('##############################');
                console.log('reply', reply);
                console.log('##############################');

                // first check the redis nodes, if they are present, they no need
                redisClient.del(helper.dispenser_queue_node, function(err, reply) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    debug("Pulling any pending dispenser queue data from HQ");

                    // get the details from HQ
                    var hq_url = process.env.HQ_URL;
                    request({
                        url: hq_url + '/outlet/dispenser_queue/' + process.env.OUTLET_ID,
                        forever: true,
                    }, function(error, response, body) {
                        if (error || (response && response.statusCode != 200)) {
                            console.error('{}: {} {}'.format(hq_url, error, body));
                            return;
                        }
                        debug("Got queue details from HQ- ", body);
                        var queue = JSON.parse(body);
                        var seedDispenseId = 9000;
                        // and then store it in redis
                        queue.map(function(item) {
                            var bill_no = item.bill_no;
                            var quantity = item.quantity;
                            var food_item_id = item.food_item_id;
                            var barcode = item.barcode;
                            for (var i = 0; i < quantity; i++) {
                                var queue_item = {
                                    "dispense_id": seedDispenseId,
                                    "status": "timeout",
                                    "order_stub": createOrderStub(barcode,
                                        1,
                                        true,
                                        getOrderStubDate(),
                                        bill_no,
                                        seedDispenseId)
                                };
                                main_bill_no = bill_no;
                                if (typeof item != undefined) {
                                    date = moment().format("YYYY-MM-DD");
                                    search_order_item = {};
                                    search_order_item.bill_nos = main_bill_no;
                                    search_order_item.time = new RegExp(date, "i");
                                    order_items = {};
                                    order_items = Object.assign(order_items, OrderModel._doc);
                                    status = "{timeout}";
                                    order_items.dispense_status = status;
                                    OrderModel.update(search_order_item, order_items, function(err, numberAffected, rawResponse) {
                                        //handle it
                                        console.log('##############################');
                                        console.log('numberAffected', numberAffected);
                                        console.log('##############################');
                                    });
                                }

                                seedDispenseId++;
                                redisClient.rpush(helper.dispenser_queue_node, JSON.stringify(queue_item), function(set_err, set_reply) {
                                    if (set_err) {
                                        console.error(set_err);
                                        return;
                                    }
                                    debug("Pushed item {} to queue".format(food_item_id));
                                });
                            }
                        });
                    });
                });

            });
        })
        .catch(function(err) {
            console.log('##############################');
            console.log('internet not present in storeDispenserQueue');
            console.log('##############################');
        });

}

function createOrderStub(barcode, lane_no,
    heating_flag, date,
    bill_no, dispense_id) {
    var order_stub = '';
    order_stub += parseInt(lane_no).pad();
    order_stub += barcode;
    order_stub += (heating_flag) ? 'Y' : 'N';
    order_stub += date;
    order_stub += dispense_id.pad(6);
    order_stub += bill_no.pad(10);

    return order_stub;
}

function getOrderStubDate() {
    var date_obj = new Date();
    // gets a list of [dd, mm, yyyy]
    var date_items = date_obj.toISOString().substr(0, 10).split('-').reverse();
    // stripping off the first 2 characters from yyyy
    date_items[2] = date_items[2].substr(2);
    // joining them and returning
    return date_items.join('');
}

module.exports = storeDispenserQueue;