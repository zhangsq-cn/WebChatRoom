function divEscapedContentElement(message) {
	return $('<div/>').text(message);
}

function divSystemContentElement(message) {
	return $('<div/>').html('<i>' + message + '</i>');
}

function processUserInput(chatApp, socket) {
	var message = $('#send-message').val(),
		systemMessage;

	if (message.charAt(0) == '/') {
		systemMessage = chatApp.processCommand(message);
		if (systemMessage) {
			$('#message').append(divSystemContentElement(systemMessage));
		}
	} else {
		chatApp.sendMessage($('#room').text(), message);
		$('#messages').append(divEscapedContentElement(message));
		$('#messages').scrollTop($('#messages').prop('scrollHeight'));
	}
	$('#send-message').val();
};

var socket = io.connect();

$(function() {
	var chatApp = new Chat(socket);
	socket.on('nameResult', function (result) {
		var message;
		if (result.success) {
			message = 'You are now known as ' + result.name + '.';
		} else {
			message = result.message;
		}
		$('#messages').append(divSystemContentElement(message));
	});

	socket.on('joinResult', function (result) {
		$('#room').text(result.room);
		$('#messages').append(divSystemContentElement('Room changed.'));
	});

	socket.on('message', function (message) {
		var newElement = $('<div/>').text(message.text);
		$('#messages').append(newElement);
	});

	socket.on('rooms', function (rooms) {
		console.log(rooms);
		$('#room-list').empty();
		for (var room in rooms) {
			room = room.substring(0, room.length);
			if (room !== '') {
				$('#room-list').append(divEscapedContentElement(room));
			}
		}
	});

	$('#room-list div').click(function () {
		chatApp.processCommand('/join ' + $(this).text());
		$('#send-message').focus();
	});

	setInterval(function () {
		socket.emit('rooms');
	}, 2000);

	$('#send-message').focus();
	$('#send-form').submit(function (evt) {
		evt.preventDefault();
		processUserInput(chatApp, socket);
		$('#send-message').val('');
	});
});