var slog = require('sys').log;
var fs = require('fs');
var express = require('express'),
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

udpserver.bind(PORT, function() {
    udpserver.setBroadcast(true)
    udpserver.setMulticastTTL(TTL)
    udpserver.addMembership(MULTICAST_IP_ADDRESS)
    console.log("UDP Server On %s for Sending File", PORT);
})
/*
 
 */
var opcodes = {
  OPCODE_RRQ: 1,
  OPCODE_WRQ: 2,
  OPCODE_DATA: 3,
  OPCODE_ACK: 4,
  OPCODE_ERROR: 5
};

var sessions = {};
var udpserver = null;

function log(peer, msg) {
  slog("[" + peer.address + ":" + peer.port + "] " + msg);
}

function decodeOp(msg, peer) {
  if (msg.length < 4) {
    log(peer, 'Message too short to be valid.');
    return null;
  }

  if (msg[0] !== 0) {
    log(peer, 'Invalid Opcode, no leading zero.');
    return null;
  }

  var b = msg[1];

  for (var op in opcodes) {
    if (opcodes.hasOwnProperty(op)) {
      if (b == opcodes[op]) {
        return op;
      }
    }
  }

  log(peer, 'Invalid Opcode, no such opcode ' + b);
  return null;
}

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
    log(peer, 'Ack for unknown session');
  }
}

var ERR_UNDEFINED = 0; /* Not defined, see error message (if any). */
var ERR_FILE_NOT_FOUND = 1; /* File not found. */
var ERR_ACCESS_VIOLATION = 2; /* Access violation. */
var ERR_DISK_FULL = 3; /* Disk full or allocation exceeded. */
var ERR_ILLEGAL_OPERATION = 4; /* Illegal TFTP operation. */
var ERR_UNKNOWN_TRANSFER = 5; /* Unknown transfer ID. */
var ERR_FILE_EXISTS = 6; /* File already exists. */
var ERR_NO_SUCH_USER = 7; /* No such user. */



/*
 
 */

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



/*
 
 */

function sendError(peer, errorcode, msg) {
  clearSession(peer);
  if (msg === undefined) {
    msg = "";
  }
  var buf = new Buffer(6 + msg.length);
  buf[0] = 0;
  buf[1] = opcodes.OPCODE_ERROR;
  buf[2] = 0;
  buf[3] = errorcode;
  buf.write(msg, 4);
  buf[4 + msg.length] = 0;
  udpserver.send(buf, 0, buf.length, peer.port, peer.address);
}

function getString(buf) {
  var slen;
  for (slen = 0; slen < buf.length; slen++) {
    if (buf[slen] === 0) {
      break;
    }
  }

  return [slen, buf.toString('ascii', 0, slen)];
}

function sendBlock(peer, file, block) {
  // log(peer, 'Sending block ' + block + " of " + file);

  fs.open(file, 'r', function(err, fp) {
    if (err) {
      // log(peer, "Error opening file: " + err);
      // sendError(peer, ERR_FILE_NOT_FOUND, "Can't open file: " + file);
      return;
    }
    var buf = new Buffer(4 + 512);
    fs.read(fp, buf, 4, 512, (block - 1) * 512, function(err, bytesRead) {
      if (err) {
        // log(peer, "Error reading file: " + err);
        // sendError(peer, ERR_UNDEFINED, err);
        // return;
      }
      buf[0] = 0;
      buf[1] = opcodes.OPCODE_DATA;
      buf[2] = (block >> 8) & 0xFF;
      buf[3] = block & 0xFF;
      udpserver.send(buf, 0, 4 + bytesRead, PORT, MULTICAST_IP_ADDRESS);
      fs.close(fp);
      return (parseInt(buf[0]) << 8) +parseInt(buf[1]);
    });
  });
}


/*
 
 */

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
      filename = savePath + fileName;
      console.log(filename);
      // startSession(peer, filename);
      // continueSession(peer, block)
      // console.log(message.length);
      buf = fs.readFileSync(filename);
      block = buf.length/512
      console.log('block', block)
      // udpserver.send(message, 0, 1000, PORT, MULTICAST_IP_ADDRESS);
      
      // while (block)
      // block = sendBlock(peer, file, block)
    }
  })
});



// Starting the express server
app.listen(settings.node_port, '127.0.0.1');
console.log("Express server listening on %s:%d for uploads", '127.0.0.1', settings.node_port);