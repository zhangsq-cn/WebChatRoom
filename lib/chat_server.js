var socketio = require('socket.io'),
	io,
	guestNumber = 1,
	nickNames = {},
	namesUsed = [],
	currentRoom = {};

exports.listen = function(server) {
	//io = socketio.listen(server);	//启动Socket.IO服务器，允许它搭载在已有的HTTP服务器上
	io = socketio(server);	//启动Socket.IO服务器，允许它搭载在已有的HTTP服务器上
	//io.set('log level', 1);
	io.sockets.on('connection', function (socket) {
		guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);	//在用户连接上来时赋予其一个访客名
		joinRoom(socket, 'Lobby');	//在用户连接上来时把他放入聊天室Lobby里
		handleMessageBroadcasting(socket, nickNames);	//处理用户的消息，更名，以及聊天室的创建和变更
		handleNameChangeAttempts(socket, nickNames, namesUsed);
		handleRoomJoining(socket);
		socket.on('rooms', function () {	//当用户发出请求时，向其提供已经被占用的聊天室列表
			socket.emit('rooms', io.sockets.adapter.rooms);
		});
		handleClientDisconnection(socket, nickNames, namesUsed);	//定义用户断开连接后的清除逻辑
	});
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
	var name = 'Guest' + guestNumber;	//生成新昵称
	nickNames[socket.id] = name;	//把用户昵称和客户端连接ID关联上
	socket.emit('nameResult', {		//将昵称返回给客户端
		success : true,
		name : name
	});
	namesUsed.push(name);	//存放已被占用的昵称
	return guestNumber + 1;		//增加计数器
}

function joinRoom(socket, room) {
	socket.join(room);	//进入房间
	currentRoom[socket.id] = room;	//记录用户当前房间
	socket.emit('joinResult', {room : room});	//将房间信息返回给客户端
	socket.broadcast.to(room).emit('message', {		//将新用户进入房间的事件返回给房间用户
		text : nickNames[socket.id] + ' has joined ' + room + '.'
	});
	console.log(room);
	//console.log(io.sockets.adapter.rooms[room]);
	var clients = io.sockets.adapter.rooms[room];
	for (var clientId in clients) {
		console.log(io.sockets.connected[clientId]);
	}
	/*var usersInRoom = io.sockets.clients(room);		//确定有哪些用户在这个房间里
	if (userInRoom.length > 1) {
		var usersInRoomSummary = 'Users currently in ' + room + ': ';
		for (var index in usersInRoom) {
			var userSocketId = usersInRoom[index].id;
			if (userSocketId !== socket.id) {
				if (index > 0) {
					usersInRoomSummary += ', ';
				}
				usersInRoomSummary += nickNames[userSocketId];
			}
		}
	}
	usersInRoomSummary += '.';
	socket.emit('message', {text : usersInRoomSummary});*/
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
	socket.on('nameAttempt', function (name) {
		if (name.indexOf('Guest') === 0) {
			socket.emit('nameResult', {
				success : false,
				message : 'Names cannot begin with "Guest".'
			});
		} else {
			if (namesUsed.indexOf(name) === -1) {
				var previousName = nickNames[socket.id],
					previousNameIndex = namesUsed.indexOf(previousName);
					namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex];
				socket.emit('nameResult', {
					success : true,
					name : name
				});
				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text : previousName + ' is now know as ' + name + '.'
				});
			} else {
				socket.emit('nameResult', {
					success : false,
					message : 'That name is already in use.'
				});
			}
		}
	});
}

function handleMessageBroadcasting(socket) {
	socket.on('message', function (message) {
		socket.broadcast.to(message.room).emit('message', {
			text : nickNames[socket.id] + ': ' + message.text
		});
	});
}

function handleRoomJoining(socket) {
	socket.on('join', function (room) {
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom);
	});
}

function handleClientDisconnection(socket) {
	socket.on('disconnect', function () {
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]),
			disconnectName = nickNames[socket.id];
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
		socket.broadcast.to(currentRoom[socket.id]).emit('message', {
			text : disconnectName + ' already disconnected.'
		});
	});
}