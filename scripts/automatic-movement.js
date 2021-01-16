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
		this.token = canvas.tokens.get(this.tokenId);
		this.points = [{x:0,y:0}, {x:50,y:0}, {x:0,y:100}];
		//this.points = [];
		this.currentPoint = 0;
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
		if (!canvas.layers[wallsLayerIndex].checkCollision(new Ray({x:this.token.x,y:this.token.y}, destination))) {
			this.token.update(destination);
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
		this.startX = this.token.x;
		this.startY = this.token.y;
		this.xRange = [0, 5];
		this.yRange = [0, 5];
		this.negative = true;
		this.gridsize = 50;
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
	/*
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
*/
});
function assignRandom (tokenId) {
	//let tokenId = tok.data._id;
	//logger.log(stringify(tokenId));
		var token = canvas.tokens.get(tokenId);
		var token = canvas.tokens.get(tokenId);
		logger.log(getProperty(token, "tp"));
		//logger.log(stringify(canvas));
		if (!hasProperty(token, "tp")) {
			logger.log("TP started for " + tokenId);
			let tp = new randomPath(tokenId);
			tp.startWalking();
			setProperty(token, "tp", tp);
		} else {
			logger.log("TP stopped for " + tokenId);
			getProperty(token, "tp").stopWalking();
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
		<div class="patrolDiv" style="display: flex; flex-direction: row; justify-content: center; align-items:center; margin-right: 75px;">\
		</div>
	`);

	html.find(".left").append(patrolDiv);
	html.find(".patrolDiv").append(linearWalkHUD);
	
	linearWalkHUD.click((e) => {
		let id = e.target.getAttribute("src");	
		var tokenLayerIndex = canvas.layers.findIndex(function (element) {
			return element.constructor.name == "TokenLayer";
		});
		logger.log(tokenLayerIndex + " " + stringify(canvas.layers[tokenLayerIndex]));//._controlled));
		logger.log(tokenId);
		controlledTokens = canvas.layers[tokenLayerIndex].controlled.filter(token => token._controlled);
		controlledTokens.forEach(element => logger.log("id is " + element.id));
		for (i = 0; i < controlledTokens.length; i++) {
			logger.log(i + "/" + controlledTokens.length + " : " + controlledTokens[i].id)
			assignRandom(controlledTokens[i].id)
		}
	});
});

console.log("automatic-movement hooked in");