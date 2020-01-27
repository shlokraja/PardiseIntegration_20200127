var pg = require('pg');
var Q = require('q')
var lodash = require('lodash')
var json2csv = require('json2csv');
var fs = require('fs');
var async = require('async');
var moment = require('moment');
var debug = require('debug')('Foodbox-HQ:server');
var config = require('../models/config');
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: "no-reply@gofrshly.com",
        pass: 'Atchayam123'
    }
});
var conString = config.dbConn;

function genOverAllReport() {
    pg.connect(conString, function (err, client, done) {
        if (err) {
            done();
            return ({ error: err.message });
        } else {
            var sessions = ["BreakFast", "Early Breakfast", "Lunch", "Lunch1", "Lunch2", "Dinner", "Late Dinner"];
            var report = sessions.map(function (session) {
                var defer = Q.defer();
                letsGetOverallData(client, session, function (err, _data) {
                    if (err) {
                        defer.reject(err);
                    } else {
                        defer.resolve(_data);
                    }
                })
                return defer.promise;
            })
            Q.allSettled(report).then(function (results) {
                var final = results.map(function (result) {
                    if (result.state === "fulfilled") {
                        return result.value;
                    }
                });
                if (final.length) {
                    final = formatData2(final);
                    csv2(final);
                    return (final);
                } else {
                    return ({ message: "Data not found" });
                }
            });
        }
    });
}

function genOutletwiseReport() {
    pg.connect(conString, function (err, client, done) {
        if (err) {
            done();
            return ({ error: err.message });
        } else {
            getOutlets(client).then(function (outlet_ids) {
                var report = outlet_ids.map(function (outlet) {
                    var defer = Q.defer();
                    letsGetDetails(client, outlet.id, outlet.name, function (err, _data) {
                        if (err) {
                            defer.reject(err);
                        } else {
                            // console.log("Outlet: ", _data)
                            // csv(_data)
                            defer.resolve(_data);
                        }
                    })
                    return defer.promise;
                })
                Q.allSettled(report).then(function (results) {
                    var final = results.map(function (result) {
                        if (result.state === "fulfilled") {
                            // console.log(result.value)
                            return result.value;
                        }
                    });
                    if (final.length) {
                        // console.log("Final ", JSON.stringify(final))
                        csv(final);
                        return (final);
                    } else {
                        return ({ message: "Data not found" });
                    }
                });
            }).catch(function (error) {
                return (error)
            })
        }
    });
}


function getOutlets(client) {
    return new Promise(function (resolve, reject) {
        client.query('select id,name from outlet where active=true order by id', [], function (er, res) {
            if (er) {
                reject(er.message || er);
            } else {
                // var test = [{ id: 19 }]
                resolve(res.rows);
                // resolve(test);

            }
        })
    });
}

function letsGetDetails(client, outlet_id, name, callback) {
    try {
        var sessions = ["BreakFast", "Early Breakfast", "Lunch", "Lunch1", "Lunch2", "Dinner", "Late Dinner"];
        //outlet wise data
        var promises = sessions.map(function (session) {
            var defer = Q.defer();
            _details(session, client, outlet_id, name, function (err, resp) {
                if (err) {
                    defer.reject(err);
                } else {
                    defer.resolve(resp);
                }
            })
            return defer.promise;
        })
        Q.allSettled(promises).then(function (results) {
            var final = results.map(function (result) {
                if (result.state === "fulfilled") {
                    // console.log("Res ", result.value)
                    return result.value;
                }
            });
            final = lodash.pull(final, undefined);
            if (final.length) {
                return callback(null, final);
            } else {
                console.log("no data found")
                callback("no data found")
            }
        });
    } catch (e) { }
}

