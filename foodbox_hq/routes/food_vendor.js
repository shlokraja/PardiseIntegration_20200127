/*global console require module*/
'use strict';

var express = require('express');
var router = express.Router();
var async = require('async');
var debug = require('debug')('Foodbox-HQ:server');
var format = require('string-format');
var pg = require('pg');
var nodemailer = require('nodemailer');
var moment = require('moment');

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
router.get('/po_data/:rest_id', function(req, res, next) {
  pg.connect(conString, function(err, client, done) {
    var rest_id = req.params.rest_id;
    if(err) {
      handleError(client, done, res, 'error fetching client from pool' + err);
      return;
    }
    async.parallel({
      po_master: function(callback) {
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
            and p.restaurant_id=$1', [rest_id], function(query_err, result) {
          if(query_err) {
            callback('error running query' + query_err, null);
            return;
          }
          // releasing the connection
          done();
          callback(null, result.rows);
        });
      },
      po_batch: function(callback) {
        client.query('SELECT purchase_order_id, pb.id as batch_id, barcode, quantity, \
          delivery_time FROM purchase_order p, purchase_order_batch pb \
          WHERE p.id=pb.purchase_order_id and p.green_signal_time::date=now()::date \
            and p.restaurant_id=$1', [rest_id], function(query_err, result) {
          if(query_err) {
            callback('error running query' + query_err, null);
            return;
          }
          // releasing the connection
          done();
          callback(null, result.rows);
        });
      }
    },
    function(err, results) {
      if (err) {
        handleError(client, done, res, err);
        return;
      }
      // iterate the po_master loop and create a dictionary with
      // po_id as the key and item_id, total_qty as the value
      // Set the packed attribute to 0
      var po_item_data = {};
      for (var i = 0; i < results.po_master.length; i++) {
        var row = results.po_master[i];
        if (po_item_data.hasOwnProperty(row.purchase_order_id)) {
          po_item_data[row.purchase_order_id].push({"food_item_id": row.food_item_id,
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
              "current_packed_qty": 0});
        } else {
          po_item_data[row.purchase_order_id] = [{"food_item_id": row.food_item_id,
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
              "current_packed_qty": 0}];
        }
      }

      // then iterate the po_batch list and update the dictionary with
      // po_id and the packed attribute of that. Need to update that.
      for (var i = 0; i < results.po_batch.length; i++) {
        var row = results.po_batch[i];
        var food_item_id = getItemId(row.barcode);
        for (var j = 0; j < po_item_data[row.purchase_order_id].length; j++) {
          if (food_item_id == po_item_data[row.purchase_order_id][j]["food_item_id"]) {
            po_item_data[row.purchase_order_id][j]["packed_qty"] += row.quantity;
          }
        }
      }
      res.send({data: po_item_data});
    });
  });
});

