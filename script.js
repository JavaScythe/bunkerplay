HTMLCanvasElement.prototype.getContext = function(origFn) {
	return function(type, attributes) {
		if (type === 'webgl') {
			attributes = Object.assign({}, attributes, {
				preserveDrawingBuffer: true,
			});
		}
		return origFn.call(this, type, attributes);
	};
}(HTMLCanvasElement.prototype.getContext);
EJS_player = '#game';
EJS_core = 'nes';
EJS_oldCores = true;
EJS_gameUrl = 'bomberman.zip';
EJS_pathtodata = '/data/';
EJS_gameID = 1;
EJS_Settings = {
	defaultControllers: {
		"0": {
			"0": {
				"value": "88"
			},
			"2": {
				"value": "16"
			},
			"4": {
				"value": "38"
			},
			"5": {
				"value": "40"
			},
			"6": {
				"value": "37"
			},
			"7": {
				"value": "39"
			},
			"8": {
				"value": "90"
			}
		},
		"1": {
			"0": {
				"value": "269"
			},
			"2": {
				"value": "270"
			},
			"4": {
				"value": "271"
			},
			"5": {
				"value": "272"
			},
			"6": {
				"value": "273"
			},
			"7": {
				"value": "274"
			},
			"8": {
				"value": "275"
			}
		},
		"2": {
			"0": {
				"value": "276"
			},
			"2": {
				"value": "277"
			},
			"4": {
				"value": "278"
			},
			"5": {
				"value": "279"
			},
			"6": {
				"value": "280"
			},
			"7": {
				"value": "281"
			},
			"8": {
				"value": "282"
			}
		},
		"3": {
			"0": {
				"value": "283"
			},
			"2": {
				"value": "284"
			},
			"4": {
				"value": "285"
			},
			"5": {
				"value": "286"
			},
			"6": {
				"value": "287"
			},
			"7": {
				"value": "288"
			},
			"8": {
				"value": "289"
			}
		}
	}
}
var ws = new WebSocket("ws://localhost:3000/ws");
let worker = new Worker("calc.js");
let netplay = {};
let screenData = [];
let screenDelta = {};
let screenType = "delta";
let frameBlock = false;
let framespeed = 2000;
let first = true;
let resolution = {
	x: 600,
	y: 480
};
var myCanvas = document.getElementById("resizer");
var ctx = myCanvas.getContext('2d', { willReadFrequently: true });
netplay.getScreen = function() {
	if(frameBlock){
		return false;
	}
	var img = new Image;
	img.onload = function(){
		//todo: add timings for each major step
		myCanvas.width = resolution.x;
		myCanvas.height = resolution.y;
		ctx.drawImage(img,0,0,myCanvas.width,myCanvas.height);
		let px = ctx.getImageData(0, 0, myCanvas.width, myCanvas.height).data;
		if(first){
			screenData = px;
			first = false;
			worker.postMessage({
				type: "screen",
				px: px
			});
			return false;
		} else {
			//send to worker
			worker.postMessage({
				type: "calc",
				px: px
			});
		}
	};
	img.src = EJS_MODULE.canvas.toDataURL();
}
worker.onmessage = function(e) {
	screenDelta = e.data.screenDelta;
	screenType = e.data.screenType;
	frameBlock = e.data.frameBlock;
	if(screenType == "full"){
		screenDelta = myCanvas.toDataURL();
	}
}
function simulateKeyEvent(eventType, keyCode, charCode) {
	var e = document.createEventObject ? document.createEventObject() : document.createEvent("Events");
	if (e.initEvent) e.initEvent(eventType, true, true);

	e.keyCode = keyCode;
	e.which = keyCode;
	e.charCode = charCode;
	console.log("key event: " + eventType + " " + keyCode + " " + charCode)
	// Dispatch directly to Emscripten's html5.h API (use this if page uses emscripten/html5.h event handling):
	if (typeof JSEvents !== 'undefined' && JSEvents.eventHandlers && JSEvents.eventHandlers.length > 0) {
		for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
			if ((JSEvents.eventHandlers[i].target == EJS_MODULE['canvas'] || JSEvents.eventHandlers[i].target == window)
				&& JSEvents.eventHandlers[i].eventTypeString == eventType) {
				JSEvents.eventHandlers[i].handlerFunc(e);
			}
		}
	} else {
		// Dispatch to browser for real (use this if page uses SDL or something else for event handling):
		EJS_MODULE['canvas'].dispatchEvent ? EJS_MODULE['canvas'].dispatchEvent(e) : EJS_MODULE['canvas'].fireEvent("on" + eventType, e);
	}
}
async function connect() {
	ws.send(JSON.stringify({
		"type": "mode",
		"mode": "host"
	}));
	while (1) {
		if(1 == 1){
			console.log("sending screen", screenType);
			if(Object.keys(screenDelta).length > 0 || screenType == "full"){
				ws.send(JSON.stringify({
					type: "screen",
					screen: screenDelta,
					screenType: screenType,
					time: new Date().getTime()
				}));
				frameBlock=false;
				screenDelta = {};
			}
		} else {
			ws.send(JSON.stringify({
				type: "screen",
				screen: "d",
				screenType: screenType,
				time: new Date().getTime()
			}));
		}
		netplay.getScreen();
		await new Promise(resolve => setTimeout(resolve, framespeed));
	}
}
document.getElementById("monkey").addEventListener("keydown", function(e) {
	if (e.key == "Enter" && document.getElementById("monkey").value != "" && document.getElementById("monkey").value.length < 255) {
		ws.send(JSON.stringify({
			type: "message",
			message: document.getElementById("monkey").value
		}));
		document.getElementById("monkey").value = "";
	}
	e.stopImmediatePropagation()
});
function qtip(){
	var myCanvas = document.getElementById("resizer");
	myCanvas.width=parseInt(document.getElementById("qSlid").value);
	myCanvas.height=parseInt(document.getElementById("qSlid").value*0.8);
	document.getElementById("num").innerHTML=document.getElementById("qSlid").value;
	console.log("qtip: "+document.getElementById("qSlid").value);
}
function framerate(){
	document.getElementById("framerateNum").innerHTML=document.getElementById("framerate").value;
	framespeed = parseInt(document.getElementById("framerate").value);
}
ws.onmessage = function (event) {
	var data = JSON.parse(event.data);
	if (data.type == "message") {
		let mgs = document.getElementById("msgs").textContent;
		mgs += (data.message);
		mgs += "\n";
		document.getElementById("msgs").textContent = mgs;
		if (document.getElementById("msgs").scrollHeight > document.getElementById("msgs").clientHeight) {
			document.getElementById("msgs").scrollTop = document.getElementById("msgs").scrollHeight - document.getElementById("msgs").clientHeight;
		}
		if (document.getElementById("msgs").textContent > 250) {
			document.getElementById("msgs").textContent = document.getElementById("msgs").textContent.slice(0, 250);
		}
	} else if (data.type == "keypress") {
		console.log(data);
		simulateKeyEvent(data.mode, data.code, 0);
	} else if (data.type == "uauthCallback") {
		let mgs = document.getElementById("msgs").textContent.split("\n");
		mgs.shift();
		mgs.push(data.message);
		mgs = mgs.join("\n");
		document.getElementById("msgs").textContent = mgs;
	}
}