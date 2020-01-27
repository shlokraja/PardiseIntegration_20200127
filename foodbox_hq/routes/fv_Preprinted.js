/*global console require module*/
'use strict';

var express = require('express');
var router = express.Router();
var async = require('async');
var debug = require('debug')('Foodbox-HQ:server');
var format = require('string-format');
var pg = require('pg');
var nodemailer = require('nodemailer');

// create reusable transporter object using SMTP transport
var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'no-reply@atchayam.in',
    pass: 'Atchayam123'
  }
});

format.extend(String.prototype);
var config = require('../models/config');
var conString = config.dbConn;

// Handlers for bill related code

// This returns the po data for the given restaurant
router.get('/getRestaurant_data/', function (req, res, next) {
  pg.connect(conString, function (err, client, done) {
    //var rest_id = req.params.rest_id;
    if (err) {
      handleError(client, done, res, 'error fetching client from pool' + err);
      return;
    }


    client.query('SELECT name,id from restaurant where active=true', [], function (query_err, result) {
      if (query_err) {
        //callback('error running query' + result, null);
        res.send({ result: 'nok', data: null, error: query_err });
        return;
      }
      // releasing the connection
      done();
      //callback(null, result.rows);
      res.send({ result: 'ok', data: result.rows, error: false });
    });

    // iterate the po_master loop and create a dictionary with
    // po_id as the key and item_id, total_qty as the value
    // Set the packed attribute to 0


  });

});

router.get('/getOutlet_data/:rest_id', function (req, res, next) {
  pg.connect(conString, function (err, client, done) {
    var rest_id = req.params.rest_id;
    if (err) {
      handleError(client, done, res, 'error fetching client from pool' + err);
      return;
    }

    client.query('select distinct o.id,o.name from outlet o \
        inner join food_item f on f.outlet_id=o.id  \
        inner join restaurant r on r.id=f.restaurant_id \
        where f.restaurant_id=$1 and r.active=true and f.active=true and o.active=true  and f.vending=$2', [rest_id, 'xxx'], function (query_err, result) {
        if (query_err) {
          //callback('error running query' + result, null);
          res.send({ result: 'nok', data: null, error: query_err });
          return;
        }
        // releasing the connection
        done();
        //callback(null, result.rows);
        res.send({ result: 'ok', data: result.rows, error: false });
      });

    // iterate the po_master loop and create a dictionary with
    // po_id as the key and item_id, total_qty as the value
    // Set the packed attribute to 0


  });

});

