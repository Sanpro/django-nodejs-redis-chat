var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

io.set('authorization', function(data, accept){
	console.log('authorization');
	if(data.headers.cookie){
		data.cookie = cookie_reader.parse(data.headers.cookie);
		data.sessionID = data.cookie['sessionid'];
		console.log('authorization: '+data.cookie);
		return accept(null, true);
	}
	console.log('authorization: failed');
	return accept('error', false);
});

var cookie_reader = require('cookie');
var querystring = require('querystring');
 
var redis = require('redis');
var sub = redis.createClient();
 
//Subscribe to the Redis chat channel
sub.subscribe('chat');

/*
app.get('/', function(req, res){
    res.sendFile('index.html', {root: __dirname});
});
*/

io.on('connection', function(socket){
	io.emit('alert', { 'msg': 'a user connected'});
	console.log('a user connected');

	socket.on('disconnect', function(){
		console.log('user disconnected');
		io.emit('alert', {'msg': 'user disconnected'});
	});

	socket.on('chat message', function(message){
		console.log('message: '+ message);
		//io.emit('chat message', {'user': 'test', 'msg': msg});

		values = querystring.stringify({
			comment: message,
			//sessionid: socket.handshake.cookie['sessionid'],
			sessionid: socket.handshake.sessionID,
		});
		
		var options = {
			host: 'localhost',
			port: 8000,
			path: '/node_api',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': values.length
			}
		};
		//Send message to Django server
		var req = http.get(options, function(res){
			res.setEncoding('utf8');
		
			//Print out error message
			res.on('data', function(message){
				if(message != 'Everything worked :)'){
					console.log('Message: ' + message);
				}
			});
		});

		req.write(values);
		req.end();
	})

	sub.on('message', function(channel, message){
		console.log('Redis: '+message);
		socket.emit('chat message', {'user': 'test', 'msg': message});
	})
});

http.listen(3000,function(){
	console.log('listening on *:3000');
});
