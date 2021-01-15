class Logger {
	
	constructor() {
		this.debug = true;
	}

	log(msg) {
		if (this.debug) {
			console.log("automatic-movement: " + msg);
		}
	}
}
class tokenPath {
	
	
	constructor(tokenId) {
		this.tokenId = tokenId;
		this.points = [{x:0,y:0}, {x:50,y:0}, {x:0,y:100}];
		//this.points = [];
		this.currentPoint = 0;
		this.tokenId;
		this.walking = false;
		this.wallsLayerIndex = canvas.layers.findIndex(function (element) {
			return element.constructor.name == "WallsLayer";
		});
		this.delay = 1000;
	}
	
	setTokenId(tokenId) {
		this.tokenId = tokenId;
	}
	
	addPoint(point) {
		this.points.push(point);
	}
	
	nextPoint() {
		this.currentPoint = (this.currentPoint+1)%this.points.length;
		return this.points[this.currentPoint];
	}
	
	moveToken() {		
		var wallsLayerIndex = canvas.layers.findIndex(function (element) {
			return element.constructor.name == "WallsLayer";
		});
		
		var startingIndex = this.currentPoint;
		var destination = this.nextPoint();
		var token = canvas.tokens.get(this.tokenId);
		if (!canvas.layers[wallsLayerIndex].checkCollision(new Ray({x:token.x,y:token.y}, destination))) {
			token.update(destination);
		}
		//return new Promise();
	}
	
	startWalking() {
		this.walking = true;
		this.walkingLoop();
	}
	
	walkingLoop() {
		if (this.walking) {
			this.moveToken();
			setTimeout(this.walkingLoop.bind(this), this.delay);
		}
	}

	stopWalking() {
		this.walking = false;
	}
	
}

class randomPath extends tokenPath{
	constructor(...args) {
		super(...args);
		this.xRange = [0, 10];
		this.yRange = [0, 10];
		this.gridsize = 50;
	}
	
	setRange(x1, x2, y1, y2) {
		this.xRange = [x1, x2];
		this.yRange = [y1, y2];
	}
	
	moveToken() {
		var x = Math.floor(Math.random() * this.xRange[1] + this.xRange[0]) * this.gridsize;
		var y = Math.floor(Math.random() * this.yRange[1] + this.yRange[0]) * this.gridsize;
		var destination = {x:x, y:y};
		var token = canvas.tokens.get(this.tokenId);
		var ray = new Ray({x:token.x,y:token.y}, destination);
		destination.rotation = ray.angle * 180/Math.PI;
		if (!canvas.layers[this.wallsLayerIndex].checkCollision(ray)) {
			this.delay = 500*ray.distance/50;
			//console.log(ray.distance);
			//console.log(ray.angle);
			//token._updateRotation(ray.angle);
			token.update(destination);
			//return token.setPosition(x, y);
		}
		//return new Promise();
	}
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

stringify = (str) => {
	var cache = [];
	ret = JSON.stringify(str, (key, value) => {
	  if (typeof value === 'object' && value !== null) {
		// Duplicate reference found, discard key
		if (cache.includes(value)) return;

		// Store value in our collection
		cache.push(value);
	  }
	  return value;
	});
	cache = null; // Enable garbage collection
	return ret;
};

const logger = new Logger();

Hooks.on("controlToken", async function (tok) {
	
	let tokenId = tok.data._id;
	var token = canvas.tokens.get(tokenId);
	logger.log(getProperty(token, "tp"));
	if (!hasProperty(token, "tp")) {
		logger.log("TP started");
		let tp = new randomPath(tokenId);
		tp.startWalking();
		setProperty(token, "tp", tp);
	} else {
		logger.log("TP stopped");
		getProperty(token, "tp").stopWalking();
		delete token.tp;
	}

});

console.log("automatic-movement hooked in");