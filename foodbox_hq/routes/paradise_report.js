'use strict'

var express = require('express');
var router = express.Router();
var path = require('path');
var moment = require('moment');
var async = require('async');
var pg = require('pg');
var config = require('../models/config');
var conString = config.dbConn;
var pdf = require('html-pdf');	


router.get('/GetPdf',function(req,res,next){

console.log(req.query.data);
var options = { filename: path.join("./public/images/", "temp.pdf"), format: 'Letter' };

pdf.create(req.query.data,options).toFile( function(err, resp){
  console.log(resp.filename);
res.sendFile(resp.filename);
});

});

router.get('/', function (req, res, next) {

console.log("Paradise Report:::");
    var context = {

    };

    res.render('paradise_report', context);

});


router.get('/get_orderdetail_summary/:fromDate/:toDate', function (req, res) {
    pg.connect(conString, function (err, client, done) {
        if (err) {
            handleError(client, done, res, 'error fetching client from pool' + err);
            return;
        }

        client.query("with cte as \
        (select to_char(orderdatetime,'dd-mm-yyyy') orderdatetime,delivereddatetime from vendorbillmaster where orderdatetime::date between $1 and $2) \
        select to_char( orderdatetime,'yyyy-mm-dd') as orderdatetime,count(orderdatetime)as order_received, \
                count(orderdatetime) - count(CASE WHEN delivereddatetime IS NULL THEN 1 END) as Dispensed, \
                count(CASE WHEN delivereddatetime IS NULL THEN 1 END) as pending \
                from \
                vendorbillmaster \
                where orderdatetime::date between $1 and $2 \
                group by to_char( orderdatetime,'yyyy-mm-dd') \
                union all \
                select 'Total' as orderdatetime,count(orderdatetime)as order_received, \
                count(orderdatetime) - count(CASE WHEN delivereddatetime IS NULL THEN 1 END) as Dispensed, \
                count(CASE WHEN delivereddatetime IS NULL THEN 1 END) as pending \
                from \
                vendorbillmaster \
                where orderdatetime::date between $1 and $2 \
                union all select \
        'Average' as Average, \
        (select count(orderdatetime) from cte)/(select count(distinct(orderdatetime)) from cte) as avgTotal, \
        (select count(orderdatetime) from cte where delivereddatetime is not null )/(select count(distinct(orderdatetime)) \
        from cte where delivereddatetime is not null) as  avgDispensed, \
        case when (select count(orderdatetime) from cte where delivereddatetime is null ) > 0 \
        then (select count(orderdatetime) from cte where delivereddatetime is null )/(select count(distinct(orderdatetime)) \
        from cte where delivereddatetime is null) else 0 end as avgPending", [req.params.fromDate, req.params.toDate], function (query_err, result) {
                if (query_err) {
                    console.log('Listing orderdetail summary :: error running query' + query_err);
                    res.send(query_err);

                    return
                }
                done();
                console.log(result.rows)

                res.send(result.rows)
            })
    })
});


router.get('/get_orderdetail_report/:toDate', function (req, res) {
    pg.connect(conString, function (err, client, done) {
        if (err) {
            handleError(client, done, res, 'error fetching client from pool' + err);
            return;
        }

        client.query("select delivereddatetime::date as Date,vendorordernumber,itemname,unitprice,quantity,unitprice*quantity as  Total, \
        'Delivered' as Status, delivereddatetime as DeliveredTime from vendorbillmaster vm join vendorbilldetails vd on vm.vendormasterid = vd.vendormasterid \
        where delivereddatetime::date =$1", [req.params.toDate], function (query_err, result) {
                if (query_err) {
                    handleError(client, done, res, 'Listing Outlets :: error running query' + query_err);
                    return;
                }
                done();

                res.send(result.rows)
            })
    })
});




module.exports = router;