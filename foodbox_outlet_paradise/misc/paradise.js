var debug = require('debug')('outlet_app:server');
var format = require('string-format');
var request = require('request');
var helper = require('../routes/helper');
var async = require('async');
var express = require('express');
var router = express.Router();
var internetAvailable = require("internet-available"); /* peerbits, rajesh end*/
var offline_incomming_po = require('../misc/offline_incomming_po');
var startParadiseBillPrint = require('../misc/paradisePrinter').startParadiseBillPrint;

var _ = require('underscore');
format.extend(String.prototype);
/* peerbits, rajesh*/
var redis = require('redis');
// Initiating the redisClient
var redisClient = redis.createClient({ connect_timeout: 2000, retry_max_delay: 5000 });
var ntlm = require('request-ntlm-lite');

var outlet_host = process.env.OUTLET_HOST;
var port = process.env.PORT;
var outlet_url = outlet_host + port;
var food_item_data = {};
var paradise_food_item_data = {};
getItemDetails();
var dummydata = require('./dummydata');

router.post('/tvDisplay', function (req, res) {
    res.render('tv_display', {
        hq_url: process.env.HQ_URL,
        outlet_id: process.env.OUTLET_ID,
        outlet_host: process.env.OUTLET_HOST,
        outlet_port: process.env.PORT,
        websocket_port: process.env.WEBSOCKET_PORT
    });

});
router.get('/', function (req, res) {

    var context = {
        title: '',
    };
    res.render('order_confirm', context);


});

router.get('/GetConfirmOrderDetail/:secretcode', function (req, res) {

    try {
        var secretCode = req.params.secretcode;
        console.log("Code:", secretCode);
        redisClient.lrange(helper.pending_order_queue, 0, -1, function (err, reply) {

            var arr = new Array()

            //console.log("pending_order_queue:::", reply);
            for (var i = 0; i < reply.length; i++) {
                var tempData = JSON.parse(reply[i]);
                console.log("vendor order number::" + tempData.Customer_Order_No);
                if (tempData.Customer_Order_No != '' && tempData.Customer_Order_No != undefined) {

                    //console.log("vendor order number", tempData.VendorOrderNumber.toString().substring(tempData.VendorOrderNumber.toString().length - 4), tempData.VendorOrderNumber);
                    if (tempData.Customer_Order_No.toString().substring(tempData.Customer_Order_No.toString().length - 4) == secretCode) {
                        arr.push(tempData);
                    }
                }
            }
            var obj = new Object();
            obj.OrderDetails = arr;
            if (arr.length > 0) {
                res.send(obj);
            } else {
                redisClient.lrange(helper.pending_delivery_queue, 0, -1, function (err, reply) {
                    for (var i = 0; i < reply.length; i++) {
                        var tempData = JSON.parse(reply[i]);
                        console.log("Customer_Order_No::", tempData.Customer_Order_No.toString().substring(tempData.Customer_Order_No.toString().length - 4), tempData.Customer_Order_No);
                        if (tempData.status == "KR" && tempData.Customer_Order_No.toString().substring(tempData.Customer_Order_No.toString().length - 4) == secretCode) {
                            arr.push(tempData);
                        }
                    }
                    var obj = new Object();
                    obj.OrderDetails = arr;
                    if (arr.length > 0) {
                        res.send(obj);
                    }
                    else
                        res.send("");
                }
                );

            }
        })

    } catch (e) {
        console.log(e)
    }
});

// inserting order from LimeTray when paradise confirms
router.post('/createOrder', function (req, res) {
    console.log('order details', JSON.stringify(req.body));
    var hq_url = process.env.HQ_URL + '/fv_preprinted/PostOrder';
    redisClient.rpush(helper.pending_order_queue, JSON.stringify(req.body), function (err, reply) {
        ////console.log(reply);
        try {
            if (err) {
                res.send(err);
            } else {

                //     res.send("order received successfull");
                // } else {
                //console.log("hqurl:::", hq_url, req.body);
                request({
                    url: hq_url,
                    json: req.body,
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                    }
                },
                    function (error, res2, body) {
                        if (error || (res2 && res2.statusCode != 200)) {
                            console.error('{}: {} {}'.format(hq_url, error, ""));
                            return;
                        }

                        console.log("Sucessfully Inserted the Order");
                        res.sendStatus(200);
                    });



            }
        } catch (e) {
            ////console.log(e)
        }
    });
})

router.post('/OrderConfirm', function (req, res) {

    var orderConfirmDetail = req.body;

    // fOR STATUS KR
    //console.log("orderConfirmDetail:", orderConfirmDetail.status);

    if (orderConfirmDetail.status == "KR") {
        redisClient.lrange(helper.pending_delivery_queue, 0, -1, function (err, pendindDetails) {
            if (err) {
                console.log("Error reading Pending Delivery Queue");
                return;
            }

            for (var i = 0; i < pendindDetails.length; i++) {
                var tempData = JSON.parse(pendindDetails[i]);

                if (tempData.LimeTrayOrderNumber == orderConfirmDetail.LimeTrayOrderNumber) {
                    tempData.status = "OK";

                    redisClient.lset(helper.pending_delivery_queue, i, JSON.stringify(tempData), function (err, deletePendingOrder) {
                        ////console.log('deleted order from pending_order_queue::')
                        res.send("orderconfirmed");
                    })

                }
            }

        });

    }
    else {
        console.log("Order Confirm:", req.body);
        redisClient.rpush(helper.pending_delivery_queue, JSON.stringify(req.body), function (err, result) {

            try {
                if (err) {
                    res.send(err);
                    return;
                }
                console.log("Order Cofirmed---rpush called:", result)


                redisClient.lrange(helper.pending_order_queue, 0, -1, function (err, pendindDetails) {

                    for (var i = 0; i < pendindDetails.length; i++) {
                        var tempData = JSON.parse(pendindDetails[i]);

                        if (tempData.LimeTrayOrderNumber == orderConfirmDetail.LimeTrayOrderNumber) {

                            redisClient.lrem(helper.pending_order_queue, i, JSON.stringify(tempData), function (err, deletePendingOrder) {
                                ////console.log('deleted order from pending_order_queue::')

                                startParadiseBillPrint(orderConfirmDetail, function (err, result) {

                                    if (err) {
                                        return console.log(err);
                                    } else {
                                        res.send('orderconfirmed')
                                    }

                                    return;
                                });

                            })

                        }
                    }

                })


            } catch (e) {
                console.log(e)
            }
        });
    }

});

