'use strict'

var express = require('express');
var router = express.Router();
var path = require('path');
var moment = require('moment');
var async = require('async');
var pg = require('pg');
var config = require('../models/config');
var conString = config.dbConn;


router.get('/', function (req, res, next) {

    pg.connect(conString, function (err, client, done) {
        if (err) {
            handleError(client, done, res, 'error fetching client from pool' + err);
            return;
        }


        config.query('select name,id from outlet where active=\'true\'',
            [],
            function (err, results) {
                if (err) {
                    callback('error running query' + err, null);
                    return;
                }
                var context = {
                    title: '',
                    outlets: results.rows
                };
                done();
                res.render('paradise_detail_report', context);
            });
    });


});


router.get('/get_orderdetailed_report/:fromDate/:toDate/:report_type/:status', function (req, res) {
    var outlet_id = 35;
    pg.connect(conString, function (err, client, done) {
        if (err) {
            handleError(client, done, res, 'error fetching client from pool' + err);
            return;
        }
        var query_report = "";
        if (req.params.report_type == "VendorWise") {

            query_report = "(select vm.vendorname,to_char(delivereddatetime,'dd-mm-yyyy') as Date,sum(quantity) as quantity, \
            sum(vb.unitprice*vb.quantity) as Amount from vendorbillmaster vm join vendorbilldetails vb \
            on vm.vendormasterid = vb.vendormasterid \
            where orderdatetime::date between $1 and $2 and outlet_id=$3 and delivereddatetime is not null \
            group by to_char(delivereddatetime,'dd-mm-yyyy'),vm.vendorname order by vm.vendorname) \
            UNION ALL \
            (select '','Grand Total',sum(quantity) as quantity, \
            sum(vb.unitprice*vb.quantity) as Amount from vendorbillmaster vm join vendorbilldetails vb \
            on vm.vendormasterid = vb.vendormasterid \
            where orderdatetime::date between $1 and $2 and outlet_id=$3 and delivereddatetime is not null )";
        } else if(req.params.report_type == "ItemWise"){
            
            query_report = "(select itemname,to_char(delivereddatetime,'dd-mm-yyyy') as Date ,sum(quantity) as quantity,sum(vb.unitprice*vb.quantity) as Amount \
            from vendorbillmaster vm join vendorbilldetails vb \
            on vm.vendormasterid = vb.vendormasterid \
            where orderdatetime::date between $1 and $2 and outlet_id=$3 and delivereddatetime is not null \
            group by itemname,to_char(delivereddatetime,'dd-mm-yyyy') order by itemname) \
            UNION ALL \
            (select '','Grand Total',sum(quantity) as quantity,sum(vb.unitprice*vb.quantity) as Amount \
            from vendorbillmaster vm join vendorbilldetails vb \
            on vm.vendormasterid = vb.vendormasterid \
            where orderdatetime::date between $1 and $2 and outlet_id=$3 and delivereddatetime is not null)";

        }else {
            var status = 'is not null';
            
            if((req.params.status != undefined) && req.params.status == 'Pending'){
                status = 'is null'
               
            }
            if((req.params.status != undefined) && req.params.status == 'All'){
                query_report = "(select to_char(orderdatetime,'dd-mm-yyyy') as Date,limetrayordernumber,\
                itemname,unitprice,quantity,unitprice*quantity as Total, case when delivereddatetime is null then 'Pending' else 'Delivered' end as Status,\
                CASE WHEN delivereddatetime is NULL THEN 'No Date Found' else SUBSTRING(delivereddatetime::text,1,16) end as DeliveredTime from vendorbillmaster vm join\
                vendorbilldetails vd \
                on vm.vendormasterid = vd.vendormasterid where orderdatetime::date between $1 and $2 and outlet_id=$3 ) UNION ALL\
                (select '','', 'Grand Total',0,sum(quantity),sum(unitprice*quantity) as Total,'','' from vendorbillmaster vm join vendorbilldetails vd \
                on vm.vendormasterid = vd.vendormasterid where orderdatetime::date between $1 and $2 and outlet_id=$3 )";

            } else if((req.params.status != undefined) && (req.params.status == 'Pending' || req.params.status == 'Delivered')) {
                query_report = "(select to_char(orderdatetime,'dd-mm-yyyy') as Date,limetrayordernumber, \
                itemname,unitprice,quantity,unitprice*quantity as Total,'"+ req.params.status +"' as Status, \
                case when delivereddatetime is null then 'No Date Found' else SUBSTRING(delivereddatetime::text,1,16) end as DeliveredTime from vendorbillmaster vm join vendorbilldetails vd \
                on vm.vendormasterid = vd.vendormasterid where orderdatetime::date between $1 and $2 and outlet_id=$3 \
                and delivereddatetime "+ status +
                ") UNION ALL \
                (select '','', 'Grand Total',0,sum(quantity),sum(unitprice*quantity) as Total,'','' from vendorbillmaster vm join vendorbilldetails vd \
                on vm.vendormasterid = vd.vendormasterid where orderdatetime::date between $1 and $2 and outlet_id=$3 and delivereddatetime " +status+ ")";
            }
            
            //console.log(query_report);
        }


        client.query(query_report,
            [req.params.fromDate,req.params.toDate,outlet_id], function (query_err, result) {
                if (query_err) {
                    handleError(client, done, res, 'Listing orderdetail summary :: error running query' + query_err);
                    return;
                }
                done();

                console.log(result.rows);
                res.send(result.rows)
            })
    })
});

var handleError = function(client, done, res, msg) {
    done(client);
    console.error(msg);
    res.status(500).send(msg);
  };





module.exports = router;