var express     = require('express');
var path        = require('path');
var app         = express();
var mongo       = require('./MongoDB.js');
var bodyParser  = require('body-parser');
var crypto      = require('crypto');
var signCode    = 'abc.123';


var md5 = function(str){
  var md5 = crypto.createHash('md5');
  md5.update(str);
  return md5.digest('hex');
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// index
app.get("/", function(req, res){
	res.redirect("/index.html");
});

// search logs
app.post('/MongoDB/search', function(req, res) {

  var project = req.body.project;
  var name    = req.body.name;
  var msg     = req.body.msg;
  var level   = req.body.level;
  var start   = new Date(req.body.startD + ' ' + req.body.startT)
  var end     = new Date(req.body.endD + ' ' + req.body.endT)

  var opt = {
    project: project,
    level: level,
    name: new RegExp(name),
    msg: new RegExp(msg),
    _time: {
      $gt: start.getTime(),
      $lt: end.getTime()
    }
  }

  level === 'ALL' && (delete opt.level);
  name  === 'ALL' && (delete opt.name);
  msg   === 'ALL' && (delete opt.msg);

  isNaN(start.getTime()) && (delete opt._time['$gt'])
  isNaN(end.getTime())   && (delete opt._time['$lt'])

  isNaN(start.getTime()) && isNaN(end.getTime()) && (delete opt._time)

  opt = {
    $query: opt,
    $orderby: {
      _time: -1
    }
  }

  mongo.select('logs', opt, function(err, docs) {
    res.json({results: docs});
  })

});

// Add log
app.post('/MongoDB/logs', function(req, res){
  try {

    var now   = new Date().getTime();
    var t     = req.headers['x-time']
    var sign  = req.headers['x-sign'];

    if (now - t > 10000) {
      return res.json({err: 'Timeout'})
    }

    if (!t || !sign) {
      return res.json({err: 'NoHeader'});
    }

    if (md5(signCode + t) !== sign) {
      return res.json({err: "SignError"})
    }

    mongo.insert('logs', req.body, function(err, id, result){
      res.json({id: id});
    });

  } catch (e) {
    res.send(e);
  }
});

// Get log
// app.get('/MongoDB/logs/:col', function(req, res){

// 	var opt = req.query["options"];
// 	if (opt === undefined || opt === "")
// 		opt = {};
// 	else {
// 		opt = eval("(" + opt + ")")
// 	}

// 	mongo.select(req.param('col'), opt, function(err, docs){
// 		// Jsonp request
// 		res.jsonp(docs);
// 	});
// });

// Get log by id
// app.get('/MongoDB/logs/:col/:id', function(req, res){
// 	mongo.selectByID(req.param('col'), req.param('id'), function(err, docs){
// 		res.jsonp(docs);
// 	});
// });

// Modify log by id
// app.put('/MongoDB/logs/:col/:id', function(req, res){
// 	var doc = JSON.parse(req.body["doc"]);
// 	mongo.update(req.param('col'), req.param('id'), doc, function(err, result) {
// 		res.jsonp(result);
// 	});
// });

// Delete log by id
// app.delete('/MongoDB/logs/:col/:id', function(req, res){
// 	mongo.delete(req.param('col'), req.param('id'), function(err, result){
// 		res.jsonp(result);
// 	});
// });

app.listen(3000);
