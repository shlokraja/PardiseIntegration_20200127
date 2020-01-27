var debug = require('debug')('outlet_app:server');
var format = require('string-format');
var request = require('request');
var helper = require('../routes/helper');
var async = require('async');
var express = require('express');
var router = express.Router();
var internetAvailable = require("internet-available"); /* peerbits, rajesh end*/
var offline_incomming_po = require('../misc/offline_incomming_po');
var _ = require('underscore');
format.extend(String.prototype);
/* peerbits, rajesh*/
var redis = require('redis');
// Initiating the redisClient
var redisClient = redis.createClient({ connect_timeout: 2000, retry_max_delay: 5000 });

var outlet_host = process.env.OUTLET_HOST;
var port = process.env.PORT;
var outlet_url = outlet_host + port;
var food_item_data = {};
getItemDetails();
// inserting order from LimeTray when paradise confirms
router.post('/createOrder', function (req, res) {
    ////console.log('order details', JSON.stringify(req.body));

    console.log('paradise create order called#################')

    redisClient.lpush('PendingOrderQueue', JSON.stringify(req.body), function (err, reply) {
        ////console.log(reply);
        try {
            if (err) {
                res.send(err);
            } else {
                if (reply == "OK") {
                    res.send("order received successfull");
                } else {
                    res.sendStatus(200);
                }

            }
        } catch (e) {
            ////console.log(e)
        }
    });
})

router.get('/getLimeTray',function(req, res) {

   getItemDetail();
   res.send('success')
})

const getItemDetail = async () => {
    try {
        await getLimeTrayDetails()
    } catch (ex) {
        console.log(ex);
    }
}


const getItemDetailByLimeTrayId = async (limetrayno) => {
    return await new Promise((resolve, reject) => {
        var option = {
            username: 'LIMETRAY.TEST',
            password: 'paradise@123',
            ntlm_domain: 'PARADISE\LIMETRAY.TEST',
            url: "http://183.82.108.231:1215/UPPLSRVTEST/OData/Company('Paradise_Live')/LimeTraLine?LimeTray_RefNo=" + limetrayno
        };

        ntlm.get(option, {}, function (err, response) {
            if (err) {
                reject(err);
            }
            if(response.body != undefined){
                resolve(response.body);
            }else {
                reject({
                 message:'could not get limetray item detail Error in connection'   
                });
            }
            
        });
    }).then((data) => {

       
        
    }).catch((e) => {
        console.log(e);
    })
};


const getLimeTrayDetails = async () => {
    return new Promise((resolve, reject) => {
        var opts = {
            username: 'LIMETRAY.TEST',
            password: 'paradise@123',
            ntlm_domain: 'PARADISE\LIMETRAY.TEST',
            url: "http://183.82.108.231:1215/UPPLSRVTEST/OData/Company('Paradise_Live')/LimeOrder"
        };

        ntlm.get(opts, {}, function (err, response) {

            if (err) {
                reject(err);
            }

            resolve(response.body);
        });
    }).then((data) => {
        data.value.forEach(element => {
            

            if (element.Created_in_POS) {

                var dates = [];

               
                
                
                if(element.Limetray_Order_Time && element.Limetray_Order_Date){
                    var date = new Date(element.Limetray_Order_Date);
                    //console.log(date.toLocaleDateString() + ' ' +element.Limetray_Order_Time);
                    var date = new Date(date.toLocaleDateString() + ' ' +element.Limetray_Order_Time)
                    console.log(date);
                    //const dateTime = moment((date.toLocaleDateString() + ' ' +element.Limetray_Order_Time, 'YYYY-MM-DD HH:mm:ss').format();
                    // console.log(dateTime);
                }
                
                // var date = new Date(element.Limetray_Order_Time);
                // console.log(dateTime);
                // const dateTime = moment(date +element.Limetray_Order_Time, 'YYYY-MM-DD HH:mm:ss').format();
                // console.log(dateTime);


                getItemDetailByLimeTrayId(element.LimeTray_Ref_No);
            }

        });
    }).catch((e) => {
        console.log(e);
    })
};



