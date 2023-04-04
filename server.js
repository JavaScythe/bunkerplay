const express = require('express');
const app = express();
const path = require("path");
const http = require('http');
const fs = require("fs");
const server = http.createServer(app);
const WebSocket = require('ws');
//run "npm install --save-optional bufferutil utf-8-validate" to install performance improvements
const { randomUUID } = require('crypto');
const wss = new WebSocket.Server({
	server: server,
	path: "/ws",
	perMessageDeflate: {
		zlibDeflateOptions: {
			chunkSize: 1024,
			memLevel: 7,
			level: 3
		},
		zlibInflateOptions: {
			chunkSize: 10 * 1024
		},
		concurrencyLimit: 40, // Limits zlib concurrency for perf
	}
});
let rate = {
	tx: 0,
	rx: 0,
	ltx: 0,
	lrx: 0
}
let debug = true;
function broadCast(message, ws) {
	wss.clients.forEach(function each(client) {
		if (client !== ws && client.readyState === WebSocket.OPEN) {
			//if(debug) console.log("Emitting: " + JSON.stringify(message));
			let msg = JSON.stringify(message);
			client.send(msg);
			rate.tx += msg.length;
		}
	});
};
function narrowCast(message, ws) {
	wss.clients.forEach(function each(client) {
		if (client === ws && client.readyState === WebSocket.OPEN) {
			//if(debug) console.log("Emitting: " + JSON.stringify(message));
			let msg = JSON.stringify(message);
			client.send(msg);
			rate.tx += msg.length;
		}
	});
}
let users = {};
let pnm = 0;
const filenames = [
	".css",
	".gif",
	".png",
	".jpg",
	".txt",
	".js",
	".md",
	".html",
	".env",
	".svg",
	".data"
];
let keybinds = [
	"88", //x
	"16", //shift
	"38", //up
	"40", //down
	"37", //left
	"39", //right
	"90", //z
];
app.get('/', (req, res) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.sendFile(path.join(__dirname + "/index.html"));
});
app.get("/net", (req, res) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.send(fs.readFileSync(__dirname+"/net.html", "utf8").replace("$info$", (rate.lrx/1024).toFixed(2) + " KB/s | " + (rate.ltx/1024).toFixed(2) + " KB/s").replace("$total$", ((rate.ltx+rate.lrx)/1024).toFixed(2) + " KB"));
});
app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.sendFile(path.join(__dirname + req.path));
});
wss.on('connection', function connection(ws) {
	ws.id = randomUUID();
	if(debug) console.log("New connection: " + ws.id);
	ws.on("close", function close(){
		if(users[ws.id] != undefined){
			delete users[ws.id];
		}
	});
	ws.on('message', function incoming(message) {
		if(debug) console.log("Received: " + message.length + " bytes");
		rate.rx += message.length;
		try{
			message = JSON.parse(message);
		}catch(e){
			console.log("Error parsing JSON: " + e);
		}
		if(message.type != "screen"){
			if(debug) console.log("Received: " + JSON.stringify(message));
		}
		if (message.type == "mode") {
			if (message.mode == "host") {
				for (let i in users) {
					if (users[i].mode == "host") {
						narrowCast({
							"type": "uauthCallback",
							"new": false,
							"player": -1,
							"message": `Already a host`
						}, ws);
						return false;
					}
				}
				users[ws.id] = {};
				users[ws.id].mode = "host";
				users[ws.id].ws = ws;
				//send response that user is authenticated
				narrowCast({
					"type": "uauthCallback",
					"new": true,
					"message": `Authenticated as host`
				}, ws);
				return true;
			}
			if (users[ws.id] == undefined) {
				let tkn = [];
				for (let i in users) {
					if (users[i].mode != "host") {
						tkn.push(users[i].player);
					}
				}
				let playerNumber = undefined;
				for (let i = 2; i < 5; i++) {
					if (tkn.indexOf(i) == -1) {
						playerNumber = i;
						break;
					}
				}
				if (playerNumber == undefined) {
					narrowCast({
						"type": "uauthCallback",
						"new": false,
						"player": -1,
						"message": `Already 4 players`
					}, ws);
					return false;
				}
				users[ws.id] = {};
				users[ws.id].mode = "player";
				users[ws.id].player = playerNumber;
				narrowCast({
					"type": "uauthCallback",
					"new": true,
					"player": users[ws.id].player,
					"message": `Registered as player ${users[ws.id].player}`
				}, ws);
			} else {
				narrowCast({
					"type": "uauthCallback",
					"new": false,
					"player": users[ws.id].player,
					"message": `You're already registered as player ${users[ws.id].player}`
				}, ws);
			}
		}
		if (message.type == "screen") {
			if (users[ws.id] != undefined) {
				if (users[ws.id].mode == "host") {
					if((new Date().getTime() - message.time) > 200){
						console.log("dropped frame");
						broadCast({
							"type": "drop"
						});
						return false;
					}
					broadCast({
						"type": "screen",
						"screen": message.screen,
						"time": message.time
					});
				}
			}
		}
		if (message.type == "keypress") {
			if (users[ws.id] != undefined) {
				let p = users[ws.id].player;
				if (keybinds.indexOf(message.code + "") == -1) {
					return false;
				}
				let c = keybinds.indexOf(message.code + "") + 1 + (7 * p - 2);
				c += 256;
				console.log(p + ":" + message.code + ":" + c);
				console.log(users);
				for (let i in users) {
					if (users[i].mode == "host") {
						console.log("sneding to host"+JSON.stringify({
							"type": "keypress",
							"mode": message.mode,
							"code": c
						}));
						users[i].ws.send(JSON.stringify({
							"type": "keypress",
							"mode": message.mode,
							"code": c
						}));
					}
				}
			}
		}
		if (message.type == "message") {
			if (users[ws.id] != undefined) {
				let p = users[ws.id].player || "H1";
				if(p[0]!="H")p="P"+p;
				broadCast({
					"type": "message",
					"message": "["+p+"] "+message.message
				});
			}
		}
	});
});
setInterval(function(){
	rate.lrx = rate.rx;
	rate.rx = 0;
	rate.ltx = rate.tx;
	rate.tx = 0;
}, 1000);
server.listen(3000, () => {
	console.log('listening on *:3000');
});