router.get('/getOutlet_food_data/:rest_id/:outlet_id', function (req, res, next) {
  pg.connect(conString, function (err, client, done) {
    var rest_id = req.params.rest_id;
    var outlet_id = req.params.outlet_id;
    if (err) {
      handleError(client, done, res, 'error fetching client from pool' + err);
      return;
    }
    var foodItemQuery = "select distinct f.id,f.name, \
    concat('CH','',LPAD(o.id::text, 3, '0'),r.short_name,lpad(base36_encode(f.id)::text,4,'0'),lpad(date_part('day',now())::text,2,'0'),lpad(date_part('month',now())::text,2,'0'),date_part('year',now()), \
    lpad(date_part('hour',now())::text,2,'0') ,lpad(date_part('minutes',now())::text,2,'0')) as barcode \
    from outlet o  \
    inner join food_item f on f.outlet_id=o.id  \
    inner join restaurant r on r.id=f.restaurant_id \
    where f.restaurant_id=$1 and r.active=true and f.active=true and o.active=true and f.vending=$2 and o.id=$3";
    console.log("foodItemQuery:", foodItemQuery);
    async.parallel(
      {
        outletData: function (callback) {
          client.query('select distinct o.id,o.name from outlet o \
        inner join food_item f on f.outlet_id=o.id  \
        inner join restaurant r on r.id=f.restaurant_id \
        where f.restaurant_id=$1 and r.active=true and f.active=true and o.active=true  and f.vending=$2 and o.id=$3', [rest_id, 'xxx', outlet_id], function (query_err, result) {
              if (query_err) {
                callback('error running query' + result, null);

                return;
              }
              // releasing the connection
              done();
              callback(null, result.rows);

            })
        },
        fooditem_data: function (callback) {
          client.query(foodItemQuery, [rest_id, 'xxx', outlet_id], function (query_err, result) {
            if (query_err) {
              console.log('query_err:', query_err);
              callback('error running query' + result, null);

              return;
            }
            // releasing the connection
            done();
            callback(null, result.rows);

          })

        }

      }, function (err, results) {
        if (err) {
          done(client);
          res.status(500).send({ result: 'nok', error: err });
          return;
        }
        var data = { result: 'ok', outletData: results.outletData, fooditemData: results.fooditem_data };
        res.send(data);
      });


    // iterate the po_master loop and create a dictionary with
    // po_id as the key and item_id, total_qty as the value
    // Set the packed attribute to 0


  });

});
router.post('/new_batch', function (req, res, next) {
  console.log("new batch call ..........................")
  console.log("new batch call ..........................")
  console.log("new batch call ..........................")
  console.log("new batch call ..........................")
  console.log("new batch call ..........................")
  console.log("new batch", JSON.stringify(req.body))
  var data = req.body.data;
  debug("Data for new batch is- ", data);

  config.query('SELECT max(id) as batch_id \
      FROM purchase_order_batch',
    [],
    function (err, result) {
      if (err) {
        return handleErrorNew(err, result);
      }
      for (var i = 0; i < data.length; i++) {
        (function (i) {
          var po_id = data[i]["po_id"];
          if (po_id == '--') {
            return;
          }
          var packed_qty = data[i]["packed_qty"];
          if (!result.rows[0]["batch_id"]) {
            var batch_id = 0;
          } else {
            var batch_id = result.rows[0]["batch_id"];
          }
          var barcodes = {};
          // Making the unique barcodes in a dict and then inserting their counts
          for (var key in data[i]["barcodes"]) {
            if (barcodes.hasOwnProperty(data[i]["barcodes"][key])) {
              barcodes[data[i]["barcodes"][key]]++;
            } else {
              barcodes[data[i]["barcodes"][key]] = 1;
            }
          }
          for (var barcode in barcodes) {
            config.query('INSERT into purchase_order_batch \
            (id,purchase_order_id,quantity,barcode,delivery_time) \
            VALUES($1, $2, $3, $4, now())',
              [batch_id + 1 + i, po_id, barcodes[barcode], barcode],
              function (query_err2, query_res2) {
                if (query_err2) {
                  handleErrorNew(query_err2, query_res2)
                  return;
                }
              });
          }

          config.query('INSERT into transporter_log \
          VALUES($1, $2, $3)',
            [po_id, batch_id + 1 + i, req.body.signature],
            function (query_err2, query_res2) {
              if (query_err2) {
                handleErrorNew(query_err2, query_res2)
                return;
              }
            });
        })(i);
      }
      res.send('success');
    });
});


router.get('/config/:restaurant_id', function (req, res, next) {
  var restaurant_id = req.params.restaurant_id;
  pg.connect(conString, function (err, client, done) {
    if (err) {
      handleError(client, done, res, 'error fetching client from pool' + err);
      return;
    }

    client.query('SELECT * FROM restaurant_config \
      WHERE restaurant_id=$1', [restaurant_id], function (query_err, result) {
        if (query_err) {
          handleError(client, done, res, 'error running query' + query_err);
          return;
        }

        // releasing the connection
        done();
        res.send(result.rows[0]);
      });
  });
});

router.post('/send_mail', function (req, res, next) {
  var target = req.body.mail_address;
  var subject = req.body.subject;
  var body = req.body.body;

  // var mailOptions = {
  //   from: 'no-reply@atchayam.in', // sender address
  //   to: target, // list of receivers
  //   subject: subject, // Subject line
  //   text: body, // plaintext body
  //   html: body
  // };
  //For testing purpose change to address
  var mailOptions = {
    from: 'no-reply@atchayam.in', // sender address
    to: 'veeresh.digasangi@gofrshly.com', // list of receivers
    subject: subject, // Subject line
    text: body, // plaintext body
    html: body
  };
  debug("Sending mail content as {}".format(body));

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      return res.status(500).send(error);
    }
    debug('Message sent: ' + info.response);
    res.send("success");
  });
});