function _details(session, client, outlet_id, name, cb) {
    var current = moment().subtract(1, 'days').format('DD-MM-YYYY');
    async.parallel({
        tot_product_sold_last: function (callback) {
            client.query("select COALESCE(sum(so.quantity), 0) as output from sales_order_items so,sales_order s,menu_bands mb where s.time::time between mb.start_time::time and mb.end_time::time and mb.name=$1 and s.outlet_id=mb.outlet_id and s.time::date between $3::date - integer '7' and $3::date  - integer '7' and s.id=so.sales_order_id and s.outlet_id=$2", [session, outlet_id, current],
                function (query_err, result) {
                    if (query_err) {
                        callback(query_err);
                    } else
                        callback(null, result.rows);
                });
        },
        tot_product_sold: function (callback) {
            client.query("select COALESCE(sum(so.quantity), 0) as output from sales_order_items so,sales_order s,menu_bands mb where s.time::time between mb.start_time::time and mb.end_time::time and mb.name=$1 and s.outlet_id=mb.outlet_id and s.time::date between $3 and $3 and s.id=so.sales_order_id and s.outlet_id=$2", [session, outlet_id, current],
                function (query_err, result) {
                    if (query_err) {
                        callback(query_err);
                    } else {


                        callback(null, result.rows);
                    }
                });
        },
        most_sold_product_last: function (callback) {
            client.query("select so.food_item_id,f.name,COALESCE(sum(so.quantity), 0)as count from             sales_order_items so,sales_order s,menu_bands mb,food_item f where so.food_item_id=f.id and s.time::time between mb.start_time::time and mb.end_time::time and mb.name=$1 and s.outlet_id=mb.outlet_id and s.time::date between $3::date - integer '7' and $3::date-integer '7' and s.id=so.sales_order_id and s.outlet_id=$2 group by so.food_item_id,f.name order by count desc limit 1", [session, outlet_id, current],
                function (query_err, result) {
                    if (query_err) {
                        callback(query_err);
                    } else {
                        callback(null, result.rows);
                    }
                });
        },
        most_sold_product: function (callback) {
            client.query("select so.food_item_id,f.name,COALESCE(sum(so.quantity), 0)as count from             sales_order_items so,sales_order s,menu_bands mb,food_item f where so.food_item_id=f.id and s.time::time between mb.start_time::time and mb.end_time::time and mb.name=$1 and s.outlet_id=mb.outlet_id and s.time::date between $3 and $3 and s.id=so.sales_order_id and s.outlet_id=$2 group by so.food_item_id,f.name order by count desc limit 1", [session, outlet_id, current],
                function (query_err, result) {
                    if (query_err) {
                        callback(query_err);
                    } else {
                        callback(null, result.rows);
                    }
                });
        },
        most_selling_restaurant_volume_last: function (callback) {
            client.query(" select r.id,r.name,COALESCE(sum(so.quantity), 0)as most_sell_count from            sales_order_items so,sales_order s,menu_bands mb,food_item f,restaurant r where s.time::time between mb.start_time::time and mb.end_time::time and mb.name=$1 and s.time::date between $3::date - integer '7' and $3::date  - integer '7' and s.outlet_id=mb.outlet_id and s.id=so.sales_order_id and so.food_item_id=f.id and f.restaurant_id=r.id and  s.outlet_id=$2 group by   so.food_item_id,r.id order by most_sell_count desc limit 1", [session, outlet_id, current],
                function (query_err, result) {
                    if (query_err) {
                        callback(query_err);
                    } else {
                        callback(null, result.rows);
                    }
                });
        },
        most_selling_restaurant_volume: function (callback) {
            client.query(" select r.id,r.name,COALESCE(sum(so.quantity), 0)as most_sell_count from            sales_order_items so,sales_order s,menu_bands mb,food_item f,restaurant r where s.time::time between mb.start_time::time and mb.end_time::time and mb.name=$1 and s.time::date between $3 and $3 and s.outlet_id=mb.outlet_id and s.id=so.sales_order_id and so.food_item_id=f.id and f.restaurant_id=r.id and  s.outlet_id=$2 group by   so.food_item_id,r.id order by most_sell_count desc limit 1", [session, outlet_id, current],
                function (query_err, result) {
                    if (query_err) {
                        callback(query_err);
                    } else {
                        callback(null, result.rows);
                    }
                });
        },
        most_revenue_generating_restaurant_last: function (callback) {
            client.query(" select r.name,COALESCE(sum(sp.amount_collected), 0) as rev from sales_order_payments sp,sales_order_items so,food_item f, restaurant r where sp.sales_order_id in(select so.sales_order_id from sales_order s,menu_bands mb,sales_order_items so where s.time::date between $3::date - integer '7'  and $3::date - integer '7' and s.time::time between mb.start_time::time and mb.end_time::time and mb.name=$1 and s.outlet_id=mb.outlet_id and so.sales_order_id=s.id and s.outlet_id=$2 group by so.sales_order_id) and so.sales_order_id=sp.sales_order_id and so.food_item_id=f.id and f.restaurant_id=r.id group by r.name,so.food_item_id order by rev desc limit 1", [session, outlet_id, current],
                function (query_err, result) {
                    if (query_err) {
                        callback(query_err);
                    } else {
                        callback(null, result.rows);
                    }
                });
        },
        most_revenue_generating_restaurant: function (callback) {
            client.query("select r.name,COALESCE(sum(sp.amount_collected), 0) as rev from sales_order_payments sp,sales_order_items so,food_item f, restaurant r where sp.sales_order_id in(select so.sales_order_id from sales_order s,menu_bands mb,sales_order_items so where s.time::date between $3  and $3 and s.time::time between mb.start_time::time and mb.end_time::time and mb.name=$1 and s.outlet_id=mb.outlet_id and so.sales_order_id=s.id and s.outlet_id=$2 group by so.sales_order_id) and so.sales_order_id=sp.sales_order_id and so.food_item_id=f.id and f.restaurant_id=r.id group by r.name,so.food_item_id order by rev desc limit 1", [session, outlet_id, current],
                function (query_err, result) {
                    if (query_err) {
                        callback(query_err);
                    } else {
                        callback(null, result.rows);
                    }
                });
        },
        total_sales_revenue_last: function (callback) {
            client.query(" select COALESCE(sum(sp.amount_collected), 0)as total_sales_amount from sales_order s,sales_order_payments sp,menu_bands mb where s.time::time between mb.start_time::time and mb.end_time::time and s.time::date between $3::date - integer '7' and $3::date - integer '7' and mb.name=$1 and s.outlet_id=mb.outlet_id and s.id=sp.sales_order_id and s.outlet_id=$2 group by s.outlet_id order by total_sales_amount desc limit 1", [session, outlet_id, current],
                function (query_err, result) {
                    if (query_err) {
                        callback(query_err);
                    } else {
                        callback(null, result.rows);
                    }
                });
        },
        total_sales_revenue: function (callback) {
            client.query("select COALESCE(sum(sp.amount_collected), 0)as total_sales_amount from sales_order s,sales_order_payments sp,menu_bands mb where s.time::time between mb.start_time::time and mb.end_time::time and s.time::date between $3 and $3 and mb.name=$1 and s.outlet_id=mb.outlet_id and s.id=sp.sales_order_id and s.outlet_id=$2 group by s.outlet_id order by total_sales_amount desc limit 1", [session, outlet_id, current],
                function (query_err, result) {
                    if (query_err) {
                        callback(query_err);
                    } else {
                        callback(null, result.rows);
                    }
                });
        }

    }, function (err, results) {
        if (err) {
            console.log(err)
            cb(err)
        } else {
            results.name = name;
            results.session = session;
            results = formatData(results)
            cb(null, results)
        }
    });
}

