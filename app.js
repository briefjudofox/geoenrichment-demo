
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var tokencheck = require('./routes/tokencheck');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
  app.set('redirecturl','http://localhost.esri.com:3000/')
}else if ('production' == app.get('env')) {
  app.set('redirecturl','http://localhost.esri.com:3000/')
}

app.get('/', tokencheck.tokencheck);
app.get('/map', routes.index);
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
