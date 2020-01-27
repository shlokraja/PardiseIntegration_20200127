var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');

var routes = require('./routes/index');
var menu_display = require('./routes/menu_display');
var order_app = require('./routes/order_app');
var plcio = require('./routes/plcio');
var outlet_app = require('./routes/outlet_app');
var beverage_orders = require('./routes/beverage_orders');
var mongoose = require('mongoose');

process.env.NODE_ENV = 'development';
process.env.DEBUG = 'outlet_app:serv=';
process.env.PORT = '8000';
process.env.WEBSOCKET_PORT = "8000";
process.env.FIREBASE_QUEUE = 'https://PB-Dev-Payment.firebaseio.com/queue';
//process.env.FIREBASE_QUEUE = "https://foodbox-queuedemo.firebaseio.com/queue";
//process.env.HQ_URL = 'http://1.23.70.170:8011';
//process.env.HQ_URL = 'http://192.168.1.147:8009';
//process.env.HQ_URL = 'http://192.168.1.114:8009';
//process.env.OUTLET_HOST = "http://192.168.1.114:";
//192.168.1.147:8011
process.env.HQ_URL = 'http://192.168.1.147:8011';
//process.env.OUTLET_HOST = "http://127.0.0.1:";
process.env.OUTLET_HOST = "http://192.168.3.47:";
process.env.PRINTER_URL = 'http://localhost:631';
process.env.FIREBASE_CONN = 'https://PB-Dev-Outlet.firebaseio.com';
process.env.OUTLET_ID = '14';
process.env.OUTLET_CODE = 'CEL';
process.env.SOURCE_FOLDER = '/home/ubuntu/images';
process.env.MENU_DISPLAY_FOLDER = '/home/ubuntu';
process.env.SMS_USERNAME = 'atchayam';
process.env.SMS_PASSWORD = '123456';
process.env.SMS_URL = 'http://whitelist.smsapi.org/SendSMS.aspx';
process.env.SERVER_PORT = '9099';
process.env.LISTEN_PORT = '9097';
process.env.EXPIRY_TIME_INTERVAL = '5';
process.env.TEST_MODE_TIME = '10';
process.env.REACHABLE_URL = "http://captive.apple.com";

//var mobileapp = require('./public/js/mobileapp');
// var send_pending_reconcile_mail = require('./utils/send_pending_reconcile_mail');


var app = express();

app.engine('hjs', require('hogan-express'));
if (app.get('env') === 'production') {
  app.enable('view cache');
}
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(logger('[:date[web]] ":method :url HTTP/:http-version" :status'));

// Enabling cors for all origins
app.use(cors());

// to remove 304 not modified
app.get('/*', function (req, res, next) {
  res.setHeader('Last-Modified', (new Date()).toUTCString());
  next();
});
// Setting up the routes here
app.use('/', routes);
app.use('/menu_display', menu_display);
app.use('/order_app', order_app);
app.use('/plcio', plcio);
app.use('/outlet_app', outlet_app);
app.use('/beverage_orders', beverage_orders);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


process.on("uncaughtException", err => {
  // handle the error safely
  console.log('##############################');
  console.log('error',err);
  console.log('##############################');
  
  console.log("Process Error : ${err}" + err);
});

mongoose.Promise = global.Promise;
//Set u
//Set up default mongoose connection
try {
  mongoose.connect('mongodb://localhost:27017/freshlyDB', {
    useMongoClient: true,
  });
} catch (err) {
  mongoose.createConnection('mongodb://localhost:27017/freshlyDB', {
    useMongoClient: true,
  });
}

//Get the default connection
var db = mongoose.connection;

//Bind connection to error event (to get notification of connection errors)
//db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('connected', function () {
  console.log('mongoDB is connected');
});
db.on('error', console.error.bind(console, 'MongoDB connection error:'));


module.exports = app;