router.post('/new_batch', function(req, res, next) {
  var data = req.body.data;
  debug("Data for new batch is- ", data);

  config.query('SELECT max(id) as batch_id \
      FROM purchase_order_batch',
      [],
  function(err, result) {
    if (err) {
      return handleErrorNew(err, result);
    }
    for (var i = 0; i < data.length; i++) {
      (function(i){
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
              [batch_id+1+i, po_id, barcodes[barcode], barcode],
            function(query_err2, query_res2) {
            if (query_err2) {
              handleErrorNew(query_err2, query_res2)
              return;
            }
          });
        }

        config.query('INSERT into transporter_log \
          VALUES($1, $2, $3)',
        [po_id, batch_id+1+i, req.body.signature],
        function(query_err2, query_res2) {
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

router.get('/supply_list/:id', function(req, res, next) {
  var restaurant_id = req.params.id;
  pg.connect(conString, function(err, client, done) {
    if(err) {
      handleError(client, done, res, 'error fetching client from pool' + err);
      return;
    }
    async.parallel({
      main_query: function(callback) {
        client.query('SELECT id, name, image_url FROM food_item f, supplies_master_list s\
          WHERE f.id=s.food_item_id AND s.restaurant_id=$1',
          [restaurant_id],
          function(query_err, result) {
          if(query_err) {
            callback('error running query' + query_err, null);
            return;
          }

          // releasing the connection
          done();
          callback(null, result.rows);
        });
      },
      check: function(callback) {
        client.query('SELECT count(food_item_id) FROM supplies \
          WHERE food_item_id in \
            (select food_item_id from supplies_master_list \
              where restaurant_id=$1) \
          AND time::date=now()::date',
          [restaurant_id],
          function(query_err, result) {
          if(query_err) {
            callback('error running query' + query_err, null);
            return;
          }

          // releasing the connection
          done();
          callback(null, result.rows[0].count);
        });
      }
    },
    function(err, results) {
      if (err) {
        handleError(client, done, res, err);
        return;
      }
      if (results.check == 0) {
        res.send([]);
        return;
      }
      res.send(results.main_query);
    });
  });
});

router.get('/config/:restaurant_id', function(req, res, next) {
  var restaurant_id = req.params.restaurant_id;
  pg.connect(conString, function(err, client, done) {
    if(err) {
      handleError(client, done, res, 'error fetching client from pool' + err);
      return;
    }

    client.query('SELECT * FROM restaurant_config \
      WHERE restaurant_id=$1', [restaurant_id], function(query_err, result) {
      if(query_err) {
        handleError(client, done, res, 'error running query' + query_err);
        return;
      }

      // releasing the connection
      done();
      res.send(result.rows[0]);
    });
  });
});

router.post('/send_mail', function(req, res, next) {
  var target = req.body.mail_address;
  var subject = req.body.subject;
  var body = req.body.body;

  var mailOptions = {
    from: 'no-reply@atchayam.in', // sender address
    to: target, // list of receivers
    subject: subject, // Subject line
    text: body, // plaintext body
    html: body
  };
  debug("Sending mail content as {}".format(body));

  transporter.sendMail(mailOptions, function(error, info){
    if(error){
        console.log(error);
        return res.status(500).send(error);
    }
    debug('Message sent: ' + info.response);
    res.send("success");
  });
});

// Some utility functions
var handleError = function(client, done, res, msg) {
  done(client);
  console.error(msg);
  res.status(500).send(msg);
};

var handleErrorNew = function(err, res) {
  console.error(err);
  res.status(500).send(err);
  return;
}

function getItemId(barcode) {
 return parseInt(barcode.substr(8, 4),36);
}

// Function created for offline data push
router.post('/new_batches', function (req, res, next) {
    try {
        //console.log(req.body.batch);
        var decodeBatches = new Buffer(req.body.batch, 'base64').toString("ascii");
        // console.log(decodeBatches);
        var batch = JSON.parse(decodeBatches);
        // console.log("Data for new batch is- ", batch);

        config.query('SELECT max(id) as batch_id \
      FROM purchase_order_batch',
      [],
  function (err, result) {
      if (err) {
          //console.log("errr",err);
          return handleErrorNew(err, result);
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
                    handleErrorNew(query_err2, query_res2)
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
                handleErrorNew(query_err2, query_res2)
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
router.get('/get_data_matrix/:outlet_id', function (req, res, next) {
  var outlet_id = req.params.outlet_id;
console.log("Get Data Matrix  outlet id:",outlet_id);
  var current_date = moment(new Date()).format('DDMMYYYY');
  // var current_date = '03072019';
  
  console.log("************HQ outlet_id received from staff_roster method " + outlet_id);
console.log("current_date:",current_date);
  pg.connect(conString, function (err, client, done) {
    if (err) {
	console.log("Error:",err);

      handleError(client, done, res, 'error fetching client from pool' + err);
      return;
    }


    client.query('select data_matrix_code,barcode from po_preprinted_code where barcode like $2 and trim(leading '+"'0'"+' from substring(barcode from 3 for 3)) = $1', [outlet_id,'%'+current_date+'%'], function (query_err, result) {
      if (query_err) {
	console.log("Error:",query_err);
        handleError(client, done, res, 'error running query' + query_err);
        return;
      }
      
      if (result <= 0) {
        console.log("************ NO data returned from po_preprinted_code*************888");
        return;
      }

      // releasing the connection
      done(); console.log("************ data returned from po_preprinted_code***************8");
      res.send(result.rows);
    });
  });
});
router.get('/pod_data/Dummy/', function(req, res, next) {
res.send("Success");
});
router.get('/po_data/Paradise/:rest_id', function(req, res, next) {
  pg.connect(conString, function(err, client, done) {
    var rest_id = req.params.rest_id;
    if(err) {
      handleError(client, done, res, 'error fetching client from pool' + err);
      return;
    }
    async.parallel({
      po_master: function(callback) {
        client.query("SELECT purchase_order_id, food_item_id, pm.quantity, \
green_signal_time, scheduled_delivery_time, r.phone_no, f.name, \
f.veg, f.ingredients1a, f.ingredients1b, f.ingredients2, \
f.ingredients3, f.side_order, f.master_id, \
r.short_name as vendor_name, o.id as outlet_id, r.start_of_day, \
o.short_name as outlet_name, o.city, \
concat('CH','',LPAD(o.id::text, 3, '0'),r.short_name,lpad(base36_encode(f.id)::text,4,'0'),lpad(date_part('day',now())::text,2,'0'), \
lpad(date_part('month',now())::text,2,'0'),date_part('year',now()), \
lpad(date_part('hour',now())::text,2,'0') ,lpad(date_part('minutes',now())::text,2,'0')) as barcode , \
coalesce(ppp.scannedcount,0) scannedcount, \
'http://192.168.0.114:8008/images/'||f.master_id||'/1.png' as image_url \
FROM purchase_order p \
inner join purchase_order_master_list pm on p.id=pm.purchase_order_id \
inner join outlet o on  o.id=p.outlet_id \
inner join restaurant r on r.id=p.restaurant_id \
inner  join food_item f  on pm.food_item_id=f.id \
left join (select substring(pp.barcode,27)::numeric as barcode, base36_decode( substring(pp.barcode,9,4)) as FooditemId,sum(pp.quantity) scannedcount from po_preprinted_code pp \
inner join restaurant r on r.short_name=substring(barcode,6,3) \
where pp.barcode is not null and r.id=$1 \
group by substring(pp.barcode,27)::numeric, base36_decode( substring(pp.barcode,9,4))) ppp on  ppp.barcode =p.id  and ppp.FooditemId=pm.food_item_id \
WHERE p.green_signal_time::date=now()::date and p.restaurant_id=$1", [rest_id], function(query_err, result) {
          if(query_err) {
            callback('error running query' + query_err, null);
            return;
          }
          // releasing the connection
          done();
          callback(null, result.rows);
        });
      },
      po_batch: function(callback) {
        client.query('SELECT purchase_order_id, pb.id as batch_id, barcode, quantity, \
          delivery_time FROM purchase_order p, purchase_order_batch pb \
          WHERE p.id=pb.purchase_order_id and p.green_signal_time::date=now()::date \
            and p.restaurant_id=$1', [rest_id], function(query_err, result) {
          if(query_err) {
            callback('error running query' + query_err, null);
            return;
          }
          // releasing the connection
          done();
          callback(null, result.rows);
        });
      }
    },
    function(err, results) {
      if (err) {
        handleError(client, done, res, err);
        return;
      }
      // iterate the po_master loop and create a dictionary with
      // po_id as the key and item_id, total_qty as the value
      // Set the packed attribute to 0
      var po_item_data = [];
      for (var i = 0; i < results.po_master.length; i++) {
        var row = results.po_master[i];
       console.log("row.ScannedCount:::",row);
          po_item_data.push({"food_item_id": row.food_item_id,
              "item_name": row.name,
	      "purchase_orderId":row.purchase_order_id,
              "veg": row.veg,
              "master_id": row.master_id,
              "ingredients1a": row.ingredients1a,
              "ingredients1b": row.ingredients1b,
              "ingredients2": row.ingredients2,
              "ingredients3": row.ingredients3,
              "side_order": row.side_order,
              "total_qty": row.quantity,
              "packed_qty": row.scannedcount,
              "green_signal_time": row.green_signal_time,
              "scheduled_delivery_time": row.scheduled_delivery_time,
              "outlet_name": row.outlet_name,
              "vendor_name": row.vendor_name,
              "outlet_id": row.outlet_id,
              "start_of_day": row.start_of_day,
              "city": row.city,
              "phone_no": row.phone_no,
              "current_packed_qty": row.scannedcount ,
"image_url":row.image_url,
	      "barcode":row.barcode});
        
      }

      // then iterate the po_batch list and update the dictionary with
      // po_id and the packed attribute of that. Need to update that.
     /* for (var i = 0; i < results.po_batch.length; i++) {
        var row = results.po_batch[i];
        var food_item_id = getItemId(row.barcode);
        for (var j = 0; j < po_item_data[row.purchase_order_id].length; j++) {
          if (food_item_id == po_item_data[row.purchase_order_id][j]["food_item_id"]) {
            po_item_data[row.purchase_order_id][j]["packed_qty"] += row.quantity;
          }
        }
      }*/
// filtering items with scanned count equals quantity planned
 po_item_data= po_item_data.filter(function(obj) {
    return obj.packed_qty!=obj.total_qty;
});
      res.send({result:"ok",data: po_item_data});
    });
  });
});
module.exports = router;