router.get('/getPendingOrders', function (req, res) {
    var orders = [];
    var sno = 0;
    redisClient.lrange(helper.pending_delivery_queue, 0, -1, function (err, pendingDeliveryQueue) {
        if (err) {
            console.log("Error reading Pending Order Queue");
            return;
        }
        for (var i = 0; i < pendingDeliveryQueue.length; i++) {
            var element = JSON.parse(pendingDeliveryQueue[i]);
            console.log(element);
            var total = element.items.map(function (item) {
                return item.Quantity;
            }).reduce(function (a, b) {
                return parseInt(a) + parseInt(b);
            });
            var statusText = "Checking Dispenser Stock";
            if (element.status == "KR") {
                statusText = "Order Ready!!! Re-enter the Bill number in the POS to deliver";
            }
            else if (element.status == "K") {
                statusText = "Waiting for Kitchen Order!!!";
            }
            sno = i + 1;
            orders.push({ sno: sno + 1, LimeTrayOrderNumber: element.LimeTrayOrderNumber, OrderDate: element.OrderDateTime, vendor: element.VendorName, status: statusText, dstatus: '0/' + total, remarks: 'Processing' });
        }
        redisClient.lrange(helper.pending_dispenser_queue, 0, -1, function (err, pendDispQueue) {
            if (err) {
                console.log("Error reading Pending Order Queue");
                return;
            }
            for (var i = 0; i < pendDispQueue.length; i++) {
                var element = JSON.parse(pendDispQueue[i]);
                console.log(element);
                var total = element.items.map(function (item) {
                    return item.Quantity;
                }).reduce(function (a, b) {
                    return parseInt(a) + parseInt(b);
                });
                var statusText = "Delivery In-Progress";
                if (element.status == "KR") {
                    statusText = "Order Ready!!! Re-enter the Bill number in the POS to deliver";
                }
                else if (element.status == "K") {
                    statusText = "Waiting for Kitchen Order!!!";
                }
                console.log("element.pending:", element.pending);
                orders.push({ sno: sno + i + 1, LimeTrayOrderNumber: element.LimeTrayOrderNumber, OrderDate: element.OrderDateTime, vendor: element.VendorName, status: statusText, dstatus: total - element.pending + '/' + total, remarks: 'Processing' });
            }
            console.log("Orders pending:", orders);
            res.send({ result: 'ok', data: orders, error: false });
        });




    });
}
);
redisClient.on('error', function (msg) {
    console.error(msg);
});

function CheckParadiseOrder() {
    getItemDetails();
    CheckItemExistsInDispenser();
    CheckDispenserQueue();
    //NewCheck();
    //CheckAsync();
}


async function ProcessDispenserQueue(array) {
    for (var i = 0; i < array.length; i++) {
        await new Promise(next => {
            console.log("Processing Dispenser queue Order:::", array[i]);
            processDispenserData(array[i], i, function (err, data) {
                //console.log(data);
                if (data == "Deleted Sucessfully") { //if order is placed the index will change in the redis queue so it will start in next iteration
                    return;
                }
                /*.... code here and when you finish...*/
                console.log("Completed Dispenser Queue:::", i);
                next()
            })
        })
    }
}
function processDispenserData(array, index, callback) {
    jsonEle = JSON.parse(array);
    var statusCode = 0;
    redisClient.lrange(helper.dispenser_queue_node, 0, -1, function (err, dispenserQueue) {
        for (var i = 0; i < dispenserQueue.length; i++) {
            var element = JSON.parse(dispenserQueue[i]);
            if (parseInt(element.order_stub.substring(element.order_stub.length - 4)) == parseInt(jsonEle.bill_no)) {
                if (element.status == 'pending') {
                    statusCode = statusCode + 1;
                }
            }
        }
        if (statusCode > 0) {
            jsonEle.pending = statusCode;
            redisClient.lset(helper.pending_dispenser_queue, index, JSON.stringify(jsonEle), function (err, repl) {
                if (err) {
                    console.log("Error Setting Queue")
                    return;
                }
                console.log("Ordered Items despatch in Progress:::", jsonEle.VendorOrderNumber);
                callback(null, "Dispenser queue Pending");
            });
        }
        else {
            redisClient.lrem(helper.pending_dispenser_queue, index, JSON.stringify(jsonEle), function (err, repl) {
                if (err) {

                    console.log("Error Setting Queue")
                    return;
                }
                var hq_url = process.env.HQ_URL + '/fv_preprinted/PostOrder';
                request({
                    url: hq_url,
                    json: jsonEle,
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                    }
                },
                    function (error, res2, body) {
                        if (error || (res2 && res2.statusCode != 200)) {
                            console.error('{}: {} {}'.format(hq_url, error, ""));
                            return;
                        }

                        console.log("Sucessfully Updated the Order");
                        //res.sendStatus(200);
                        console.log("Deleted the Queue Successfully");
                        callback(null, "Deleted Sucessfully");
                    });


            });

        }

    });

}
function CheckDispenserQueue() {

    redisClient.lrange(helper.pending_dispenser_queue, 0, -1, function (err, dispQueue) {
        if (err) {
            console.log("Error reading pending dispenser queue"); return;
        }
        ProcessDispenserQueue(dispQueue);


    });

}
function doRequest(url) {
    return new Promise(function (resolve, reject) {
        request(url, function (error, res, body) {
            if (!error && res.statusCode == 200) {
                resolve(body);
            } else {
                reject(error);
            }
        });
    });
}
async function main(pendingDetails, cb) {
    console.log(pendingDetails);
    console.log("--------------------------------------**************");
    //    pendingDetails.forEach(element => {
    let res = await doRequest(outlet_url + '/order_app/getmenuitems');
    return cb(null, res.substring(1, 100));
    //  });

}

