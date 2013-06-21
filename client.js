//
var MULTICAST_IP_ADDRESS = '230.185.192.108'
var TTL = 128
var PORT = '8088'
var HOST = '192.168.1.33';
var dgram = require('dgram');
var client = dgram.createSocket('udp4');
var serverIp;
function send(msg) {
	console.log("send:",msg);
	msg = new Buffer(msg, 'utf-8')
	client.send(msg,0, msg.length, PORT, MULTICAST_IP_ADDRESS);
};

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
var fd
var blockArray = range(1,30)
var missArray =[]
client.on('message', function(message, remote) {
	//console.log('mess:',remote);
	serverIp = remote['address'];
	if (message[0] == 1 && message[1] == 1 && message[2] == 1 && message[3] == 1) {
		console.log(message);
		fileName = 'data/' +  message.toString('utf-8', 4)
		console.log(fileName);
		fd = fs.openSync(fileName, 'w');
	} else if (fileName!='' && message[0] == 0 && message[1] == 3) {
		var block = (parseInt(message[2]) << 8) + parseInt(message[3]);
		console.log('block ------ ', block)
		if (block != 0) {
			blockArray.splice( blockArray.indexOf(block),1);
			//console.log(missArray);
			fs.open(fileName, 'a', function(e, id) {
				if (4 + CHUNK_SIZE > message.length) {
					fs.write(fd, message, 4, message.length-4, (block - 1) * CHUNK_SIZE, function() {
						fs.close(fd, function() {
							console.log('file closed', block);
							for(i=0;i<missArray.length;i++)
							{
								if (missArray[i]>block)
									missArray.splice( i,1);
							}
							if (missArray.length == 0)
							{
								send("Receive Completed");
								console.log("receive completed");
							}
							else { send("miss block:"+missArray); }
						});
					});
				} else {
					console.log("message length:", message.length)
					console.log((block - 1) * CHUNK_SIZE)
				
					fs.write(fd, message, 4, CHUNK_SIZE, (block - 1) * CHUNK_SIZE, function() {
						fs.close(fd, function() {
							console.log('1file closed', block);
							if (block % 30 ==0)
							{
								if (blockArray.length > 0)
								{
									missArray =missArray.concat(blockArray);
								}
								else if (missArray.length > 0)
								{
									missArray.splice( missArray.indexOf(block),1);
								}
								else if (missArray.length == 0)
								{
									send("Receive Completed");
								}
								blockArray = range(block+1,30)
							}
							
							//udpserver.send(block+1)
						});
					});
				}
			});

		}
	}
	// console.log(data)

});

function range(start, count) {
    if(arguments.length == 1) {
        count = start;
        start = 0;
    }

    var foo = [];
    for (var i = 0; i < count; i++) {
        foo.push(start + i);
    }
    return foo;
}
