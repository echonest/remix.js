'use strict';

var express       = require('express');
var bodyparser    = require('body-parser');
var port          = process.env.PORT || 4000;
var app           = express();

app.use(bodyparser.urlencoded({extended: true}));
app.use(bodyparser.json());
app.use(express.static(__dirname + '/'));

app.listen(port, function() {
  console.log('Server is running on port ' + port);
});
