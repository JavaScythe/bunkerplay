let resolution = {
	x: 600,
	y: 480
};
let screenData = new Uint8ClampedArray(600*480);
onmessage = (e) => {
	if(e.data.type == "screen"){
		screenData = e.data.px;
		return;
	} else if(e.data.type == "calc"){
		let px = e.data.px;
		let start = new Date().getTime();
		let deltas = 0;
		let screenDelta = "";
		let screenType = "delta";
		let frameBlock = false;
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
		postMessage({
			screenDelta: screenDelta,
			screenType: screenType,
			frameBlock: frameBlock
		});
	}
};