function CheckItemExistsInDispenser() {

    var index = 0;
    redisClient.get(helper.stock_count_node, function (err, reply) {
        if (err) {
            console.error(err);
            socket.emit('stock_count', { "error": "error while retreiving from redis- {}".format(err) });
            return;
        }
        var parsed_response = JSON.parse(reply);
        var stockItemDetails = []
        for (var item_id in parsed_response) {
            var countItem = 0
            var item_node = parsed_response[item_id];
            for (var i = 0; i < item_node["item_details"].length; i++) {
                countItem = countItem + parseInt(item_node["item_details"][i]["count"]);
            }
            stockItemDetails.push({ "itemId": item_id, "count": countItem });
        }
        redisClient.lrange(helper.pending_delivery_queue, 0, -1, function (err, pendindDetails) {
            if (err) {
                console.log("Error reading Pending Order Queue");
                return;
            }
            else {

                if (pendindDetails[0] != '') {
                    ProcessOrder(pendindDetails, stockItemDetails);
                }

            }
        });
    });

}
async function ProcessOrder(array, stockItemDetails) {
    for (var i = 0; i < array.length; i++) {
        await new Promise(next => {
            console.log("Processing Order:::", array[i]);
            ProcessData(array[i], i, stockItemDetails, function (err, data) {
                //console.log(data);
                if (data == "OrderPlaced") { //if order is placed the index will change in the redis queue so it will start in next iteration
                    return;
                }
                /*.... code here and when you finish...*/
                console.log("Completed:::", i);
                next()
            })
        })
    }
}
function ProcessData(element, index, stockItemDetails, callback) {
    var itemsDetails = [];
    var jsonEle = JSON.parse(element);
    jsonEle.Index = index;
    //if order placed
    console.log("Status of  Delivery queue:", jsonEle.status);

    jsonEle.items.forEach(e2 => {
        //console.log("e2:", e2);
        if (e2.locked == undefined) e2.locked = false;
        if (e2.lockedQty == undefined) e2.lockedQty = 0;
        if (e2.previousQuantity == undefined) e2.previousQuantity = 0;
        //   console.log(e2);
        itemsDetails.push({ "itemId": e2.itemId, "Quantity": e2.Quantity, "locked": e2.locked, "lockedQty": e2.lockedQty, "previousQuantity": e2.previousQuantity });
    });

    var stock_ItemDetails = [];
    _.forEach(stockItemDetails, function (it, ix) {
        stock_ItemDetails.push({ "itemId": it.itemId, "count": it.count });
    })

    checkItemAvailable(itemsDetails, stock_ItemDetails, jsonEle, function (err, OrderItemDetails, jsonEle) {
        //console.log("After Checking order items availiability int he stock quee-----", OrderItemDetails);
        var Sresult = _.countBy(OrderItemDetails, 'blnExists'); //3
        var result = _.countBy(OrderItemDetails, 'blnExists')["true"];//2
        if (Sresult != undefined && result == undefined) {
            result = 0;
        }
        if (result != undefined) {
            if (result == OrderItemDetails.length && jsonEle.status != "K" && jsonEle.status != "KR") {// Placing order
                moveItemsToDispenserQueue(OrderItemDetails, "increase", jsonEle, function (err, itemDetails, jsonEle) {
                    console.log("deleting queue:", jsonEle);
                    //remove the order from the pending delivery queue
                    DeletePendingOrderQueue(jsonEle.Index, JSON.stringify(jsonEle), function (err, result) {
                        if (result == "Success") {
                            console.log("Placing order-*-----------------------------------------------", jsonEle);
                            placeOrder(itemDetails, function (err, data) {
                                jsonEle.bill_no = data.bill_no;
                                jsonEle.unique_Random_Id = data.unique_Random_Id;
                                redisClient.lpush(helper.pending_dispenser_queue, JSON.stringify(jsonEle), function (err, reply) {
                                    console.log("Inserted into pending dispenser Queue", jsonEle.VendorOrderNumber);
                                    callback(null, "OrderPlaced");
                                });
                            });
                            index = index + 1;
                        }
                    });
                });
            }

            else { //lock available items        
                if (jsonEle.status != "OK") {
                    if (result == OrderItemDetails.length) //Kot Status order have fullfilled the Order details waiting for user
                    {
                        jsonEle.status = "KR"; //if status is KR then kitchen order is ready show in TV-display
                    }
                    else {
                        jsonEle.status = "K"; // Idenitifying the KOT items This flag is used to reenter the bill number from the Delivery Person
                    }
                }
                //for partial quantity push the partial quantity
                // locking Available items
                if (OrderItemDetails.length) {
                    moveItemsToDispenserQueue(OrderItemDetails, 'increase', jsonEle, function (err, itemDetails, jsonEle) {
                        // mark status for each line items
                        //console.log("Order:", jsonEle.LimeTrayOrderNumber, " itemDetails:");
                        itemDetails.forEach(function (item, ix) {
                            for (let indexx = 0; indexx < jsonEle.items.length; indexx++) {
                                const element = jsonEle.items[indexx];
                                if (element.itemId == item.itemId) {
                                    element.locked = true;
                                    element.lockedQty = item.lockedQty;
                                    console.log("lockedQty:", item.lockedQty, "itemid", item.itemId);
                                }
                            }
                        });

                        //  console.log('Pending order queu Update:', jsonEle.Index, " json modified:", JSON.stringify(jsonEle));
                        jsonEle.LastUpadatedDate = new Date();
                        redisClient.lset(helper.pending_delivery_queue, jsonEle.Index, JSON.stringify(jsonEle), function (err, res) {
                            if (err) {
                                //console.log("Error reading Pending Order Queue");
                                index = index + 1;
                                return;
                            }
                            else {
                                //console.log("Succesfully updated the Status of the Order to KOT");
                                index = index + 1;
                                callback(null, "success");
                            }
                        });

                        ////console.log("Available Items locked  for order number", jsonEle.LimeTrayOrderNumber);
                    });
                }
                ////console.log("*************************************Order Items not Available in the Dispenser*******************************", JSON.stringify(OrderItemDetails));
                // }
            }
        }
    });

}
// check