// Some utility functions
var handleError = function (client, done, res, msg) {
  done(client);
  console.error(msg);
  res.status(500).send({ message: msg });
};

var handleErrorNew = function (err, res) {
  console.error(err);
  res.status(500).send({ message: err });
  return;
}

function getItemId(barcode) {
  return parseInt(barcode.substr(8, 4), 36);
}

// Function created for offline data push
router.post('/new_batches', function (req, res, next) {
  try {
    // console.log("new_batches", JSON.stringify(req.body));
    var decodeBatches = new Buffer(req.body.batch, 'base64').toString("ascii");
    // console.log(decodeBatches);
    var batch = JSON.parse(decodeBatches);
    // console.log("Data for new batch is- ", JSON.stringify(batch));

    config.query('SELECT max(id) as batch_id \
      FROM purchase_order_batch',
      [],
      function (err, result) {
        if (err) {
          return handleErrorNew(err, res);
        }
        //console.log(batch.length);
        for (var m = 0; m < batch.length; m++) {
          //console.log("batch length is- ", batch.length);
          for (var i = 0; i < batch[m].data.length; i++) {
            //console.log("confirmedPOData.data.length is- ", batch[m].data.length);
            (function (i) {
              var po_id = batch[m].data[i]["po_id"];
              if (po_id == '--') {
                return;
              }
              var packed_qty = batch[m].data[i]["packed_qty"];
              if (!result.rows[0]["batch_id"]) {
                var batch_id = 0;
              } else {
                var batch_id = result.rows[0]["batch_id"];
              }
              var barcodes = {};
              // Making the unique barcodes in a dict and then inserting their counts
              for (var key in batch[m].data[i]["barcodes"]) {
                if (barcodes.hasOwnProperty(batch[m].data[i]["barcodes"][key])) {
                  barcodes[batch[m].data[i]["barcodes"][key]]++;
                } else {
                  barcodes[batch[m].data[i]["barcodes"][key]] = 1;
                }
              }
              //console.log("barcode printed");
              for (var barcode in barcodes) {
                //console.log("barcode--",barcode);
                config.query('INSERT into purchase_order_batch \
            (id,purchase_order_id,quantity,barcode,delivery_time) \
            VALUES($1, $2, $3, $4, now())',
                  [batch_id + 1 + i, po_id, barcodes[barcode], barcode],
                  function (query_err2, query_res2) {
                    if (query_err2) {
                      handleErrorNew(query_err2, res)
                      return;
                    }
                  });
              }
              //console.log("inserted query started");
              config.query('INSERT into transporter_log \
          VALUES($1, $2, $3)',
                [po_id, batch_id + 1 + i, batch[m].signature],
                function (query_err2, query_res2) {
                  //console.log("m value:-",m);
                  if (query_err2) {
                    //console.log("errorrrrrrrrrrrrrrrrrrrrrrrrrr-------",query_err2);
                    handleErrorNew(query_err2, res)
                    return;
                  }
                });
            })(i);
          }
        }
        // console.log("sucess");
        res.send('success');
      });
  }
  catch (e) { console.log(e); }
});