function formatData(results) {
    try {
        results.tot_product_sold_last = results.tot_product_sold_last[0].output;
        results.tot_product_sold = results.tot_product_sold[0].output;
        results.most_sold_product_last = results.most_sold_product_last[0] ? results.most_sold_product_last[0].name : "nil";
        results.most_sold_product = results.most_sold_product[0] ? results.most_sold_product[0].name : "nil";
        results.most_selling_restaurant_volume_last = results.most_selling_restaurant_volume_last[0] ? results.most_selling_restaurant_volume_last[0].name : "nil";
        results.most_selling_restaurant_volume = results.most_selling_restaurant_volume[0] ? results.most_selling_restaurant_volume[0].name : "nil";
        results.most_revenue_generating_restaurant_last = results.most_revenue_generating_restaurant_last[0] ? results.most_revenue_generating_restaurant_last[0].name : "nil";
        results.most_revenue_generating_restaurant = results.most_revenue_generating_restaurant[0] ? results.most_revenue_generating_restaurant[0].name : "nil";
        results.total_sales_revenue_last = results.total_sales_revenue_last[0] ? results.total_sales_revenue_last[0].total_sales_amount : "nil";
        results.total_sales_revenue = results.total_sales_revenue[0] ? results.total_sales_revenue[0].total_sales_amount : "nil";
    } catch (e) { return results; }
    return results;
}

