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
netplay.getScreen = function() {
	if(frameBlock){
		return false;
	}
	var myCanvas = document.getElementById("resizer");
	var ctx = myCanvas.getContext('2d', { willReadFrequently: true });
	var img = new Image;
	img.onload = function(){
		//todo: add timings for each major step
		let deltas = 0;
		myCanvas.width = resolution.x;
		myCanvas.height = resolution.y;
		ctx.drawImage(img,0,0,myCanvas.width,myCanvas.height);
		let px = ctx.getImageData(0, 0, myCanvas.width, myCanvas.height).data;
		if(first){
			screenData = px;
			first = false;
			return false;
		}
		// data is a single dimension Uint8ClampedArray
		// 4 bytes per pixel, in RGBA order
		// 0-3 is the first pixel, 4-7 is the second, etc.
		// top left is first, bottom right is last
		//compare the pixels and store changed pixels in screenDelta
		// screendelta sample format: {0: [0,0,0,0], 1: [0,0,0,0], 2: [0,0,0,0]}

		//todo: check any pixels even have different alpha values (maybe not because emujs)
		let start = new Date().getTime();
		screenDelta = {};
		let i = 0, l = px.length;
		//dynamic chunking: start with checking 100 pixels at a time, if it doesn't match then check 10 pixels at a time, if it doesn't match then check 1 pixel at a time
		let chunkSize = 5000;
		let rawAttempts = 0;
		while(i < l){
			debugger;
			rawAttempts++;
			//console.log("start index"+ i+" end index "+ (i+(chunkSize*4))+" chunkSize: "+chunkSize+" rawAttempts: "+rawAttempts);
			if(px.slice(i, i+(chunkSize*4)).join("") === screenData.slice(i, i+(chunkSize*4)).join("")){
				//console.log("good "+chunkSize+" chunk at "+i+" (rawAttempts: "+rawAttempts);
				i += chunkSize*4;
				if(chunkSize === 1){
					chunkSize = 10;
					continue;
				}else if(chunkSize === 10){
					chunkSize = 25;
					continue;
				}else if(chunkSize === 25){
					chunkSize = 50;
					continue;
				}else if(chunkSize === 50){
					chunkSize = 100;
					continue;
				} else if(chunkSize === 100){
					chunkSize = 500;
					continue;
				} else if(chunkSize === 500){
					chunkSize = 1000;
					continue;
				} else if(chunkSize === 1000){
					chunkSize = 5000;
					continue;
				}
			}else{
				if(chunkSize === 5000){
					chunkSize = 1000;
					continue;
				}else if(chunkSize === 1000){
					chunkSize = 500;
					continue;
				}else if(chunkSize === 500){
					chunkSize = 100;
					continue;
				}else if(chunkSize === 100){
					chunkSize = 50;
					continue;
				}else if(chunkSize === 50){
					chunkSize = 25;
					continue;
				}else if(chunkSize === 25){
					chunkSize = 10;
					continue;
				}else if(chunkSize === 10){
					chunkSize = 1;
					continue;
				}else if(chunkSize === 1){
					//this pixel (i) is bad
					let localStart = new Date().getTime();
					let p = [px[i], px[i+1], px[i+2], px[i+3]];
					for(let i in p){
						p[i] = parseInt(p[i]);
					};
					screenDelta += i+":";
					screenDelta += (function(p){
						let x = "";
						for(let i in p){
							//preprend 0s to make at least 3 digits
							let s = p[i].toString();
							while(s.length < 3){
								s = "0"+s;
							}
							x += s;
						}
						return x;
					})(p);
					screenDelta += ";";
					screenData[i] = p[0];
					screenData[i+1] = p[1];
					screenData[i+2] = p[2];
					screenData[i+3] = p[3];
					deltas++;
					//console.log("delta time: " + (new Date().getTime() - localStart));
					i += 4;
				}
			}
			//the above code generates more deltas than pixels because 
			//screen delta sample format: 0:000000000;1:0000000000000;2:000000000;
		}
		console.log("frame calculated in "+rawAttempts+" attempts");
		console.log("deltapercent"+(deltas/(resolution.x*resolution.y)));
		screenType = "delta";
		if((deltas/(resolution.x*resolution.y)) > 0.4){
			screenDelta = myCanvas.toDataURL();
			screenType = "full";
			console.log("SENDING FULL SCREEN");
			frameBlock = true;
		}
		console.log("deltas: " + deltas + " time: " + (new Date().getTime() - start)+" size:"+screenDelta.length);
	};
	img.src = EJS_MODULE.canvas.toDataURL();
}
function simulateKeyEvent(eventType, keyCode, charCode) {
	var e = document.createEventObject ? document.createEventObject() : document.createEvent("Events");
	if (e.initEvent) e.initEvent(eventType, true, true);

	e.keyCode = keyCode;
	e.which = keyCode;
	e.charCode = charCode;

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
		let mgs = document.getElementById("msgs").textContent.split("\n");
		mgs.shift();
		mgs.push(data.message);
		mgs = mgs.join("\n");
		document.getElementById("msgs").textContent = mgs;
	} else if (data.type == "keypress") {
		simulateKeyEvent(data.eventType, data.keyCode, 0);
	} else if (data.type == "uauthCallback") {
		let mgs = document.getElementById("msgs").textContent.split("\n");
		mgs.shift();
		mgs.push(data.message);
		mgs = mgs.join("\n");
		document.getElementById("msgs").textContent = mgs;
	}
}