function DeletePendingOrderQueue(index, item, callback) {
    console.log("index:::::::::::::::::::::::::::::::", index, item);
    redisClient.lset(helper.pending_delivery_queue, index, item, function (err, reply) {
        if (err) {
            return;
        }
        redisClient.lrem(helper.pending_delivery_queue, index, item, function (err, deletePendingOrder) {
            if (err) {
                console.log("error while deleitng queue")
                callback(null, "Error");;
                return;
            }
            console.log('deleted order from pending_order_queue::')
            callback(null, "Success");;
        });

    });

}
function getItemDetails() {
    ////console.log("Getting OUtlet food item details");
    request({
        url: outlet_url + '/order_app/getmenuitems',
        method: "get",

    }, function (error, response, result) {
        if (error || (response && response.statusCode != 200)) {
            console.error('{}: {} {}'.format(outlet_url, error, result));
            return;
        }

        var data = JSON.parse(result);
        ////console.log('Received price data');
        for (var i = 0; i < data.length; i++) {
            food_item_data[data[i]["id"]] = {
                "mrp": data[i]["mrp"],
                "master_id": data[i]["master_id"],
                "name": data[i]["name"],
                "item_tag": data[i]["item_tag"],
                "veg": data[i]["veg"],
                "service_tax_percent": data[i]["service_tax_percent"],
                "abatement_percent": data[i]["abatement_percent"],
                "vat_percent": data[i]["vat_percent"],
                "location": data[i]["location"],
                "side_order": data[i]["side_order"],
                "restaurant_details": {
                    "id": data[i]["r_id"],
                    "name": data[i]["r_name"],
                    "address": data[i]["r_address"],
                    "st_no": data[i]["r_st_no"],
                    "pan_no": data[i]["r_pan_no"],
                    "tin_no": data[i]["r_tin_no"],
                    "sender_email": data[i]["r_sender_email"]
                },
                "coke_details": {
                    "id": data[i]["b_id"],
                    "name": data[i]["b_name"],
                    "mrp": data[i]["b_mrp"],
                    "st": data[i]["b_service_tax_percent"],
                    "abt": data[i]["b_abatement_percent"],
                    "vat": data[i]["b_vat_percent"],
                    "discount_percent": data[i]["discount_percent"],
                    "restaurant_details": {
                        "id": data[i]["b_r_id"],
                        "name": data[i]["b_r_name"],
                        "address": data[i]["b_r_address"],
                        "st_no": data[i]["r_st_no"],
                        "pan_no": data[i]["r_pan_no"],
                        "tin_no": data[i]["b_r_tin_no"]
                    }
                },
                "heating_reqd": data[i]["heating_required"],
                "heating_reduction": data[i]["heating_reduction"],
                "condiment_slot": data[i]["condiment_slot"],
                "stock_quantity": -1
            }
        }
    });

}