router.get('/v2/po_data/:phone_no', function (req, res, next) {
  pg.connect(conString, function (err, client, done) {
    var phone_no = req.params.phone_no;
    if (err) {
      handleError(client, done, res, 'error fetching client from pool' + err);
      return;
    }
    client.query('SELECT id FROM restaurant where phone_no=$1', [phone_no], function (query_err, result) {
      if (query_err) {
        handleErrorNew(query_err, res)
        return;
      } else if (!result.rows || !result.rows.length) {
        handleError(client, done, res, 'data not found');
        return;
      } else {
        var rest_id = result.rows[0].id;
        async.parallel({
          po_master: function (callback) {
            client.query('SELECT purchase_order_id, food_item_id, quantity, \
              green_signal_time, scheduled_delivery_time, r.phone_no, f.name, \
              f.veg, f.ingredients1a, f.ingredients1b, f.ingredients2, \
              f.ingredients3, f.side_order, f.master_id, \
              r.short_name as vendor_name, o.id as outlet_id, r.start_of_day, \
              o.short_name as outlet_name, o.city \
              FROM purchase_order p, purchase_order_master_list pm, \
                outlet o, restaurant r, food_item f \
              WHERE p.id=pm.purchase_order_id \
                and o.id=p.outlet_id and r.id=p.restaurant_id and pm.food_item_id=f.id \
                and p.green_signal_time::date=now()::date \
                and p.restaurant_id=$1 and p.status=\'open\'', [rest_id], function (query_err, result) {
                if (query_err) {
                  callback('error running query' + query_err, null);
                  return;
                }
                callback(null, result.rows);
              });
          },
          po_batch: function (callback) {
            client.query('SELECT purchase_order_id, pb.id as batch_id, barcode, quantity, \
              delivery_time FROM purchase_order p, purchase_order_batch pb \
              WHERE p.id=pb.purchase_order_id and p.green_signal_time::date=now()::date \
                and p.restaurant_id=$1', [rest_id], function (query_err, result) {
                if (query_err) {
                  callback('error running query' + query_err, null);
                  return;
                }
                // console.log("po____batch", JSON.stringify(result.rows));
                callback(null, result.rows);
              });
          }
        },
          function (err, results) {
            done();
            if (err) {
              handleErrorNew(query_err, res)
              return;
            }
            // iterate the po_master loop and create a dictionary with
            // po_id as the key and item_id, total_qty as the value
            // Set the packed attribute to 0
            var po_item_data = {};
            for (var i = 0; i < results.po_master.length; i++) {
              var row = results.po_master[i];
              if (po_item_data.hasOwnProperty(row.purchase_order_id)) {
                po_item_data[row.purchase_order_id].push({
                  "food_item_id": row.food_item_id,
                  "item_name": row.name,
                  "veg": row.veg,
                  "master_id": row.master_id,
                  "ingredients1a": row.ingredients1a,
                  "ingredients1b": row.ingredients1b,
                  "ingredients2": row.ingredients2,
                  "ingredients3": row.ingredients3,
                  "side_order": row.side_order,
                  "total_qty": row.quantity,
                  "packed_qty": 0,
                  "green_signal_time": row.green_signal_time,
                  "scheduled_delivery_time": row.scheduled_delivery_time,
                  "outlet_name": row.outlet_name,
                  "vendor_name": row.vendor_name,
                  "outlet_id": row.outlet_id,
                  "city": row.city,
                  "start_of_day": row.start_of_day,
                  "phone_no": row.phone_no,
                  "current_packed_qty": 0
                });
              } else {
                po_item_data[row.purchase_order_id] = [{
                  "food_item_id": row.food_item_id,
                  "item_name": row.name,
                  "veg": row.veg,
                  "master_id": row.master_id,
                  "ingredients1a": row.ingredients1a,
                  "ingredients1b": row.ingredients1b,
                  "ingredients2": row.ingredients2,
                  "ingredients3": row.ingredients3,
                  "side_order": row.side_order,
                  "total_qty": row.quantity,
                  "packed_qty": 0,
                  "green_signal_time": row.green_signal_time,
                  "scheduled_delivery_time": row.scheduled_delivery_time,
                  "outlet_name": row.outlet_name,
                  "vendor_name": row.vendor_name,
                  "outlet_id": row.outlet_id,
                  "start_of_day": row.start_of_day,
                  "city": row.city,
                  "phone_no": row.phone_no,
                  "current_packed_qty": 0
                }];
              }
            }
            po_item_data = customizeFormat(po_item_data)
            res.status(200).send({ data: po_item_data });
          });

      }
    });

  });
});

