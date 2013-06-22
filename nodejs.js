/**
 * author: Le Trung Chanh, Nguyen Gia Luan
 * 
 */
var express = require('express'),
    fs = require('fs'),
    app = express(),
    http = require('http'),
    server = http.createServer(app);
io = require('socket.io').listen(server);

// Create UDP Server
var dgram = require('dgram');
var TTL = 255
var FILEPATH
var missArray = [];
var MULTICAST_IP_ADDRESS = '230.185.192.108'
var PORT = 8088
var udpserver = dgram.createSocket("udp4");
var CHUNK_SIZE = 10240;

// Set mulicast for UDP Server
udpserver.bind(PORT, function() {
    udpserver.setBroadcast(true)
    udpserver.setMulticastTTL(TTL)
    udpserver.addMembership(MULTICAST_IP_ADDRESS)
    console.log("UDP Server On %s for Sending File", PORT);
})
// Get Message from receiver
udpserver.on("message", function(message, remote) {
    message = message.toString('utf-8', 0, message.length)
    console.log("message", message);
    if (message.indexOf("miss block:") != -1) {
        block = message.substring(11, message.length);
        block = block.split(",");
        for (i = 0; i < block.length; i++) {
            continueSession(FILEPATH, block[i]);
            console.log("send again", block[i]);
        }

    } else if (message.indexOf("Receive Completed") != -1) {
        console.log("rec");
        io.sockets.emit('news', {
            ReceiveInfo: remote['address'] + ": received"
        });

    } else if (message.indexOf("Receive Failed") != -1) {
        io.sockets.emit('news', {
            ReceiveInfo: remote['address'] + ": failed"
        });
    }
});

// Settings expressjs 
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
// Signal 
var opcodes = {
    OPCODE_TEXT: 1,
    OPCODE_WRQ: 2,
    OPCODE_DATA: 3,
    OPCODE_ACK: 4,
    OPCODE_ERROR: 5
};

function continueSession(file, block) {
    if (file !== undefined) {
        sendBlock(file, block);
    } else {
        console.log('Ack for unknown session');
    }
}


function sendBlock(file, block) {
    fs.open(file, 'r', function(err, fp) {
        if (err) {
            console.log("Can't open file: ", file);
            return;
        }
        var buf = new Buffer(4 + CHUNK_SIZE);
        fs.read(fp, buf, 4, CHUNK_SIZE, (block - 1) * CHUNK_SIZE, function(err, bytesRead) {
            if (err) {
                console.log('Error reading file: ', err)
                return;
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
    SuccessClients = [];
    UnsuccessClients = [];
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


// Starting the HTTP server
server.listen(settings.node_port, '127.0.0.1');

// send to web interface
io.sockets.on('connection', function(socket) {
    socket.emit('news', {
        hello: 'world'
    });
    socket.on('my other event', function(data) {
        console.log(data);
    });
});

console.log("Express server listening on %s:%d for uploads", '127.0.0.1', settings.node_port);