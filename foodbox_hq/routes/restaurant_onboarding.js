'use strict';

var express = require('express');
var router = express.Router();
var pg = require('pg');
var format = require('string-format');

format.extend(String.prototype);
var config = require('../models/config');
var conString = config.dbConn;
router.get('/', function(req, res, next) {

  pg.connect(conString, function(err, client, done) {

  if(err) {
    handleError(client, done, res, 'error fetching client from pool' + err);
    return;
  }

  client.query('SELECT * FROM city', function(query_err, result) {
    if(query_err) {
      handleError(client, done, res, 'error running query' + query_err);
      return;
    }

    // releasing the connection
    done();
    var context = { title: 'Foodbox', city: result.rows };
    if (req.query.create) {
      context.restaurant_created = true;
    }
    if (req.query.update) {
      context.restaurant_updated = true;
    }
    res.render('restaurant_onboarding', context);
    });

  });

});


// Download Template for restaurant
router.get('/downloadcsv_template', function (req, res, next) {

    var date = req.query.date;
    var city = req.query.city;

    pg.connect(conString, function (err, client, done) {
        if (err) {
            console.log(client, done, res, 'error fetching client from pool' + err);
            return;
        }

        //  client.query("select '"+ date +"' as Date,city as City,'' as Session,'' as OutletName,'' as RestaurantName,'' as FoodItemName,'' as Quantity,'' as MasterId from vue_food_items_availability_session_whole where city=$1 limit 150",

        client.query("select '" + date + "' as \"Date\",city as \"City\",'' as \"Session\",'' as \"Outlet\",'' as \"Restaurant\",'' as \"ItemName\",'' as \"Quantity\",'' as \"MasterID\" from vue_food_items_availability_session_whole_1 where city=$1 limit 1000",
            [city],
            function (query_err, result) {
                done();
                if (query_err) {
                    handleError(client, done, res, 'error running query' + query_err);
                    return;
                }

                if (result.rows.length > 0) {
                    csvOut(template_reportName, result, res);
                    //  console.log(result);

                    function csvOut(reportName, reportJson, res) {

                        var fields = fields;
                        var data = reportJson.rows;
                        data.push(reportJson);
                        json2csv({ data: data, fields: fields },
                            function (err, csvData) {
                                if (err) {
                                    handleError(res, err);
                                }

                                var rand_string = randomstring.generate(8);
                                var rand_file = '/tmp/report-' + rand_string;
                                fs.writeFile(rand_file, csvData, function (error) {
                                    // if(error){
                                    //   handleError(res, error);
                                    // }
                                    var repo_date = moment(date).format('DD-MM-YYYY');

                                    console.log('template:' + reportName + date + '.csv');
                                    res.attachment(reportName + repo_date + '.csv');
                                    res.sendFile(rand_file);
                                });
                            });
                    }
                } else {
                    res.status(500).send('No data for Selected city')
                }
            });
    });

});

// Some utility functions
var handleError = function(client, done, res, msg) {
  done(client);
  console.error(msg);
  res.status(500).send(msg);
};

var sanitizeInteger = function(str) {
  if (!str) {
    return null;
  }
  return str;
};

module.exports = router;