router.post('/v2/new_batches', function (req, res, next) {
  try {

    if (req.body && req.body.data) {
      var batch = req.body.data;
      var batch_id = null;

      async.parallel({
        po_batch: function (cb) {
          config.query('SELECT max(id) as batch_id \
          FROM purchase_order_batch',
            [],
            function (err, result) {
              if (err) {
                cb(err)
                return;
              }
              for (var i = 0; i < batch.length; i++) {
                (function (i) {
                  var po_id = batch[i]["po_id"];

                  if (!result.rows || !result.rows.length || !result.rows[0]["batch_id"]) {
                    batch_id = 0;
                  } else {
                    batch_id = result.rows[0]["batch_id"];
                  }
                  var barcodes = {};
                  // Making the unique barcodes in a dict and then inserting their counts
                  for (var key in batch[i]["barcodes"]) {
                    if (barcodes.hasOwnProperty(batch[i]["barcodes"][key])) {
                      barcodes[batch[i]["barcodes"][key]]++;
                    } else {
                      barcodes[batch[i]["barcodes"][key]] = 1;
                    }
                  }
                  for (var barcode in barcodes) {
                    config.query('INSERT into purchase_order_batch \
                  (id,purchase_order_id,quantity,barcode,delivery_time) \
                  VALUES($1, $2, $3, $4, now())',
                      [batch_id + 1 + i, po_id, barcodes[barcode], barcode],
                      function (query_err2, query_res2) {
                        if (query_err2) {
                          cb(query_err2);
                          return;
                        }
                      });
                  }
                })(i);
              }
              return cb(null, true)
            });
        },
        po_status: function (cb) {
          //data can have only one po id
          config.query('update purchase_order set status=$2 where id=$1',
            [batch[0]["po_id"], 'transported'],
            function (err, result) {
              if (err) {
                cb(err)
                return;
              } else
                cb(null, true);
              return;
            })
        }
      }, function (er, result) {
        if (er) {
          handleErrorNew(er, res)
        } else
          res.status(200).send({ message: 'success' });
      })
    } else
      res.status(404).send({ message: "input data missing" });
  }
  catch (e) {
    console.log(e);
    handleErrorNew(e, res)
  }
});

function customizeFormat(data) {
  var pos = [];
  try {
    for (var key in data) {
      var obj = {};
      obj.po_id = key;
      obj.outlet_name = data[key][0]['outlet_name'];
      obj.vendor_name = data[key][0]['vendor_name'];
      obj.time = new Date(data[key][0]['scheduled_delivery_time']);
      // obj.time = date.getHours() + ":" + date.getMinutes();
      obj.item = data[key];

      pos.push(obj)
    }
  } catch (e) {
    console.log(e);
  }
  return pos;
}


router.post('/new_preprint_batch', function (req, res) {
  var data_batch = req.body.data;

  if (data_batch != undefined) {
    console.log("*********Data*********", data_batch)
    config.query('SELECT max(batch_id) as batch_id \
          FROM po_preprinted_code', [], function (err, result) {
        if (err) {
          return handleErrorNew(err, result);
        }

        var batch_id = 1;
        if (result.rows[0]["batch_id"]) {
          batch_id = result.rows[0]["batch_id"];
        }

        data_batch.forEach(barcodes => {

          config.query('INSERT into po_preprinted_code\
        (batch_id,data_matrix_code, barcode, quantity) \
          VALUES($1, $2, $3, $4)', [batch_id + 1, barcodes.matrix_code,
            barcodes.barcode, 1], function (query_err2, query_res2) {
              if (query_err2) {
                handleErrorNew(query_err2, query_res2)
                return;
              }
            });
        });

        var result = {
          result: "success",
          error: false,
          error_msg: ""
        }

        res.send(result)

      });
  } else {
    res.send("error:no data found")
  }

});



router.post('/paradise_create_po', function (req, res, next) {
  console.log("request+++++++++++", req.body)
  var outlet_id = req.body.outlet_id;
  var restaurant_id = req.body.restaurant_id;
  var menu_band_id = req.body.menu_band_id;
  var target_ts = req.body.target_ts;



  var data = req.body.data;
  console.log("Emergency po creation");
  pg.connect(conString, function (err, client, done) {
    if (err) {
      handleError(client, done, res, 'error fetching client from pool' + err);
      return;
    }

    client.query('INSERT INTO purchase_order \
        (outlet_id, restaurant_id, volume_forecast_id, green_signal_time, scheduled_delivery_time,status) \
        VALUES ($1, $2, $3, now(), $4, $5) \
        RETURNING id',
      [outlet_id, restaurant_id, menu_band_id, target_ts, 'po_generated'],
      function (query_err, result) {
        if (query_err) {
          handleError(client, done, res, 'error running query' + query_err);
          return;
        }
        // Getting the purchase order id
        var purchase_order_id = result.rows[0].id;

        // Inserting the po data
        data.map(function (row) {
          client.query('INSERT INTO purchase_order_master_list \
          VALUES ($1, $2, $3)',
            [purchase_order_id, row.food_item_id, row.qty],
            function (query_err, result) {
              if (query_err) {
                handleError(client, done, res, 'error running query' + query_err);
                return;
              }
              done();
		
            });
        });
	res.send('success');
      });
  });

});



