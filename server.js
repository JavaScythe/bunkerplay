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
io.on('connection', (socket) => {
	console.log("User " + socket["id"] + " Connected");
	socket.on("mode", (mode) => {
		if (mode.type == "host") {
			for (let i in users) {
				if (users[i].mode == "host") {
					io.to(socket.id).emit("mode", {
						"type": "uauthCallback",
						"new": false,
						"player": -1,
						"message": `Already a host`
					});
					return false;
				}
			}
			users[socket.id] = {};
			users[socket.id].mode = "host";
		}
		if (users[socket.id] == undefined) {
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
				io.to(socket.id).emit("mode", {
					"type": "uauthCallback",
					"new": false,
					"player": -1,
					"message": `Already 4 players`
				});
				return false;
			}
			users[socket.id] = {};
			users[socket.id].mode = "player";
			users[socket.id].player = playerNumber;
			io.to(socket.id).emit("mode", {
				"type": "uauthCallback",
				"new": true,
				"player": users[socket.id].player,
				"message": `Registered as player ${users[socket.id].player}`
			});
		} else {
			io.to(socket.id).emit("mode", {
				"type": "uauthCallback",
				"new": false,
				"player": users[socket.id].player,
				"message": `You're already registered as player ${users[socket.id].player}`
			});
		}
	});
	socket.on('disconnect', () => {
		console.log("User " + socket["id"] + " Disconnected");
		if (users[socket.id] != undefined) {
			delete users[socket.id];
		}
	});
});
io.on('connection', (socket) => {
	socket.on('screen', (msg) => {
		if (users[socket.id] != undefined) {
			if (users[socket.id].mode == "host") {
				if((new Date().getTime() - msg.time) > 200){
					return false;
				}
				for (let i in users) {
					if (users[i].mode == "player") {
						io.to(i).emit("screen", msg.screen);
					}
				}
			}
		}
		console.log(msg.length);
	});
	socket.on('keypress', (msg) => {
		if (users[socket.id] != undefined) {
			let p = users[socket.id].player;
			if (keybinds.indexOf(msg.code + "") == -1) {
				return false;
			}
			let c = keybinds.indexOf(msg.code + "") + 1 + (7 * p - 2);
			c += 256;
			console.log(p + ":" + msg.code + ":" + c);
			for (let i in users) {
				if (users[i].mode == "host") {
					io.to(i).emit("keypress", {
						"type": msg.type,
						"code": c
					});
				}
			}
		}
		console.log(msg);
	});
	socket.on("message", (msg) => {
		console.log("got msg");
		if (users[socket.id] != undefined) {
			let p = users[socket.id].player || "H1";
			if(p[0]!="H")p="P"+p;
			for (let i in users) {
				io.to(i).emit("message", "["+p+"] "+msg);
			}
		}
	});
});
server.listen(3000, () => {
	console.log('listening on *:3000');
});