function placeOrder(OrderItemDetails, callback) {

    console.log("OrderItemDetails:::", OrderItemDetails);
    var unique_Random_Id = new Date().toISOString().split('T')[0].replace(/-/g, "") + Math.random().toString(36).substring(2, 5) + Math.random().toString(36).substring(2, 5);
    var jsonString = "{\"order\": {";
    var jsonEndString = "}, \"sides\": {}, \"counter_code\": 1, \"mode\": \"credit\", \"from_counter\": \"false\", \"savings\": 0,\"mobile_num\": \"1234567890\", \"credit_card_no\": \"\",\"cardholder_name\": \"\", \"test_mode\": \"false\", \"unique_Random_Id\": \"" + unique_Random_Id + "\", \"countrytype\": \"India\" }";
    /*jsonString.order.push({
        "15086": {
            "count": "1", "price": "99", "heating_flag": "true", "heating_reduction": "1", "condiment_slot": "0", "name": "Millet Biryani", "restaurant_details": [],
            "side_order": "Raitha", "veg": "true"
        }
    });*/


    var ordDet = "";
    OrderItemDetails.forEach(element => {
        //     ////console.log("food_item_data[element.itemId]*************************", food_item_data[element.itemId]);
        var rdet = JSON.stringify(food_item_data[element.itemId].restaurant_details);
        var orderLine = "\"" + element.itemId + "\"" + ":    { \"count\": \"" + element.Quantity + "\",\"price\": \"" + food_item_data[element.itemId].mrp + "\",\"heating_flag\":\"" + food_item_data[element.itemId].heating_reqd + "\",\"heating_reduction\": \"" + food_item_data[element.itemId].heating_reduction + "\",\"condiment_slot\": \"0\",\"name\": \"" + food_item_data[element.itemId].name + "\",\"restaurant_details\":" + rdet + " ,\"side_order\": \"Raitha\",\"veg\": \"" + food_item_data[element.itemId].veg + "\"} ";
        if (ordDet.length > 0) {
            ordDet = ordDet + "," + orderLine;
        }
        else {
            ordDet = orderLine;
        }

    });
    jsonString = jsonString + ordDet + jsonEndString;
    ////console.log("jsonStringjsonStringjsonStringjsonStringjsonStringjsonStringjsonString:", jsonString);
    ////console.log("Placing Order:", JSON.parse(jsonString));

    request({
        url: outlet_url + '/order_app/place_order',
        method: "POST",
        json: JSON.parse(jsonString)
    }, function (error, response, body) {
        if (error || (response && response.statusCode != 200)) {
            console.error('{}: {} {}'.format(outlet_url, error, body));
            return;
        }

        console.log("Order Placed SucessFully", body.bill_no);
        callback(null, { bill_no: body.bill_no, unique_Random_Id: unique_Random_Id });
        //debug(body);
    });

}
function getLockedCount(item_id) {

    redisClient.get(item_id, function (err, reply) {
        if (err) {
            ////console.log("get Locked Items Error");
            itemDetails.push({ "itemId": item_id, "count": countItem });
            return 0;
        }
        ////console.log("get Locked Items reply", reply);
        if (reply == null) {
            reply = 0;
        }
        var cntLocked = parseInt(reply);
        return cntLocked;

    });

}

function checkItemAvailable(OrderItemDetails, itemDetails, jsonEle, callback) {
    console.log('Inside Checking for Available items:', jsonEle.LimeTrayOrderNumber, "itemDetails:", itemDetails, " OrderItemDetails::", OrderItemDetails);



    var item_id_list = [];
    itemDetails.forEach(item => {
        item_id_list.push(item.itemId + '_locked_count');
    });

    ////console.log("item_id_list:::", item_id_list, "itemDetails:", itemDetails);
    redisClient.mget(item_id_list, function (l_err, l_reply) {
        itemDetails.forEach(item => {
            //  console.log("stock item:", item);
            if (l_reply[item_id_list.indexOf(item.itemId + '_locked_count')]) {
                //console.log("parseInt(l_reply[item_id_list.indexOf(item.itemId + _locked_count)]):::", parseInt(l_reply[item_id_list.indexOf(item.itemId + '_locked_count')]));
                //console.log("inside redis itemcount:", item.count);
                item.count = item.count - parseInt(l_reply[item_id_list.indexOf(item.itemId + '_locked_count')]);//3-3=0
                //console.log("After inside redis itemcount:", item.count);
            }
            ////console.log("item:", item);
        });
        // Sending the data to the socket.io channel
        ////console.log("OrderItemDetails:", OrderItemDetails, itemDetails);
        //orderqtt=8 locked=3 pending=5 itemcount=3   
        OrderItemDetails.forEach(order => {
            var fitem = _.filter(itemDetails, function (item) {
                return item.itemId == order.itemId;
            });
            //console.log("filtered items:", fitem);
            if (fitem.length > 0) {
                if (fitem[0].count >= parseInt(order.Quantity) - parseInt(order.lockedQty)) { // 0>=8-3=>>  0>=5
                    //console.log(order.itemId, order.Quantity, "---------------------True condition-------------------", jsonEle.LimeTrayOrderNumber);

                    order.blnExists = true;
                    order.previousQuantity = order.lockedQty;
                    order.lockedQty = order.Quantity;

                    //console.log("---------------------True condition-------------------", order, fitem, jsonEle.LimeTrayOrderNumber);
                }
                else {
                    ////console.log("fitem[0].count", fitem[0].count);
                    order.blnExists = false;
                    order.previousQuantity = order.lockedQty;
                    order.lockedQty = fitem[0].count + parseInt(order.lockedQty);//0+3                     
                    //console.log("---------------------False condition-------------------", order, fitem, jsonEle.LimeTrayOrderNumber);
                }
            }
            else {

                order.blnExists = false;
                order.PendingQuantity = order.Quantity;
                order.lockedQty = 0;
                //console.log(order.itemId, order.Quantity, "---------------------Else False condition-------------------", order);
            }
        });
        return callback(null, OrderItemDetails, jsonEle);
    });

}