router.post('/OrderConfirm', function (req, res) {

    var orderConfirmDetail = req.body;

    redisClient.lpush('PendingDeliveryQueue', JSON.stringify(req.body), function (err, result) {

        try {
            if (err) {
                res.send(err);
            }

            redisClient.lrange('PendingOrderQueue', 0, -1, function (err, pendindDetails) {

                for (var i = 0; i < pendindDetails.length; i++) {
                    var tempData = JSON.parse(pendindDetails[i]);

                    if (tempData.VendorName == orderConfirmDetail.OrderDetails[0].VendorName && tempData.SecretCode == orderConfirmDetail.OrderDetails[0].SecretCode) {

                        redisClient.lrem('PendingOrderQueue', i, JSON.stringify(tempData), function (err, deletePendingOrder) {
                            ////console.log('deleted order from pending_order_queue::')
                            res.send("orderconfirmed");
                        })

                    }
                }

            })


        } catch (e) {
            ////console.log(e)
        }
    });

});

redisClient.on('error', function (msg) {
    console.error(msg);
});

function CheckParadiseOrder() {
    getItemDetails();
    //   CheckItemExistsInDispenser();
    //  NewCheck();
    CheckAsync();
}
async function CheckAsync() {


    redisClient.lrange('PendingOrderQueue', 0, -1, function (err, pendindDetails) {
        if (err) {
            //console.log("Error reading Pending Order Queue");
            return;
        }
        else {
            first(pendindDetails);

        }
    });


}
async function first(pendindDetails) {
    let result = await AsynFunction(1);;
    //console.log(result);
    console.log(1);

    let result1 = await AsynFunction(2);
    console.log(result1);
    console.log(2);

}
async function fetchQuote() {
    const rsp = await fetch( "https://api.icndb.com/jokes/random" ),
          data = await rsp.json();
    return data.value.joke;
  }
