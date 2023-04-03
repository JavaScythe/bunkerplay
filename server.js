const express = require('express');
const app = express();
const path = require("path");
const http = require('http');
const server = http.createServer(app);
const io = require("socket.io")(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"]
	}
});
const WebSocket = require('ws');
const { randomUUID } = require('crypto');
const wss = new WebSocket.Server({
	server: server,
	path: "/ws"
});
let debug = true;
function broadCast(message, ws) {
	wss.clients.forEach(function each(client) {
		if (client !== ws && client.readyState === WebSocket.OPEN) {
			if(debug) console.log("Emitting: " + JSON.stringify(message));
			client.send(JSON.stringify(message));
		}
	});
};
function narrowCast(message, ws) {
	wss.clients.forEach(function each(client) {
		if (client === ws && client.readyState === WebSocket.OPEN) {
			if(debug) console.log("Emitting: " + JSON.stringify(message));
			client.send(JSON.stringify(message));
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
		if(debug) console.log("Received: " + message);
		try{
			message = JSON.parse(message);
		}catch(e){
			console.log("Error parsing JSON: " + e);
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
						return false;
					}
					for (let i in users) {
						if (users[i].mode == "player") {
							wss.clients.forEach(function each(client) {
								if (client.readyState === WebSocket.OPEN) {
									client.send(JSON.stringify({
										"type": "screen",
										"screen": message.screen
									}));
								}
							});
						}
					}
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
				for (let i in users) {
					if (users[i].mode == "host") {
						wss.clients.forEach(function each(client) {
							if (client.readyState === WebSocket.OPEN) {
								client.send(JSON.stringify({

									"type": "keypress",
									"mode": message.mode,
									"code": c
								}));
							}
						});
					}
				}
			}
		}
		if (message.type == "message") {
			if (users[ws.id] != undefined) {
				let p = users[ws.id].player || "H1";
				if(p[0]!="H")p="P"+p;
				wss.clients.forEach(function each(client) {
					if (client.readyState === WebSocket.OPEN) {
						client.send(JSON.stringify({
							"type": "message",
							"message": "["+p+"] "+message.message
						}));
					}
				});
			}
		}
	});
});
server.listen(3000, () => {
	console.log('listening on *:3000');
});