function PostParadiseForItemsNotFound() {

}
function createPOForItemsNotFound() {

}
function moveItemsToDispenserQueue(itemDetails, direction, jsonEle, callback) {
    //console.log("Inside moveItemsToDispenserQueue itemid:", "  lime:", jsonEle.LimeTrayOrderNumber);
    // Lock required items 
    var cnt = 0;
    if (itemDetails.length == 0) callback(null, itemDetails, jsonEle);
    itemDetails.forEach(item => {
        var lockQuantity = item.lockedQty - item.previousQuantity;
        if (lockQuantity != 0) {


            //////console.log("items processing:", item.itemId, outlet_url + '/order_app/lock_item/' + item.itemId);
            request({
                url: outlet_url + '/order_app/lock_item/' + item.itemId,
                method: "POST",
                json: { "delta_count": lockQuantity, "direction": direction }
            }, function (error, response, body) {
                if (error || (response && response.statusCode != 200)) {
                    console.error('{}: {} {}'.format(outlet_url, error, body));
                    return;
                }
                cnt = cnt + 1;
                //console.log("Items locked SucessFully count:", cnt);

                if (itemDetails.length == cnt) {
                    return callback(null, itemDetails, jsonEle);
                }
                //debug(body);
            });
        }
        else {
            cnt = cnt + 1;
            //console.log("Items locked SucessFully count:", cnt);

            if (itemDetails.length == cnt) {
                return callback(null, itemDetails, jsonEle);
            }


        }
    });

}

function InsertOrdersToHQ(jsonEle) {

    var element = JSON.parse(jsonEle);
    var url = process.env.HQ_URL + '/Food_vending/PostOrder'
    var jsonDataObj = element;
    request.post({
        url: url,
        body: jsonDataObj,
        json: true
    }, function (error, response, body) {
        console.log(body);
    });
}


function UpdateOrdersToHQ(jsonEle) {

    var element = JSON.parse(jsonEle);
    var url = process.env.HQ_URL + '/Food_vending/UpdateOrder'
    var jsonDataObj = element;
    request.post({
        url: url,
        body: jsonDataObj,
        json: true
    }, function (error, response, body) {
        console.log(body);
    });
}


const GetParadiseFoodItemList = () => {
    var hq_url = process.env.HQ_URL + '/outlet/paradise_item_list/' + process.env.OUTLET_ID;
    request({
        url: hq_url,
        method: "GET",
        timeout: 5000,

    }, function (error, response, data) {

        if (error || (response && response.statusCode != 200)) {
            //callback(error, null);
        }
        if (response != undefined) {

            redisClient.set(helper.Paradise_Food_item, JSON.stringify(response.body), function (err, reply) {

                console.log("Inserted into paradise food item list into redis::", reply);

            });


        }
    });
}

