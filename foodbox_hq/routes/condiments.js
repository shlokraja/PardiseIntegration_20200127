/*global require __dirname module console*/
'use strict';

var express = require('express');
var router = express.Router();
var pg = require('pg');
var async = require('async');
var format = require('string-format');
var debug = require('debug')('Foodbox-HQ:server');

format.extend(String.prototype);
var config = require('../models/config');
var conString = config.dbConn;
router.get('/', function (req, res, next) {
	pg.connect(conString, function (err, client, done) {
		if (err) {
			handleError(client, done, res, 'error fetching client from pool' + err);
			return;
		}
		//Get all the condiments list from the condiment_master table
		client.query('SELECT * FROM condiments_master order by condiment_name',
			[],
			function (query_err, condiments) {
				if (query_err) {
					console.log('error running query' + query_err, null);
					return;
				}
				// releasing the connection
				done();
				var context = {
					title: 'condiments',
					data: condiments.rows
				};
				res.status(200).json(context);
			});
	});
});

router.get('/list', function (req, res, next) {
	pg.connect(conString, function (err, client, done) {
		if (err) {
			handleError(client, done, res, 'error fetching client from pool' + err);
			return;
		}
		//Get all the condiments bit and slot_num from the condiments_bit table
		client.query('SELECT bit,slot_num FROM condiments_bit',
			[],
			function (query_err, condiments) {
				if (query_err) {
					console.log('error running query' + query_err, null);
					return;
				}
				// releasing the connection
				done();
				var context = {
					title: 'condiments',
					data: condiments.rows
				};
				res.status(200).json(context);
			});
	});
});

// Some utility functions
var handleError = function (client, done, res, msg) {
	done(client);
	console.error(msg);
	res.status(500).send(msg);
};

module.exports = router;
