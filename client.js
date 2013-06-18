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

client.on('message', function(message, remote) {
	// console.log('A: Epic Command Received. Preparing Relay.');
	console.log('B: From: ' + remote.address + ':' + remote.port + ' - ' + message);
	data = message.toString('utf-8', 0, message.length);
});