const GetParadiseOrderItemDetail = () => {
    console.log("GetParadiseOrderItemDetail  Starting::");
    async.waterfall([
        function (callback) {
            redisClient.get(helper.Paradise_Food_item, function (err, paradisefooditem) {
                if (err) {
                    console.log("Error Paradise_Food_item Queue");
                    callback(err, null);
                    return;
                }
                if (paradisefooditem) {
                    // console.log("paradisefooditem:::-------", paradisefooditem)
                    callback(null, JSON.parse(paradisefooditem));
                } else {
                    callback(null, null);
                }
            });
        },
        function (itemDetails, callback) {

            var opts = {
                username: 'LIMETRAY.TEST',
                password: 'paradise@123',
                ntlm_domain: 'PARADISE\LIMETRAY.TEST',
                url: "http://183.82.108.231:1215/UPPLSRVTEST/OData/Company('Paradise_Live')/LimeOrder"
            };

            //ntlm.get(opts, {}, function (err, response) {
            //if (err) {
            //   callback(err, null);
            //}
            //if (response != undefined) {
            //   callback(null, response.body, itemDetails);
            //}
            //});
            ntlm.get(opts, {}, function (err, response) {
                if (err) {
                    callback(err, null);
                }
                if (response != undefined) {

                    console.log("Response from service received::");
                    //var tempResponse = response.body.value;
                    var tempResponse = dummydata.tempdata1.value;


                    redisClient.get(helper.Paradise_Last_LimeTray_Order_Date, function (err, reply) {
                        if (err) {
                            console.log("Error reading Pending Order Queue");
                            return;
                        }

                        if (reply == null) {
                            callback(null, tempResponse, itemDetails);
                            console.log(":::::::::::::new item pushing::::::::::::::::::::::::::::::::", reply)
                        } else {
                            console.log("Replay from Paradise_Last_LimeTray_Order_Date:::", reply);

                            //console.log("Replay from Paradise_Last_LimeTray_Order_Date:::",tempResponse);
                            var tempitem = []
                            tempResponse.forEach((e1) => {

                                //console.log(e1.Limetray_Order_Date, e1.Limetray_Order_Time );
                                var dtString = reply.split("T");
                                dtString = dtString[0] + " " + dtString[1];
                                if (getLimeTrayDate(e1.Limetray_Order_Date, e1.Limetray_Order_Time) > new Date(dtString)) {
                                    console.log("::::item pushing:::::::::::::::::::::::Newww:::::::::")
                                    tempitem.push(e1);
                                }

                            })
                            callback(null, tempitem, itemDetails);
                        }


                    });


                    //callback(null, response.body, itemDetails);
                }
            });

        }], function (error, paradise_LinetrayItems, paradise_food_item) {

            if (error) {

            }
            var arrDate = [];

            if (paradise_LinetrayItems && paradise_LinetrayItems.length > 0) {
                //console.log("dummydata.tempdata1::: ",dummydata.tempdata1);
                //paradise_LinetrayItems.value.forEach(element => {
                paradise_LinetrayItems.forEach(element => {

                    if (element.Created_in_POS) {

                        var order_details = {
                            VendorName: '',
                            VendorOrderNumber: '',
                            Customer_Order_No: '',
                            LimeTrayOrderNumber: '',
                            ParadiseOrderNumber: '',

                            CustomerDetails: {
                                CustomerName: '',
                                CustomerAddress: '',
                                PhoneNumber: ''
                            },
                            items: [],
                            OrderDateTime: '',
                            PaymentMode: '',
                            SecretCode: ''

                        };

                        if (element.Limetray_Order_Time && element.Limetray_Order_Date) {
                            var date = new Date(element.Limetray_Order_Date);

                            //var tempData = date.toLocaleDateString() + ' ' + element.Limetray_Order_Time;
                            order_details['VendorName'] = element.Delivery_Customer_Name;
                            order_details['Customer_Order_No'] = element.Customer_Order_No;
                            order_details['OrderDateTime'] = element.Limetray_Order_Date;
                            order_details.CustomerDetails.CustomerName = element.Customer_Name;
                            order_details['LimeTrayOrderNumber'] = element.LimeTray_Ref_No;
                            order_details.CustomerDetails.CustomerAddress = element.Customer_Email;
                            order_details.CustomerDetails.PhoneNumber = element.Customer_Mobile_Number;
                        }
                        arrDate.push(getLimeTrayDate(element.Limetray_Order_Date, element.Limetray_Order_Time));
                        //console.log("JSON.stringify(element.Limetray_Order_Date)::" + JSON.stringify(element.Limetray_Order_Date))
                        console.log("********************Calling LimeTray details:::::::::::::::", element.LimeTray_Ref_No);
                        getItemDetailByLimeTrayId(element.LimeTray_Ref_No, order_details, paradise_food_item);
                    }
                });
                console.log("Array Dates:::", arrDate);

                redisClient.get(helper.Paradise_Last_LimeTray_Order_Date, function (err, reply) {
                    if (err) {
                        console.log("Error reading Pending Order Queue");
                        return;
                    }

                    if (reply) {

                        redisClient.set(helper.Paradise_Last_LimeTray_Order_Date, JSON.stringify(max_date(arrDate)), function (err, res) {
                            if (err) {
                                console.log("Error Paradise_Last_LimeTray_Order_Date::" + err);
                                return;
                            }
                            else {
                                console.log("Paradise_Last_LimeTray_Order_Date Success");
                            }
                        });

                    } else {
                        if (reply != JSON.stringify(max_date(arrDate))) {
                            redisClient.set(helper.Paradise_Last_LimeTray_Order_Date, JSON.stringify(max_date(arrDate)), function (err, res) {
                                if (err) {
                                    console.log("Error Paradise_Last_LimeTray_Order_Date::" + err);
                                    return;
                                }
                                else {
                                    console.log("Paradise_Last_LimeTray_Order_Date Success");
                                }
                            });
                        }
                    }

                    console.log("Paradise_Last_LimeTray_Order_Date:::::::::::!!!!!!!!!", reply);
                })

            } // end condition here          
        });
};
function getLimeTrayDate(dt, dtTime) {

    //console.log("element.Limetray_Order_Date::::", new Date(dt).toLocaleDateString() + "::::::::::::::element.Limetray_Order_Time::::", dtTime);
    var strDate = dt.split("T");
    var resultDate = dt;
    if (strDate.length > 0) {
        resultDate = strDate[0] + " " + dtTime;
    }
    console.log("Date::", new Date(resultDate));
    return new Date(resultDate);
}
function max_date(all_dates) {
    var max_dt = all_dates[0],
        max_dtObj = new Date(all_dates[0]);
    all_dates.forEach(function (dt, index) {
        if (new Date(dt) > max_dtObj) {
            max_dt = dt;
            max_dtObj = new Date(dt);
        }
    });
    return max_dt;
}