function formatData2(results) {
    try {
        results.forEach(function (result) {
            result.most_sold_outlet_name_last = result.most_sold_outlet_last[0] ? result.most_sold_outlet_last[0].name : "nil"
            result.most_sold_outlet_amount_last = result.most_sold_outlet_last[0] ? result.most_sold_outlet_last[0].output : 0

            result.most_sold_outlet_name = result.most_sold_outlet[0] ? result.most_sold_outlet[0].name : 'nil'
            result.most_sold_outlet_amount = result.most_sold_outlet[0] ? result.most_sold_outlet[0].output : 0

            result.most_revenue_outlet_name_last = result.most_revenue_outlet_last[0] ? result.most_revenue_outlet_last[0].name : 'nil'
            result.most_revenue_outlet_amount_last = result.most_revenue_outlet_last[0] ? result.most_revenue_outlet_last[0].output : 0

            result.most_revenue_outlet_name = result.most_revenue_outlet[0] ? result.most_revenue_outlet[0].name : 'nill'
            result.most_revenue_outlet_amount = result.most_revenue_outlet[0] ? result.most_revenue_outlet[0].output : 0
        })
    } catch (e) {
        console.log(e)
        return results;
    }
    return results;

}

function csv(reportJson) {
    var data = [];
    for (var i = 1; i < reportJson.length; i++) {
        data = data.concat(reportJson[i]);
    }
    // var current = moment().format('DD-MM-YYYY')
    var current = moment().subtract(1, 'days').format('DD-MM-YYYY')
    var last_week = moment().subtract(8, 'days').format('DD-MM-YYYY')

    var fields = [
        {
            label: 'Outlet',
            value: 'name'
        },
        {
            label: 'Session',
            value: 'session'
        },
        {
            label: 'Total Item Sold(' + last_week + ')',
            value: 'tot_product_sold_last'
        },
        {
            label: 'Total Item Sold(' + current + ')',
            value: 'tot_product_sold'
        },
        {
            label: 'Most Sold Product(' + last_week + ')',
            value: 'most_sold_product_last'
        },
        {
            label: 'Most Sold Product(' + current + ')',
            value: 'most_sold_product'
        },
        {
            label: 'Most Selling Restaurant(' + last_week + ')',
            value: 'most_selling_restaurant_volume_last'
        },
        {
            label: 'Most Selling Restaurant(' + current + ')',
            value: 'most_selling_restaurant_volume'
        },
        {
            label: 'Most Revenue Genrate Restaurant(' + last_week + ')',
            value: 'most_revenue_generating_restaurant_last'
        },
        {
            label: 'Most Revenue Genrate Restaurant(' + current + ')',
            value: 'most_revenue_generating_restaurant'
        },
        {
            label: 'Total Sales Revenue(' + last_week + ')',
            value: 'total_sales_revenue_last'
        },
        {
            label: 'Total Sales Revenue(' + current + ')',
            value: 'total_sales_revenue'
        }
    ]

    setTimeout(() => {
        json2csv({ data: data, fields: fields }, function (err, csvData) {
            if (err) {
                console.log(err);
            }
            var filename = 'report-sbu ' + current + ' and ' + last_week + '.csv';
            var filepath = process.env.BILL_FOLDER + filename;
            fs.writeFile(filepath, csvData, function (error) {
                if (error) {
                    console.log(error);
                } else {
                    console.log(null, filename);
                    //TODO take to mail id from db
                    var mailOptions = {
                        to: 'veeresh.digasangi@gofrshly.com',
                        subject: 'SBU Report of ' + current + ' and ' + last_week,
                        text: "PFA",
                        html: "PFA",
                        attachments: [
                            {   // file on disk as an attachment
                                filename: filename,
                                // path: rand_file,
                                content: fs.createReadStream(filepath)
                            }]
                    };
                    sendMail(mailOptions);
                }
            });
        });
    }, 5000);
}

