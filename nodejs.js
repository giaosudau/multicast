/**
 *
 */
var express = require('express'),
    fs = require('fs'),
    util = require('util'),
    uuid = require('node-uuid'),
    url = require('url'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    io = require('socket.io').listen(server);

// UDP
var MULTICAST_IP_ADDRESS = '230.185.192.108'
var TTL = 128
var PORT = 8088
var dgram = require('dgram');
var udpserver = dgram.createSocket("udp4");
var CHUNK_SIZE = 512;

udpserver.bind(PORT, function() {
    udpserver.setBroadcast(true)
    udpserver.setMulticastTTL(TTL)
    udpserver.addMembership(MULTICAST_IP_ADDRESS)
    console.log("UDP Server On %s for Sending File", PORT);
})

var news = [
        "Borussia Dortmund wins German championship",
        "Tornado warning for the Bay Area",
        "More rain for the weekend",
        "Android tablets take over the world",
        "iPad2 sold out",
        "Nation's rappers down to last two samples"
];
// setInterval(broadcastNew, 3000);

function broadcastNew() {
    fs.readFile('/etc/passwd', function(err, data) {
        if (err) throw err;
        console.log('length', data.length);

        udpserver.send(data, 0, data.length, PORT, MULTICAST_IP_ADDRESS, function(err, bytes) {
            console.log('Sent ---- ');
        });

    });


    // var message = new Buffer(news[Math.floor(Math.random()*news.length)]);
    // udpserver.send(message, 0, message.length, PORT, MULTICAST_IP_ADDRESS);
    // console.log("Sent " + message + " to the wire...");
    //server.close();
}



// Settings
var settings = {
    node_port: process.argv[2] || 8000,
    uploadPath: __dirname + '/uploads/'
};

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(express.static(__dirname + '/public'));

app.use(express.bodyParser({
    uploadDir: settings.uploadPath
}));

app.get('/', function(request, response) {
    response.render('index');
})

var opcodes = {
    OPCODE_TEXT: 1,
    OPCODE_WRQ: 2,
    OPCODE_DATA: 3,
    OPCODE_ACK: 4,
    OPCODE_ERROR: 5
};


function clearSession(peer) {
    var key = peer.address + ":" + peer.port;
    delete sessions[key];
}

function startSession(peer, file) {
    var key = peer.address + ":" + peer.port;
    sessions[key] = {
        'peer': peer,
        'file': file
    };
    sendBlock(peer, file, 1);
}

function continueSession(peer, block) {
    var key = peer.address + ":" + peer.port;
    var s = sessions[key];
    if (s !== undefined) {
        sendBlock(peer, s.file, block);
    } else {
        // log(peer, 'Ack for unknown session');
    }
}


function sendBlock(file, block) {
    // log(peer, 'Sending block ' + block + " of " + file);

    fs.open(file, 'r', function(err, fp) {
        if (err) {
            // console.log(err);
            // log(peer, "Error opening file: " + err);
            // sendError(peer, ERR_FILE_NOT_FOUND, "Can't open file: " + file);
            return;
        }
        var buf = new Buffer(4 + CHUNK_SIZE);
        fs.read(fp, buf, 4, CHUNK_SIZE, (block - 1) * CHUNK_SIZE, function(err, bytesRead) {
            if (err) {
                // log(peer, "Error reading file: " + err);
                // sendError(peer, ERR_UNDEFINED, err);
                // return;
                // console.log(err);
            }
            buf[0] = 0;
            buf[1] = opcodes.OPCODE_DATA;
            buf[2] = (block >> 8) & 0xFF;
            buf[3] = block & 0xFF;
            udpserver.send(buf, 0, 4 + bytesRead, PORT, MULTICAST_IP_ADDRESS);
            fs.close(fp);
        });
    });
}
app.post('/upload', function(request, response, next) {
    // the uploadDir is typically used as a temp save location, but we are just going to use the same directory to
    // store the final file.

    var savePath = settings.uploadPath;

    var fileName = request.files.qqfile.name;

    //after upload, rename the file and respond to Fine Uploader to notify it of success
    fs.rename(request.files.qqfile.path, savePath + fileName, function(err) {
        if (err != null) {
            console.log('Err: ' + err);
            response.send(JSON.stringify({
                success: false,
                error: err
            }), {
                'Content-Type': 'text/plain'
            }, 200);
        } else {
            response.send(JSON.stringify({
                success: true
            }), {
                'Content-Type': 'text/plain'
            }, 200);
            FILEPATH = savePath + fileName;
            var buf = new Buffer(fileName.length + 4)
            var len = buf.write(fileName, 4)
            buf[0] = 1
            buf[1] = 1
            buf[2] = 1
            buf[3] = 1
            console.log('=======', buf.toString())
            udpserver.send(buf, 0, buf.length, PORT, MULTICAST_IP_ADDRESS);
            console.log(FILEPATH);
            message = fs.readFileSync(FILEPATH);
            var msg_len = message.length;
            var odd = msg_len % CHUNK_SIZE
            number_of_block = 0;
            if (msg_len < CHUNK_SIZE) {
                number_of_block = 1
                sendBlock(FILEPATH, number_of_block)
                console.log('block ==', number_of_block)
            } else {
                if (odd > 0)
                    number_of_block = (msg_len - odd) / CHUNK_SIZE + 1;
                else
                    number_of_block = message / CHUNK_SIZE;

                for (var block = 1; block <= number_of_block; block++) {
                    sendBlock(FILEPATH, block)
                    console.log('block --', block)
                }
            }


        }
    })



});



// Starting the express server
app.listen(settings.node_port, '127.0.0.1');
console.log("Express server listening on %s:%d for uploads", '127.0.0.1', settings.node_port);