async function AsynFunction(i) {
 let rspp=await request.get (outlet_url + '/order_app/getmenuitems');
 if (rspp.err)
 {
     console.log('error');

 }
 else
 {
     console.log("Data Fetched");
 } 
 return rspp;  





}
function NewCheck() {

    var index = 0;
    redisClient.get(helper.stock_count_node, function (err, reply) {
        if (err) {
            console.error(err);
            ////console.log('No Data found in Stock Count Queue:');
            socket.emit('stock_count', { "error": "error while retreiving from redis- {}".format(err) });
            return;
        }
        var parsed_response = JSON.parse(reply);

        var countItem = 0;
        var stockItemDetails = []
        for (var item_id in parsed_response) {
            var countItem = 0
            var item_node = parsed_response[item_id];
            //console.log(" inside stock count item_id:", item_id);
            for (var i = 0; i < item_node["item_details"].length; i++) {
                countItem = countItem + parseInt(item_node["item_details"][i]["count"]);
            }
            stockItemDetails.push({ "itemId": item_id, "count": countItem });

            //console.log("Itemid:", item_id, " Count:", countItem);
        }
        redisClient.lrange('PendingOrderQueue', 0, -1, function (err, pendindDetails) {
            if (err) {
                //console.log("Error reading Pending Order Queue");
                return;
            }
            else {
                _.forEach(pendindDetails, function (element, item) {


                    //console.log(element)
                    //console.log("element ****************************************************");
                    var itemsDetails = [];
                    var jsonEle = JSON.parse(pendindDetails[item]);
                    jsonEle.Index = item;
                    //console.log(pendindDetails[item])
                    //console.log("element ****************************************************");
                    //console.log("itemitemitemitemitemitemitemitemitemitem:", item);

                    //console.log("itemitemitemitemitemitemitemitemitemitem inside stock:", item);

                    // //console.log("pendindDetails", jsonEle);

                    jsonEle.items.forEach(e2 => {
                        //console.log("e2:", e2);
                        if (e2.locked == undefined) e2.locked = false;
                        if (e2.lockedQty == undefined) e2.lockedQty = 0;
                        if (e2.previousQuantity == undefined) e2.previousQuantity = 0;
                        console.log(e2);
                        itemsDetails.push({ "itemId": e2.itemId, "Quantity": e2.Quantity, "locked": e2.locked, "lockedQty": e2.lockedQty, "previousQuantity": e2.previousQuantity });
                    });
                    //unlock the existing locks

                    var unlockItems = _.filter(itemsDetails, function (item) {
                        return item.locked == true;
                    });


                    //console.log("Inside moveItemsToDispenserQueue:", itemsDetails);

                    var stock_ItemDetails = [];
                    _.forEach(stockItemDetails, function (it, ix) {
                        stock_ItemDetails.push({ "itemId": it.itemId, "count": it.count });
                    })

                    checkItemAvailable(itemsDetails, stock_ItemDetails, jsonEle, function (err, OrderItemDetails, jsonEle) {
                        //console.log("After Checking order items availiability int he stock queue-----", OrderItemDetails);
                        var Sresult = _.countBy(OrderItemDetails, 'blnExists');
                        var result = _.countBy(OrderItemDetails, 'blnExists')["true"];
                        if (Sresult != undefined && result == undefined) {
                            result = 0;
                        }
                        if (result != undefined) {
                            if (result == OrderItemDetails.length) {

                                moveItemsToDispenserQueue(OrderItemDetails, "increase", jsonEle, function (err, itemDetails, jsonEle) {
                                    console.log("deleting queue:", jsonEle);
                                    //remove the order from the pending delivery queue
                                    DeletePendingOrderQueue(jsonEle.Index, JSON.stringify(jsonEle), function (err, result) {
                                        if (result == "Success") {
                                            console.log("Placing order-*-----------------------------------------------", jsonEle);
                                            placeOrder(itemDetails, function (err, message) {
                                                ////console.log(message, ":", jsonEle.LimeTrayOrderNumber);
                                            });
                                            index = index + 1;
                                        }
                                    });

                                });
                            }
                            else {
                                //lock available items
                                //if (jsonEle.status == undefined) {
                                jsonEle.status = "K";
                                //    ////console.log("element:", JSON.stringify(jsonEle), " index:", updateIndex);
                                //filtering order available

                                //for partial quantity push the partial quantity

                                // locking Available items
                                if (OrderItemDetails.length) {
                                    moveItemsToDispenserQueue(OrderItemDetails, 'increase', jsonEle, function (err, itemDetails, jsonEle) {
                                        // mark status for each line items
                                        //console.log("Order:", jsonEle.LimeTrayOrderNumber, " itemDetails:");
                                        itemDetails.forEach(function (item, ix) {
                                            for (let indexx = 0; indexx < jsonEle.items.length; indexx++) {
                                                const element = jsonEle.items[indexx];
                                                //   //console.log("element:", element);
                                                if (element.itemId == item.itemId) {
                                                    element.locked = true;
                                                    element.lockedQty = item.lockedQty;
                                                    console.log("lockedQty:", item.lockedQty, "itemid", item.itemId);
                                                }
                                            }
                                        });

                                        console.log('Pending order queu Update:', jsonEle.Index, " json modified:", JSON.stringify(jsonEle));
                                        jsonEle.LastUpadatedDate = new Date();
                                        redisClient.lset("PendingOrderQueue", jsonEle.Index, JSON.stringify(jsonEle), function (err, res) {
                                            if (err) {
                                                //console.log("Error reading Pending Order Queue");
                                                index = index + 1;
                                                return;
                                            }
                                            else {
                                                //console.log("Succesfully updated the Status of the Order to KOT");
                                                index = index + 1;
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

                });
            }


        });

    });

}
// check
function CheckItemExistsInDispenser() {
    ////console.log("*****************Checking Stock and Order queue***********");



    redisClient.lrange('PendingOrderQueue', 0, -1, function (err, pendindDetails) {
        if (err) {
            //console.log("Error reading Pending Order Queue");
            return;
        }
        else {



            var index = 0;
            pendindDetails.forEach(element => {
                var itemsDetails = [];
                var jsonEle = JSON.parse(element);
                //        ////console.log("pendindDetails", jsonEle);

                jsonEle.items.forEach(e2 => {
                    //   ////console.log("e2:", e2);
                    itemsDetails.push({ "itemId": e2.itemId, "Quantity": e2.Quantity, "locked": e2.locked, "lockedQty": e2.lockedQty });
                });
                //unlock the existing locks

                var unlockItems = _.filter(itemsDetails, function (item) {
                    return item.locked == true;
                });
                //console.log('Before  LimeTrayOrderNumber', jsonEle.LimeTrayOrderNumber);

                moveItemsToDispenserQueue(unlockItems, 'decrease', function (err, itemDetails) {
                    itemsDetails.forEach(e2 => {
                        e2.lockedQty = 0;
                    });

                    ////console.log('Checking for Available items:', jsonEle.LimeTrayOrderNumber);
                    checkItemAvailable(itemsDetails, index, jsonEle, function (err, updateIndex, OrderItemDetails, jsonEle) {
                        ////console.log("After Checking order items availiability int he stock queue-----");
                        var Sresult = _.countBy(OrderItemDetails, 'blnExists');
                        var result = _.countBy(OrderItemDetails, 'blnExists')["true"];
                        if (Sresult == undefined) {
                            result = 0;
                        }
                        ////console.log("Inside result != undefined**************************************", result);
                        if (result != undefined) {
                            if (result == OrderItemDetails.length) {
                                moveItemsToDispenserQueue(OrderItemDetails, "increase", function (err, itemDetails) {
                                    ////console.log("Placing order-*-----------------------------------------------", itemDetails);
                                    //remove the order from the pending delivery queue
                                    DeletePendingOrderQueue(index, JSON.stringify(jsonEle), function (err, result) {
                                        if (result == "Success") {
                                            placeOrder(itemDetails, function (err, message) {
                                                ////console.log(message, ":", jsonEle.LimeTrayOrderNumber);
                                            });
                                            index = index + 1;
                                        }
                                    });

                                });
                            }
                            else {
                                //lock available items
                                //if (jsonEle.status == undefined) {
                                jsonEle.status = "K";
                                //    ////console.log("element:", JSON.stringify(jsonEle), " index:", updateIndex);
                                //filtering order available

                                //for partial quantity push the partial quantity

                                // locking Available items
                                if (OrderItemDetails.length) {
                                    moveItemsToDispenserQueue(OrderItemDetails, 'increase', function (err, itemDetails) {
                                        // mark status for each line items
                                        itemDetails.forEach(function (item, ix) {
                                            for (let indexx = 0; indexx < jsonEle.items.length; indexx++) {
                                                const element = jsonEle.items[indexx];
                                                if (element.itemId == item.itemId) {
                                                    element.locked = true;
                                                    element.lockedQty = item.lockedQty;
                                                }
                                            }
                                        });

                                        ////console.log('Pending order queu Update:', updateIndex);
                                        jsonEle.LastUpadatedDate = new Date();
                                        redisClient.lset("PendingOrderQueue", updateIndex, JSON.stringify(jsonEle), function (err, res) {
                                            if (err) {
                                                ////console.log("Error reading Pending Order Queue");
                                                index = index + 1;
                                                return;
                                            }
                                            else {
                                                ////console.log("Succesfully updated the Status of the Order to KOT");
                                                index = index + 1;
                                            }
                                        });

                                        ////console.log("Available Items locked  for order number", jsonEle.LimeTrayOrderNumber);
                                    });
                                }
                                ////console.log("*************************************Order Items not Available in the Dispenser*******************************", JSON.stringify(OrderItemDetails));
                                // }
                            }
                        }
                        else {
                            ////console.log("*************************************Order Items not Available in the Dispenser*******************************");
                        }
                    });
                });




            });

        }
    });

}
function DeletePendingOrderQueue(index, item, callback) {
    console.log("index:::::::::::::::::::::::::::::::", index);
    redisClient.lset('PendingOrderQueue', index, item, function (err, reply) {
        if (err) {
            return;
        }
        redisClient.lrem('PendingOrderQueue', index, item, function (err, deletePendingOrder) {
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
            console.error('{}: {} {}'.format(outlet_url, error, body));
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

    var jsonString = "{\"order\": {";
    var jsonEndString = "}, \"sides\": {}, \"counter_code\": 2, \"mode\": \"cash\", \"from_counter\": \"false\", \"savings\": 0,\"mobile_num\": \"9894099619\", \"credit_card_no\": \"\",\"cardholder_name\": \"\", \"test_mode\": \"false\", \"unique_Random_Id\": \"" + new Date().toISOString().split('T')[0].replace(/-/g, "") + Math.random().toString(36).substring(2, 5) + Math.random().toString(36).substring(2, 5) + "\", \"countrytype\": \"India\" }";
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

        console.log("Order Placed SucessFully");
        callback(null, "Order Placed SucessFully");
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

function processArray(parsed_response, callback) {
    var itemDetails = [];

    for (var item_id in parsed_response) {
        var countItem = 0
        var item_node = parsed_response[item_id];
        for (var i = 0; i < item_node["item_details"].length; i++) {
            var timestamp = item_node["item_details"][i]["timestamp"];
            var barCode = item_node["item_details"][i]["barcode"];
            countItem = countItem + parseInt(item_node["item_details"][i]["count"]);
        }

        var cntLocked = getLockedCount(item_id + "_locked_count");
        if (cntLocked != NaN) {
            countItem = countItem - cntLocked;
        }


        itemDetails.push({ "itemId": item_id, "count": countItem });
        ////console.log("itemDetails:", itemDetails);
    }
    ////console.log('Done!');
    return callback(null, itemDetails);
}
function checkItemAvailable(OrderItemDetails, itemDetails, jsonEle, callback) {
    //console.log('Inside Checking for Available items:', jsonEle.LimeTrayOrderNumber, "itemDetails:", itemDetails);



    var item_id_list = [];
    itemDetails.forEach(item => {
        item_id_list.push(item.itemId + '_locked_count');
    });

    ////console.log("item_id_list:::", item_id_list, "itemDetails:", itemDetails);
    redisClient.mget(item_id_list, function (l_err, l_reply) {
        itemDetails.forEach(item => {
            console.log("stock item:", item);
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

                    console.log("---------------------True condition-------------------", order, fitem, jsonEle.LimeTrayOrderNumber);
                }
                else {
                    ////console.log("fitem[0].count", fitem[0].count);
                    order.blnExists = false;
                    order.previousQuantity = order.lockedQty;
                    order.lockedQty = fitem[0].count + parseInt(order.lockedQty);//0+3                     
                    console.log("---------------------False condition-------------------", order, fitem, jsonEle.LimeTrayOrderNumber);
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
    //////console.log("*****************************Completed Locking*************************************");


    /*  redisClient.incrby(helper.dispense_id_node, 1, function(d_err, d_reply) {
          if (d_err) {
              callback("error while retreiving from redis- {}".format(d_err), null);
              return;
          }
          //////console.log("******************************d_reply****************:",d_reply);
          //////console.log( parseInt(d_reply) );
      });*/
}

module.exports = { CheckParadiseOrder, router };