//
var MULTICAST_IP_ADDRESS = '230.185.192.108'
var TTL = 128
var PORT = '8088'
var HOST = '192.168.1.33';
var dgram = require('dgram');
var client = dgram.createSocket('udp4');

client.on('listening', function() {
	var address = client.address();
	console.log('UDP Client listening on ' + address.address + ":" + address.port);

});

client.bind(PORT, function() {
	client.setBroadcast(true);
	client.setMulticastTTL(TTL);
	client.addMembership(MULTICAST_IP_ADDRESS, HOST);
});

var fileName = '/data/'
var CHUNK_SIZE = 512
var fs = require('fs')
client.on('message', function(message, remote) {
	// console.log('A: Epic Command Received. Preparing Relay.');
	// console.log('B: From: ' + remote.address + ':' + remote.port + ' - ' + message);
	if (message[0] == 1 && message[1] == 1 && message[2] == 1 && message[3] == 1) {
		fileName += message.toString('utf-8', 4)
		console.log('fileName ==', fileName)
	} else if (fileName.length > 6 && message[0] == 0 && message[1] == 3) {
		var block = (parseInt(message[2]) << 8) + parseInt(message[3]);
		console.log('block -- ', block)
		if (block != 0) {
			// fs.writeSync(fd, buffer, offset, length, position)
			// fs.writeSync('/data/' + fileName, message, 4, CHUNK_SIZE, (block - 1) * CHUNK_SIZE)
			fs.open(fileName, 'a', function(e, id) {
				console.log('length', message.length)
				if (4 + CHUNK_SIZE > message.length) {
					fs.write(id, message, 4, message.length, (block - 1) * CHUNK_SIZE, function() {
						fs.close(id, function() {
							console.log('file closed', block);
						});
					});
				} else {
					fs.write(id, message, 4, CHUNK_SIZE, (block - 1) * CHUNK_SIZE, function() {
						fs.close(id, function() {
							console.log('file closed', block);
						});
					});
				}
			});

		}
	}
	// console.log(data)

});