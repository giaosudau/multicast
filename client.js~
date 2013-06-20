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

var fileName = ''
var CHUNK_SIZE = 10240
var fs = require('fs')
var sent_block = []
var closed = 0
client.on('message', function(message, remote) {
	if (message[0] == 1 && message[1] == 1 && message[2] == 1 && message[3] == 1) {
		fileName = '/data/' + message.toString('utf-8', 4)
		closed = 0
	} else if (fileName != '' && message[0] == 0 && message[1] == 3) {
		var block = (parseInt(message[2]) << 8) + parseInt(message[3]);

		if ((block % 29 == 0) && (sent_block.indexOf(block) < 0)) {
			var block_send = block + 1
			console.log('=============================', sent_block.indexOf(block))
			console.log('send me next block =============', block_send)
			var block_number = new Buffer(block_send.toString());
			client.send(block_number, 0, block_number.length, 8088, MULTICAST_IP_ADDRESS);
			sent_block.push(block)
			console.log('sent ---------------', sent_block)
		}
		if (block != 0 && !closed) {
			fs.open(fileName, 'a+', function(e, id) {
				if (4 + CHUNK_SIZE > message.length) {
					fs.write(id, message, 4, message.length - 4, (block - 1) * CHUNK_SIZE, function() {
						fs.close(id, function() {
							console.log('file -----------closed', block);
							sent_block = []
							closed = 1
						});
					});
				} else {
					console.log((block - 1) * CHUNK_SIZE)
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