function csv2(reportJson) {
    var current = moment().subtract(1, 'days').format('DD-MM-YYYY')
    var last_week = moment().subtract(8, 'days').format('DD-MM-YYYY')

    var fields = [
        {
            label: 'Session',
            value: 'session'
        },
        {
            label: 'Most Sold Outlet(' + last_week + ')',
            value: 'most_sold_outlet_name_last'
        },
        {
            label: 'Most Sold Outlet Quantity(' + last_week + ')',
            value: 'most_sold_outlet_amount_last'
        },
        {
            label: 'Most Sold Outlet(' + current + ')',
            value: 'most_sold_outlet_name'
        },
        {
            label: 'Most Sold Outlet Quantity(' + current + ')',
            value: 'most_sold_outlet_amount'
        },


        {
            label: 'Most Revenue Outlet(' + last_week + ')',
            value: 'most_revenue_outlet_name_last'
        },
        {
            label: 'Most Revenue Amount(' + last_week + ')',
            value: 'most_revenue_outlet_amount_last'
        },


        {
            label: 'Most Revenue Outlet(' + current + ')',
            value: 'most_revenue_outlet_name'
        },
        {
            label: 'Most Revenue Amount(' + current + ')',
            value: 'most_revenue_outlet_amount'
        },
    ]

    setTimeout(() => {
        json2csv({ data: reportJson, fields: fields }, function (err, csvData) {
            if (err) {
                console.log(err);
            }
            var filename = 'report-overall-sbu ' + current + ' and ' + last_week + '.csv';
            var filepath = process.env.BILL_FOLDER + filename;
            fs.writeFile(filepath, csvData, function (error) {
                if (error) {
                    console.log(error);
                } else {
                    console.log(null, filename);
                    var mailOptions = {
                        to: 'veeresh.digasangi@gofrshly.com',
                        subject: 'SBU Overl All Report of ' + current + ' and ' + last_week,
                        text: "PFA",
                        html: "PFA",
                        attachments: [
                            {
                                filename: filename,
                                content: fs.createReadStream(filepath)
                            }]
                    };
                    sendMail(mailOptions);
                }
            });
        });
    }, 5000);
}

function letsGetOverallData(client, session, cb) {
    var current = moment().subtract(1, 'days').format('DD-MM-YYYY')
    async.parallel({
        most_sold_outlet_last: function (callback) {
            client.query("select o.name,COALESCE(sum(so.quantity), 0) as output from sales_order_items so,sales_order s,menu_bands mb,outlet o where s.time::time between mb.start_time::time and  mb.end_time::time and mb.name=$1 and s.time::date between $2::date - integer '7' and $2::date - integer '7' and s.outlet_id=mb.outlet_id and s.outlet_id=o.id and s.id=so.sales_order_id group by o.name, s.outlet_id order by output desc limit 1", [session, current],
                function (query_err, result) {
                    if (query_err) {
                        callback(query_err);
                    } else
                        callback(null, result.rows);
                });
        },
        most_sold_outlet: function (callback) {
            client.query("select o.name,COALESCE(sum(so.quantity), 0) as output from sales_order_items so,sales_order s,menu_bands mb,outlet o where s.time::time between mb.start_time::time and  mb.end_time::time and mb.name=$1 and s.time::date between $2::date and $2::date and s.outlet_id=mb.outlet_id and s.outlet_id=o.id and s.id=so.sales_order_id group by o.name, s.outlet_id order by output desc limit 1", [session, current],
                function (query_err, result) {
                    if (query_err) {
                        callback(query_err);
                    } else
                        callback(null, result.rows);
                });
        },
        most_revenue_outlet_last: function (callback) {
            client.query("select o.name,COALESCE(sum(sp.amount_collected), 0) as output from sales_order_payments sp,sales_order s,menu_bands mb,outlet o where s.time::time between mb.start_time::time and mb.end_time::time and mb.name=$1 and s.time::date between $2::date - integer '7' and $2::date - integer '7' and s.outlet_id=mb.outlet_id and s.outlet_id=o.id and s.id=sp.sales_order_id group by o.name, s.outlet_id order by output desc limit 1", [session, current],
                function (query_err, result) {
                    if (query_err) {
                        callback(query_err);
                    } else
                        callback(null, result.rows);
                });
        },
        most_revenue_outlet: function (callback) {
            client.query("select o.name,COALESCE(sum(sp.amount_collected), 0) as output from sales_order_payments sp,sales_order s,menu_bands mb,outlet o where s.time::time between mb.start_time::time and mb.end_time::time and mb.name=$1 and s.time::date between $2 and $2 and s.outlet_id=mb.outlet_id and s.outlet_id=o.id and s.id=sp.sales_order_id group by o.name, s.outlet_id order by output desc limit 1", [session, current],
                function (query_err, result) {
                    if (query_err) {
                        callback(query_err);
                    } else
                        callback(null, result.rows);
                });
        }

    }, function (err, results) {
        if (err) {
            console.log(err)
            cb(err)
        } else {
            results.session = session;
            // console.log("query_res", results)
            cb(null, results)
        }
    });
}

function sendMail(mailOptions) {
    mailOptions.from = "no-reply@gofrshly.com";
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(" sendMail error")
            return new Error(error);
        }
        console.log('Message sent: ' + info.response);
    });
}


module.exports = {
    genOutletwiseReport: genOutletwiseReport,
    genOverAllReport: genOverAllReport
};

