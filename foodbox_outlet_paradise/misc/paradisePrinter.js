var request = require('requestretry');
var fs = require('fs');
var debug = require('debug')('outlet_app:server');
var cheerio = require('cheerio');
var path = require('path');
var redis = require('redis');
var format = require('string-format');
var toFixed = require('tofixed');
var helper = require('../routes/helper');
var pdf = require('html-pdf');
var outlet_id = process.env.OUTLET_ID;
var randomstring = require('randomstring');
var printer = require('pdf-to-printer');



format.extend(String.prototype);
var redisClient = redis.createClient({ connect_timeout: 2000, retry_max_delay: 5000 });
redisClient.on('error', function (msg) {
    console.error(msg);
});


async function startParadiseBillPrint(data, callback) {


    var orderData = JSON.parse(JSON.stringify(data));


    var paraside_file = path.join(__dirname, '../')
    paraside_file = path.join(paraside_file, 'public/paradise_bill.html')
    console.log("Path::" + paraside_file)
    var html = fs.readFileSync(paraside_file, 'utf8');


    var $ = cheerio.load(html);

    var grandtotal = 0;
    var sgst_percent = 5.47;
    var cgst_percent = 5.47;
    $("#date_time").text("Date: " + orderData.OrderDateTime);
    $("#cust_name").text("Name: " + orderData.VendorName);
    $("#address1").text("Address: " + orderData.CustomerDetails.CustomerAddress);
    for (var i = 0; i < orderData.items.length; i++) {

        var item = orderData.items[i];
        console.log(item)
        grandtotal = grandtotal + item.UnitPrice;

        $("#items tbody").prepend("<tr><td>" + item.itemName + "</td><td>" + item.Quantity + "</td><td>" + item.UnitPrice + "</td></tr>")

    }

    $("#amount_num").text(toFixed(grandtotal, 2));
    $("#netamount_num").text(toFixed(grandtotal, 2));
    //$("invoice_no").text("Invoice No: "+ invNum.next('2018/11/ABC001'));
    grandtotal = grandtotal + sgst_percent + cgst_percent;
    $("#grandtotal").text(toFixed(grandtotal, 2));
    $("#roundedto").text(toFixed(grandtotal, 0));
    $("#deliverycredit").text('-' + toFixed(grandtotal, 0));
    var tempround = grandtotal - toFixed(grandtotal, 0);
    console.log("rounding_num::" + tempround)
    $("#rounding_num").text((toFixed(tempround, 2)).toString());


    var rand_string = randomstring.generate(5);
    console.log("rand_string:: " + rand_string)

    var bill_file = 'bill-' + rand_string + '.pdf';
    var bill_folder = process.env.PARADISE_BILL_FOLDER;
    console.log("bill_folder:: " + bill_folder);
    //callback(null, "Sucess");
    var filename= path.join(bill_folder, bill_file);
    console.log("filename:::::",filename);
    request({
        url: "http://192.168.0.114:8008/paradise_report/GetPdf",
        method: "GET",
        qs: { data: $.html() },
        encoding: null,
    }, function (error, response, data) {
        if (error || (response && response.statusCode != 200)) {
            console.log(error);
            return;
        }
        console.log(response.body);
        fs.writeFileSync(filename, response.body);
	callback(null, "Success");

    });

    // var options = { filename: path.join(bill_folder, bill_file), format: 'Letter' };
    // console.log("Html:::", $.html());
    // pdf.create($.html(), options).toFile(function (err, buffer) {
    //     if (err) return callback(err, null)
    //     console.log(options.filename)
    //     //connectToPrint(options.filename)

    //     callback(null, buffer)

    // });
}


async function connectToPrint(data) {
    console.log("ConnectPrinter::", data)
    const options = {
        printer: "Zebra-Technologies-ZTC-iMZ320"
    };
    printer
        .print(data, options)
        .then(console.log)
        .catch(console.error);

}


module.exports = { startParadiseBillPrint }