// router.post("/CreateParadiseItem", function (req, res) {

//   var item_name = req.body.item_name;
//   var item_price = req.body.item_price;
//   var item_id = req.body.item_id;


//   console.log(req.body)


//   pg.connect(conString, function (err, client, done) {

//     if (err) {
//       handleError(client, done, res, 'error fetching client from pool' + err);
//       return;
//     }

//     req.body.forEach((item) => {
//       config.query("insert into food_item values (nextval('food_item_id_seq'::regclass),'" + item.itemName + "','CUD17', \
//   98,35,'5h','','"+ item.itemName + "','','','',TRUE,TRUE,'dispenser','South Indian','staple',0,0,0," + item.UnitPrice + "," + item.UnitPrice + ",0,0,15.238,137.142, \
//   2802,NULL,TRUE,FALSE,0,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,2.5,2.5,TRUE,2,'xxx',0,'" + item.itemId + "');", [],
//         function (err, result) {
//           if (err) {
//             console.log("Error while inserting in Vendor master ", err);

//             return;
//           }
//           console.log('inserted successfully');
//         })

//     })

//   })

//   res.status(200).send('inserted successfully');
// })

/// pOsting paradise Order information

router.post("/PostOrder", function (req, res, next) {


  var data = req.body;
  console.log("PostOrder::::", data);

  if (data.unique_Random_Id != undefined) { //Updating the status of Vendor bill details 
    console.log("Unique Random Id:",data.unique_Random_Id);
    config.query("Update VendorBillMaster set unique_Random_Id=$1,delivereddateTime=now(),bill_no=$3 where VendorOrderNumber=$2", [data.unique_Random_Id, data.VendorOrderNumber,data.bill_no],
      function (err, result) {
        if (err) {
          console.log("Error while inserting in Vendor master ", err);
          return;
        }
        res.status(200).send(result);
      }
    )
  }
  else
  {
  //console.log("data:",data.CustomerDetails);

  if(data.OrderDateTime == '') {

     data.OrderDateTime = null;
  }

  config.query("Insert into VendorBillMaster(VendorName,VendorOrderNumber,LimeTrayOrderNumber,ParadiseOrderNumber,CustomerName,CustomerAddress,PhoneNumber, \
    OrderDateTime,PaymentMode) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning vendormasterid",
    [data.VendorName, data.VendorOrderNumber, data.LimeTrayOrderNumber, data.ParadiseOrderNumber, data.CustomerDetails.CustomerName, data.CustomerDetails.CustomerAddress, data.CustomerDetails.PhoneNumber, data.OrderDateTime, data.PaymentMode],
    function (err, result) {
      if (err) {
        console.log("Error while inserting in Vendor master ", err);
        return;
      }

      console.log("Success", result);//.rows[0]["vendormasterid"]
if(result!=undefined)
{
      var vendId = result.rows[0]["vendormasterid"];
      console.log("vendor id:", vendId);
      data.items.forEach(e => {
        config.query("Insert into VendorBillDetails(VendorMasterId,itemid,itemname,unitprice,cgst,sgst,quantity) values($1,$2,$3,$4,$5,$6,$7)", [vendId, e.itemId, e.itemName, e.UnitPrice, 2.5, 2.5, e.Quantity], function (err, resDet) {
          if (err) {
            console.log("Error while inserting in Vendor master ", err);
            return;
          }
          console.log("vendor bill details inserted !!!!!!!");

        }
        );
	

      });
}
      res.status(200).send(result);
    })
  }
});
module.exports = router;