const getItemDetailByLimeTrayId = async (limetrayno, order_details, paradise_food_item) => {

    console.log("LimeTrayNumber for Details::", limetrayno);
    return await new Promise((resolve, reject) => {
        var option = {
            username: 'LIMETRAY.TEST',
            password: 'paradise@123',
            ntlm_domain: 'PARADISE\LIMETRAY.TEST',
            url: "http://183.82.108.231:1215/UPPLSRVTEST/OData/Company('Paradise_Live')/LimeTraLine?LimeTray_RefNo=" + limetrayno
        };
        console.log("option.url:::", option.url);

        ntlm.get(option, {}, function (err, response) {
            if (err) {
                reject(err);
            }
            if (response != undefined) {
                resolve(response.body);
            } else {
                reject({
                    message: 'could not get limetray item detail Error in connection'
                });
            }
        });
    }).then((data) => {
        console.log("*****************************Entering Data Success of Limetray details::");
        // data.value = JSON.parse(JSON.stringify(data.value).replace(/\\n/g, " ")
        //     .replace(/\\'/g, "\\'")
        //     .replace(/\\"/g, '\\"')
        //     .replace(/\\&/g, "\\&")
        //     .replace(/\\r/g, "")
        //     .replace(/\\t/g, "\\t")
        //     .replace(/\\b/g, "\\b")
        //     .replace(/\\f/g, "\\f")
        //     .replace(/\\r\\n/g, " "));
        // data.value = JSON.parse(JSON.stringify(data.value).replace(/\\n/g, " ")
        //     .replace(/\\'/g, "\\'")
        //     .replace(/\\"/g, '\\"')
        //     .replace(/\\&/g, "\\&")
        //     .replace(/\\r/g, "")
        //     .replace(/\\t/g, "\\t")
        //     .replace(/\\b/g, "\\b")
        //     .replace(/\\f/g, "\\f")
        //     .replace(/\\r\\n/g, " "));




        //data.value.forEach(element => {

        dummydata.tempdata3.forEach(element => {

            console.log("Details loop*************************", element.LimeTray_Ref_No + "  " + limetrayno);
            if (element.LimeTray_Ref_No == limetrayno) {
                console.log("Details loop Sucess*************************", element.LimeTray_Ref_No + "  " + limetrayno);
                //console.log(JSON.parse(paradise_food_item));
                element.items.forEach((el1) => {

                    if (el1.Item_No != 'PACKAGING' && el1.Item_No != '') {
                        var tempItemName = el1.Item_Description;
                        var tempItem = el1.Item_No;
                        console.log("items::", el1.Item_No);
                        JSON.parse(paradise_food_item).forEach(paradise_item => {
                            if (paradise_item.paradise_item_id == tempItem) { // replacing paradise item id with frshly food item id
                                order_details.items.push({
                                    itemId: paradise_item.id,
                                    restaurant_id:paradise_item.restaurant_id,
                                    itemName: tempItemName,//.substring(0, 5),// .replace(/\\n/, ""),
                                    UnitPrice: el1.Item_Unit_Amt,
                                    Quantity: el1.Quantity,
                                    GST: ''
                                })
                            }
                        })
                    }
                })





                //tempItemName = JSON.stringify(tempItemName);


                //  tempItemName = tempItemName.replace(/(\r?\n|\r)/gm, '').trim();
                // tempItemName = tempItemName.replace(/(\r\n|\n|\r)/gm, '').trim();
                //  tempItemName = tempItemName.replace(/[^\x20-\x7E]/gmi, '').trim();


                //  var temp = "\"Veg Family Pack (Serves\
                //3)\""

                // tempItemName = tempItemName.replace(/[\r\n]+\s*/gmi, '').trim();

                // console.log(element.Item_Description+" :: "+tempItemName)

            }

        })

        // console.log(JSON.stringify(order_details))
        var details = { "VendorName": "zomato", "VendorOrderNumber": 1234, "LimeTrayOrderNumber": 1223, "ParadiseOrderNumber": 1256, "CustomerDetails": { "Customer Name": "Arun", "CustomerAddress": "#106 1nd street jp nagar, Chennai", "PhoneNumber": "8874562310" }, "items": [{ "itemId": 15086, "itemName": "Veg Fried Rice", "UnitPrice": "155.00", "GST%": "5%", "Quantity": "2" }, { "itemId": 15089, "itemName": "Egg Biriyani", "UnitPrice": "130.00", "GST%": "5%", "Quantity": "1" }, { "itemId": 15091, "itemName": "Gee Rice", "UnitPrice": "119.00", "GST%": "5%", "Quantity": "1" }], "OrderDateTime": "2019-06-17 15:30", "PaymentMode": "Card", "SecretCode": "3333" };
        var url = outlet_url + '/ParadiseApp/createOrder';

        request({
            url: url,
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: order_details,
            //timeout: 5000,
            json: true
        }, function (error, response, data) {

            if (error || (response && response.statusCode != 200)) {

                console.log(error);
                return;
            }
            //console.log("data", data)
        });

    }).catch((e) => {
        console.log(e);
    })
};



const CheckParadisePurchaseOrder = () => {
    redisClient.lrange(helper.pending_delivery_queue, 0, -1, function (err, pendindDetails) {
        if (err) {
            console.log("Error reading Pending Order Queue");
            return;
        }
        else {
            CheckParadisePendingItemStatus(pendindDetails);
        }
    });


}


async function CheckParadisePendingItemStatus(pendindDetails) {
    console.log("Checking for PO Creation::::CheckParadisePendingItemStatus::")
    for (var i = 0; i < pendindDetails.length; i++) {

        debugger;

        var tempOrderData = JSON.parse(pendindDetails[i]);


        if (tempOrderData.status == 'K') {

            debugger;

            if (tempOrderData.isPOGenerated == undefined) {

                //console.log("Checking for PO Creation::::",item)
                tempOrderData.items.forEach((item) => {

                    var result = item.Quantity - item.lockedQty;
                    if (result > 0) {
                        var po_data = {
                            "data": [{
                                "food_item_id": item.itemId,
                                "qty": result
                            }],
                            "outlet_id": process.env.OUTLET_ID,
                            "restaurant_id": item.restaurant_id,
                            "menu_band_id": -1,
                            "target_ts": new Date()
                        };

                        console.log("PO_CREATION DATA::::", po_data)


                        var paradise_create_po_url = process.env.HQ_URL + '/fv_Preprinted/paradise_create_po'
                        tempOrderData.isPOGenerated = true;
                        redisClient.lset(helper.pending_delivery_queue, i, JSON.stringify(tempOrderData), function (err, res) {
                            if (err) {

                                console.log("Error CheckParadisePendingItemStatus");
                                return;
                            }
                            else {
                                var data = {};
                                request({
                                    url: paradise_create_po_url,
                                    method: "POST",
                                    headers: {
                                        "content-type": "application/json",
                                    },
                                    body: po_data,
                                    timeout: 8000,
                                    json: true
                                }, function (error, response, data) {
                                    if (error || (response && response.statusCode != 200)) {
                                        console.log(error);
                                        return;
                                    }
                                    console.log();

                                });
                                console.log("CheckParadisePendingItemStatus Success");
                            }
                        });


                    }
                })
            }

        }

    }
}

module.exports = { CheckParadiseOrder, router, GetParadiseFoodItemList, GetParadiseOrderItemDetail, CheckParadisePurchaseOrder }