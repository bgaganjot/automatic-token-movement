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

class pathManager {
	constructor() {}
	
	/***
		Returns true if all are not walking, returns false if even one is walking
	***/
	static startOrStop(tokens) {
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			if (hasProperty(token, "tp.paths")) {
				var paths = getProperty(token, "tp.paths");
				for (var key in paths) {
					if (paths[key].getWalking()) {
						return false;
					}
				}
			}
		}
		return true;
	}
	
	/***
		tokens: Array of tokens to start walking
		pathType: The kind of path to start
	***/
	static startAll(tokens, pathType) {
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			var p = null;
			if (hasProperty(token, "tp.paths." + pathType.name)) {
				logger.log(token.id + " has " + pathType.name);
				p = getProperty(token, "tp.paths." + pathType.name)
			} else {
				logger.log(token.id + " does not have " + pathType.name);
				p = new pathType(token.id);
				setProperty(token, "tp.paths." + pathType.name, p);
			}
			if (p instanceof pathType) {
				logger.log("starting walk");
				p.start();
			}
		}
	}
	
	static stopAll(tokens) {
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			if (hasProperty(token, "tp.paths")) {
				var paths = getProperty(token, "tp.paths");
				for (var key in paths) {
					paths[key].stop();
				}
			}
		}
	}
}

class path {
	constructor(tokenId) {
		this.tokenId = tokenId;
		this.token = canvas.tokens.get(this.tokenId);
		this.currentPoint = 0;
		this.walking = false;
		this.wallsLayerIndex = canvas.layers.findIndex(function (element) {
			return element.constructor.name == "WallsLayer";
		});
		this.delay = 1000;
	}
	
	
	moveToken() {		
		//Abstract
	}

	start() {
		this.walking = true;
		this.walkingLoop();
	}
	
	walkingLoop() {
		if (this.walking) {
			this.moveToken();
			setTimeout(this.walkingLoop.bind(this), this.delay);
		}
	}

	stop() {
		this.walking = false;
	}
	
	getWalking() {
		return this.walking;
	}
	
	setDefaultDelay(delay) {
		this.delay = delay;
	}
}

class tokenPath extends path{
	
	constructor(...args) {
		super(...args)

		this.points = [{x:0,y:0}, {x:50,y:0}, {x:0,y:100}];
		//this.points = [];
		this.pointsIndex = 0;
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
		this.pointsIndex = (this.pointsIndex+1)%this.points.length;
		return this.points[this.pointsIndex];
	}
	
	moveToken() {		
		var wallsLayerIndex = canvas.layers.findIndex(function (element) {
			return element.constructor.name == "WallsLayer";
		});
		
		var startingIndex = this.pointsIndex;
		var destination = this.nextPoint();
		if (!canvas.layers[wallsLayerIndex].checkCollision(new Ray({x:this.token.x,y:this.token.y}, destination))) {
			this.token.update(destination);
		}
	}
	

	
}

class randomPath extends path{
	constructor(...args) {
		super(...args);
		this.startX = this.token.x;
		this.startY = this.token.y;
		this.xRange = [0, 5];
		this.yRange = [0, 5];
		this.negative = true;
		this.gridsize = canvas.scene.data.grid;
	}
	
	setRange(x1, x2, y1, y2) {
		this.xRange = [x1, x2];
		this.yRange = [y1, y2];
	}
	
	setGridsize(gridsize) {
		this.gridsize = gridsize;
	}
	
	moveToken() {
		var x = Math.floor(Math.random() * this.xRange[1] + this.xRange[0]) * (Math.round(Math.random()) ? 1 : -1) * this.gridsize + this.startX;
		var y = Math.floor(Math.random() * this.yRange[1] + this.yRange[0]) * (Math.round(Math.random()) ? 1 : -1) * this.gridsize + this.startY;
		//logger.log(x + " " + y);
		var destination = {x:x, y:y};
		//logger.log("tokenid: " + this.tokenId);
		var token = canvas.tokens.get(this.tokenId);
		//logger.log(stringify(token));
		var ray = new Ray({x:token.x,y:token.y}, destination);
		destination.rotation = ray.angle * -180/Math.PI;
		if (!canvas.layers[this.wallsLayerIndex].checkCollision(ray)) {
			this.delay = 500*ray.distance/50;
			//console.log(ray.distance);
			//console.log(ray.angle);
			//token._updateRotation(ray.angle);
			//logger.log("before update");
			token.update(destination);
			//logger.log("after update");
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
	logger.log(stringify(canvas))
	/*
	let tokenId = tok.data._id;
	var token = canvas.tokens.get(tokenId);
	logger.log(getProperty(token, "tp"));
	if (!hasProperty(token, "tp")) {
		logger.log("TP started");
		let tp = new randomPath(tokenId);
		tp.start();
		setProperty(token, "tp", tp);
	} else {
		logger.log("TP stopped");
		getProperty(token, "tp").stop();
		delete token.tp;
	}
*/
});
function assignRandom (tokenId) {
	//let tokenId = tok.data._id;
	//logger.log(stringify(tokenId));
		//var token = canvas.tokens.get(tokenId);
		var token = canvas.tokens.get(tokenId);
		logger.log(getProperty(token, "tp"));
		//logger.log(stringify(canvas));
		if (!hasProperty(token, "tp")) {
			logger.log("TP started for " + tokenId);
			let tp = new randomPath(tokenId);
			tp.start();
			setProperty(token, "tp", tp);
		} else {
			logger.log("TP stopped for " + tokenId);
			getProperty(token, "tp").stop();
			delete token.tp;
		}
};
Hooks.on("renderTokenHUD", (tokenHUD, html, options) => {
	logger.log("renderTokenHUD");
	//NOT WORKING
	//logger.log(JSON.stringify(tokenHUD));
	//WORKING
	//logger.log(stringify(game));
	//logger.log(JSON.stringify(html));
	//logger.log(JSON.stringify(options));
	let tokenId = getProperty(tokenHUD.object, "data._id");
	var token = canvas.tokens.get(tokenId);
	//logger.log(stringify(token));
	if (!game.user.isGM) return;
	logger.log("not GM, token: " + tokenId);
	let linearWalkHUD = $(`
            <div class="control-icon" style="margin-left: 4px;"> \ 
                <img id="linearHUD" src="modules/foundry-patrol/imgs/svg/line.svg" width="36" height="36" title="Linear Walk"> \
            </div>
        `);
	const patrolDiv = $(`
		<div class="patrolDiv" style="display: flex;  flex-direction: row; justify-content: center; align-items:center; margin-right: 75px;">\
		</div>
	`);

	html.find(".left").append(patrolDiv);
	html.find(".patrolDiv").append(linearWalkHUD);
	
	linearWalkHUD.click((e) => {
		let id = e.target.getAttribute("src");	
		var tokenLayerIndex = canvas.layers.findIndex(function (element) {
			return element.constructor.name == "TokenLayer";
		});
		//logger.log(tokenLayerIndex + " " + stringify(canvas.layers[tokenLayerIndex]));//._controlled));
		logger.log(tokenId);
		controlledTokens = canvas.layers[tokenLayerIndex].controlled.filter(token => token._controlled);
		tokens = controlledTokens.map(element => canvas.tokens.get(element.id));
		sos = pathManager.startOrStop(tokens)
		logger.log("startOrStop? " + sos);
		if (sos) {
			//assignRandom(tokenId);
			pathManager.startAll(tokens, randomPath);
		} else {
			pathManager.stopAll(tokens);
		}
	});
});

console.log("automatic-movement hooked in");