var news = [
   "Borussia Dortmund wins German championship",
   "Tornado warning for the Bay Area",
   "More rain for the weekend",
   "Android tablets take over the world",
   "iPad2 sold out",
   "Nation's rappers down to last two samples"
];

var dgram = require('dgram'); 
var udpserver = dgram.createSocket("udp4"); 
var PORT = 8088;
// var MULTICAST_IP_ADDRESS = '224.0.0.114';
var MULTICAST_IP_ADDRESS = '230.185.192.108';
var TTL = 128;
udpserver.bind(1234, function() {
    udpserver.setBroadcast(true)
    udpserver.setMulticastTTL(TTL)
    udpserver.addMembership(MULTICAST_IP_ADDRESS)
    console.log("UDP Server On %s for Sending File", PORT);
})
setInterval(broadcastNew, 3000);

function broadcastNew() {
    var message = new Buffer(news[Math.floor(Math.random()*news.length)]);
    udpserver.send(message, 0, message.length, PORT, MULTICAST_IP_ADDRESS);
    console.log("Sent " + message + " to the wire...");
    //server.close();
}