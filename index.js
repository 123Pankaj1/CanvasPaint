
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);


app.use(express.static(__dirname));

app.get('/', function(req, res){
  res.sendfile('index.html');
});

//var dt = require('./custome_module/date.js');
var fileEvent = require('./custome_module/fileEvent.js');

var clients = {};
var socketsOfClients = {};

io.sockets.on('connection', function(socket) {
  socket.on('set username', function(userName) {
    // Is this an existing user name?
    if (clients[userName] === undefined) {
      // Does not exist ... so, proceed
      clients[userName] = socket.id;
      socketsOfClients[socket.id] = userName;
      userNameAvailable(socket.id, userName);
	  userJoined(userName);
    } else
    if (clients[userName] === socket.id) {
      // Ignore for now
    } else {
      userNameAlreadyInUse(socket.id, userName);
    }
  });

  socket.on('message', function(msg) {
	  
	  console.log(JSON.stringify(msg));
	  
    var srcUser;
    if (msg.inferSrcUser) {
      // Infer user name based on the socket id
      srcUser = socketsOfClients[socket.id];
    } else {
      srcUser = msg.source;
    }
    if (msg.target == "All") {
      // broadcast
      io.sockets.emit('message',
          {"source": srcUser,
           "message": msg.message,
           "target": msg.target});
    } else {
      // Look up the socket id
      io.sockets.sockets[clients[msg.target]].emit('message', 
          {"source": srcUser,
           "message": msg.message,
           "target": msg.target});
    }
  })
  
  socket.on('getChatHistory', function(name) {
	 console.log("getChatHistory----->"+name);
	 fileEvent.ReadJsonFile(name,function(data){
		sendChatHIstory(data);	
		},function(err){
			console.log(err);
		});
  });
  
  socket.on('saveChatHistory',function(name,historyChat){
	 fileEvent.writeJsonFile(name,historyChat,function(data){
		console.log("successs"+data);
		if(data){
			console.log("Yes complete");
		  }
		});
  });
  

  socket.on('disconnect', function() {
	  var uName = socketsOfClients[socket.id];
	  delete socketsOfClients[socket.id];
    delete clients[uName];
	// relay this message to all the clients
	userLeft(uName);
  })
})

function sendChatHIstory(data){
	io.sockets.emit('sendChatHistory',data);
}


function userJoined(uName) {
	Object.keys(socketsOfClients).forEach(function(sId) {
		io.sockets.sockets[sId].emit('userJoined', { "userName": uName });
	})
}

function userLeft(uName) {
    io.sockets.emit('userLeft', { "userName": uName });
}

function userNameAvailable(sId, uName) {
  setTimeout(function() {
    console.log('Sending welcome msg to ' + uName + ' at ' + sId);
	
    io.sockets.sockets[sId].emit('welcome', { "userName" : uName, "currentUsers":JSON.stringify(Object.keys(clients))});
  }, 500);
}

function userNameAlreadyInUse(sId, uName) {
  setTimeout(function() {
    io.sockets.sockets[sId].emit('error', { "userNameInUse" : true });
  }, 500);
}


http.listen(3000, function(){
  console.log('WELCOME:3000');
});