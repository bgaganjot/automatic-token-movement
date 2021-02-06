/*var stringify2 = require('json-stringify-safe');
var circularObj = {};
circularObj.circularRef = circularObj;
circularObj.list = [ circularObj, circularObj ];
console.log(stringify2(circularObj, null, 2));
*/

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

window.Handlebars.registerHelper('select', function( value,options ) {
	var $el = $('<select />').html( options.fn(this) );
	$el.find('[id="' + value + '"]').attr({'selected':'selected'});
	return $el.html();
});

class pathManager {
	constructor() {}
	
	/***
		Returns true if all are not walking, returns false if even one is walking
	***/
	static async startOrStop(tokens) {
		for (let i = 0; i < tokens.length; i++) {
			let token = tokens[i];
			if (hasProperty(token, "tp")) {
				let tp = getProperty(token, "tp");
				if (tp.currentPath != 0 && (tp.getTokenPath().getWalking() || tp.getRandomPath().getWalking())) {
					return false;
				}
			}
		}
		return true;
	}
	
	/***
		tokens: Array of tokens to start walking
		pathType: The kind of path to start
	***/
	static async startAll(tokens) {
		for (let i = 0; i < tokens.length; i++) {
			let token = tokens[i];
			if (!hasProperty(token, "tp")) {
				pathManager.loadTokenSettings(token);
			}
			//logger.log(token.tp.currentPath);
			if (token.tp.currentPath == 1) {
				token.tp.getTokenPath().start();
			} else if (token.tp.currentPath == 2) {
				token.tp.getRandomPath().start();
			}
		}
	}
	
	static async stopAll(tokens) {
		for (let i = 0; i < tokens.length; i++) {
			let token = tokens[i];
			if (!hasProperty(token, "tp")) {
				pathManager.loadTokenSettings(token);
			}
			let tp = getProperty(token, "tp");
			tp.getTokenPath().stop();
			tp.getRandomPath().stop();
		}
	}
	
	static async loadTokenSettings(token) {
		let settings = undefined;
		try {
			settings = JSON.parse(token.getFlag("automatic-token-movement", token.id));
		} catch (e) {
			//TODO: Change to logger.err
			logger.log(e);
		}
		logger.log("Loading settings for " + token.id);
		let tp = new PathController(token.id);
		if (settings != undefined) {
			logger.log(token.id + " settings defined");
			tp.setCurrentPath(settings.currentPath);
			tp.getTokenPath().setSettings(settings.tokenPath);
			tp.getRandomPath().setSettings(settings.randomPath);
		}
		setProperty(token, "tp", tp);
	}
	
	static async saveTokenSettings(token) {
		logger.log("Saving settings for " + token.id);
		//TODO: Go through all path type
		//TODO: Implement Get settings function, so that large properties will not need to be deleted
		//		This will fix texture bug after deleting it from object for saving
		token.tp.getRandomPath().cleanup();
		token.tp.getTokenPath().cleanup();
		var prop = stringify(getProperty(token, "tp"));
		logger.log(prop);
		token.setFlag("automatic-token-movement", token.id, stringify(getProperty(token, "tp")));
		//token.tp.getRandomPath().restore();
		//token.tp.getTokenPath().restore();
		//getProperty(token, "tp", tp);
	}
}

class PathController {
	constructor(tokenId) {
		//TODO Create ENUM for each path type
		this.currentPath = 0;
		this.tokenPath = new tokenPath(tokenId);
		this.randomPath = new randomPath(tokenId);
	}
	
	setCurrentPath(currentPath) {
		this.currentPath = currentPath;
	}
	
	getCurrentPath() {
		return this.currentPath;
	}
	getTokenPath() {
		return this.tokenPath;
	}
	getRandomPath() {
		return this.randomPath;
	}
	
	cleanup() {
		this.tokenPath.cleanup();
		this.randomPath.cleanup();
	}
	
	removeClickHandler(mm) {
		canvas.mouseInteractionManager.target.removeListener("click", this.clickHandler, this);
	}
		
	renderPath(ind) {
		this.tokenPath.deletePath();
		this.randomPath.deletePath();
		if (ind == 1){
			this.tokenPath.renderPath();
		} else if (ind == 2) {
			this.randomPath.renderPath();
		}
	}
	
	async clickHandler(e, f) {
		if (e.data.button == 0) {

			let gridsize = canvas.scene.data.grid;
			let x = Math.floor(Math.floor(e.data.global.x / gridsize) + Math.ceil(canvas.scene.data.padding * canvas.scene.data.width / gridsize)) * gridsize;
			let y = Math.floor(Math.floor(e.data.global.y / gridsize) + Math.ceil(canvas.scene.data.padding * canvas.scene.data.height / gridsize)) * gridsize;

			if (this.currentPath == 1) {
				let path = this.tokenPath;
				path.addPoint({"x":x,"y":y});
				path.renderPath();
				if (logger.DEBUG == true) {
					console.log(e.data.global.x, e.data.global.y);
					console.log(canvas.scene.data.padding);
					console.log((e.data.global.y + (canvas.scene.data.padding * canvas.scene.data.height)));
					console.log(x, y);
				}
			}
			else if (this.currentPath == 2) {
				let path = this.randomPath;
				path.addPoint({"x":x,"y":y});
				path.renderPath();
			}
		}
	}
}

class path {
	constructor(tokenId) {
		this.tokenId = tokenId;
		//this.token = canvas.tokens.get(this.tokenId);
		this.walking = false;
		this.renderedTokenPath = null;
		this.wallsLayerIndex = canvas.layers.findIndex(function (element) {
			return element.constructor.name == "WallsLayer";
		});
		this.delay = 1000;
		
		this.gridsize = canvas.scene.data.grid;
		
		let graphics = new PIXI.Graphics();
		graphics.beginFill(0xFFFF00, 0.3);
		graphics.drawRect(0, 0, this.gridsize, this.gridsize);
		graphics.endFill();
		this.texture = canvas.app.renderer.generateTexture(graphics);
		this.renderedTokenPath = new PIXI.Container();
	}
	
	
	async moveToken() {
		//Abstract
		throw "Needs to be implemented";
	}
	
	renderPath() {
		//Abstract
		throw "Needs to be implemented";
	}
	
	/*cleanup() {
		//Abstract
		//Cleanup any large objects like drawings before saving, like PIXI.graphics
		throw "Needs to be implemented";
	}
	
	restore() {
		//Abstract
		//Restore any large objects, like this.texture
		throw "Needs to be implemented";
	}*/
	
	cleanup() {
		//Cleanup any large objects like drawings before saving, like PIXI.graphics
		this.deletePath();
		delete this.renderedTokenPath;
		if (this.texture != null)
			this.texture.destroy(false);
		delete this.texture;
	}
	
	/*restore() {
		let graphics = new PIXI.Graphics();
		graphics.beginFill(0xFFFF00, 0.3);
		graphics.drawRect(0, 0, this.gridsize, this.gridsize);
		graphics.endFill();
		this.texture = canvas.app.renderer.generateTexture(graphics);
		//console.log(this.texture);
		this.renderedTokenPath = new PIXI.Container();
	}*/
	
	deletePath() {
		if (this.renderedTokenPath != null)
			this.renderedTokenPath.destroy();
		this.renderedTokenPath = new PIXI.Container();
		if (this.texture == undefined) {
			let graphics = new PIXI.Graphics();
			graphics.beginFill(0xFFFF00, 0.3);
			graphics.drawRect(0, 0, this.gridsize, this.gridsize);
			graphics.endFill();
			this.texture = canvas.app.renderer.generateTexture(graphics);
		}
	}

	async start() {
		this.walking = true;
		await this.walkingLoop();
	}
	
	async walkingLoop() {
		//TODO: Make sure this code is fine the way its working and not use something else like Promise.all
		//var f = async function () {await Promise.all([console.log("Hello World"), f(), sleep(this.delay)])}
		
		if (this.walking) {
//			await new Promise(  () => this.moveToken() ).then(
//								() => logger.log(delay)).then(
//								() => this.walkingLoop.bind(this));
			await new Promise(async () =>{
										await this.moveToken();
										//logger.log(this.delay);
										//sleep(this.delay);
										await setTimeout(this.walkingLoop.bind(this), this.delay);
										
										//await this.walkingLoop();//.bind(this);
									});
			/*await Promise.all([
				this.moveToken()
				sleep(this.delay)
			]).then (() => this.walkingLoop.bind(this));*/
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
	
	setSettings(settings) {
		for (var prop in settings) {
			this[prop] = settings[prop];
		}	
	}
}

class tokenPath extends path{
	
	constructor(...args) {
		super(...args)

		//this.points = [{x:0,y:0}, {x:canvas.scene.data.grid,y:0}, {x:0,y:2}];
		this.renderedTokenPath = new PIXI.Container();
		this.points = [];
		this.pointsIndex = 0;
		this.walking = false;
		this.wallsLayerIndex = canvas.layers.findIndex(function (element) {
			return element.constructor.name == "WallsLayer";
		});
		/*this.gridsize = canvas.scene.data.grid;

		//this.texture = new PIXI.RenderTexture.create({width: this.gridsize, heigh: this.gridsize});
		let graphics = new PIXI.Graphics();
		graphics.beginFill(0xFFFF00, 0.3);
		graphics.drawRect(0, 0, this.gridsize, this.gridsize);
		graphics.endFill();
		this.texture = canvas.app.renderer.generateTexture(graphics);*/
	}
	
	setTokenId(tokenId) {
		this.tokenId = tokenId;
	}
	
	addPoint(point) {
		let length = this.points.length;
		if (length == 0 || !canvas.layers[this.wallsLayerIndex].checkCollision(new Ray({x:this.points[length-1].x+1, y:this.points[length-1].y+1}, {x:point.x+1, y:point.y+1}))) {
			this.points.push(point);
		} else {
			//TODO: Notify that the token will collide through alert/red popup
			logger.log("Target will collide with wall and cannot walk this path");
		}
	}
	
	async nextPoint() {
		this.pointsIndex = (this.pointsIndex+1)%this.points.length;
		return this.points[this.pointsIndex];
	}
	
	async moveToken() {	
		logger.log("Token Path Movement");
		let token = canvas.tokens.get(this.tokenId);
		let wallsLayerIndex = canvas.layers.findIndex(function (element) {
			return element.constructor.name == "WallsLayer";
		});
		
		let startingIndex = this.pointsIndex;
		let destination = await this.nextPoint();

		if (!canvas.layers[wallsLayerIndex].checkCollision(new Ray({x:token.x+1,y:token.y+1}, destination))) {
			token.update(destination);
		}
		return 0;
	}
	
	renderPath() {
		//TODO: Draw with sprite supposed to be faster, but will need to keep track of them all and delete them in cleanup
		//https://stackoverflow.com/questions/32078129/how-to-draw-multiple-instances-of-the-same-primitive-in-pixi-js
		this.deletePath();
		//let r = new PIXI.Graphics;
		//r.beginFill(0xFFFF00, 0.3);
		for (let point of this.points) {
			let r = new PIXI.Sprite(this.texture);
			r.position.x = point['x'];
			r.position.y = point['y'];
			this.renderedTokenPath.addChild(r);
			//var r = new PIXI.
			//let point = this.points[pointIndex];
			//console.log(point)
			//let x1 = point['x'];// * this.gridsize;
			//let y1 = point['y'];// * this.gridsize;
			//console.log(x1, y1, this.gridsize, this.gridsize);
			//r.drawRect(x1, y1, this.gridsize, this.gridsize);
		}
		if (this.points.length > 1) {
			for (let i = 1; i < this.points.length; i++) 
			{
				//let r = new PIXI.Graphics();
				let x1 = this.points[i-1].x + (this.gridsize / 2);
				let y1 = this.points[i-1].y + (this.gridsize / 2)
				let x2 = this.points[i].x + (this.gridsize / 2);
				let y2 = this.points[i].y + (this.gridsize / 2);
				//r.lineStyle(4, 0x000000, 1).moveTo(this.points[i-1].x + (this.gridsize / 2), this.points[i-1].y + (this.gridsize / 2)).lineTo(this.points[i].x + (this.gridsize / 2) , this.points[i].y + (this.gridsize / 2));
				//r.endFill();
				let r = drawArrow(x1, y1, x2, y2, this.gridsize);
				let ray = new Ray({x:x1, y:y1}, {x:x2, y:y2});
				this.renderedTokenPath.addChild(r);
			}
		}
	
		//r.endFill();
		
		
		//this.renderedTokenPath = r;
		canvas.app.stage.addChild(this.renderedTokenPath);
	}
	
	/*cleanup() {
		//Cleanup any large objects like drawings before saving, like PIXI.graphics
		this.deletePath();
		if (this.texture != null)
			this.texture.destroy(false);
		delete this.texture;
	}
	
	restore() {
		let graphics = new PIXI.Graphics();
		graphics.beginFill(0xFFFF00, 0.3);
		graphics.drawRect(0, 0, this.gridsize, this.gridsize);
		graphics.endFill();
		this.texture = canvas.app.renderer.generateTexture(graphics);
		this.renderedTokenPath = new PIXI.Container();
	}*/
}

class randomPath extends path{
	constructor(...args) {
		super(...args);
		//this.renderedTokenPath = new PIXI.Container();
		let token = canvas.tokens.get(this.tokenId);
		this.startX = token.x;
		this.startY = token.y;
		this.keepStartingPoint = true;
		this.points = [];
		this.xRange = [0, 5];
		this.yRange = [0, 5];
		this.startingPoint = "topleft";
		//this.gridsize = canvas.scene.data.grid;
	}
	
	moveToken() {
		let token = canvas.tokens.get(this.tokenId);
		if (!this.keepStartingPoint) {
			this.startX = token.x;
			this.startY = token.y;
		}
//		logger.log(this.startX);
//		logger.log(this.startY);
//		logger.log(this.xRange);
//		logger.log(this.yRange);
		
		//TODO: Generate random number between this.xRange[1] * this.yRange[1] + this.points.length
		//this.points corresponds to the last x numbers, where x is this.points.length
		//Then do r = Math.rand...
		//r/this.yRange[1], r%this.yRange[1]
		let square = (this.xRange[1] * this.yRange[1]);
		let indices = square + this.points.length;
		let index = Math.floor(Math.random() * indices);
		let destination = null;
		if (index >= square ) {
			destination = this.points[index - square];
		} else {
			let x = (index % this.yRange[1]) * this.gridsize + this.startX;
			let y = (index / this.yRange[1]) * this.gridsize + this.startY;
			destination = {x:x, y:y};
		}
//		console.log(destination);
		//let x = Math.floor(Math.random() * this.xRange[1] + this.xRange[0]) * (Math.round(Math.random()) ? 1 : -1) * this.gridsize + this.startX;
		//let y = Math.floor(Math.random() * this.yRange[1] + this.yRange[0]) * (Math.round(Math.random()) ? 1 : -1) * this.gridsize + this.startY;
		//let destination = {x:x, y:y};
		
		let ray = new Ray({x:token.x + 1,y:token.y + 1}, {x:destination.x+1, y:destination.y+1});
		destination.rotation = ray.angle * -180/Math.PI;
		if (!canvas.layers[this.wallsLayerIndex].checkCollision(ray)) {
			this.delay = 500*ray.distance/50;
			token.update(destination);
		}
		return 0;
	}
	
	addPoint(point) {
		//TODO: Doesn't check if in range of default square
		//logger.log(JSON.stringify(this.points));logger.log( JSON.stringify(point));
		//logger.log(!this.points.some(e => ((e.x == point.x) && (e.y == point.y))));
		let index = this.points.findIndex(e => ((e.x == point.x) && (e.y == point.y)));
		if (index == -1) {
			this.points.push(point);
		} else {
			this.points.splice(index, 1);
		}
	}
	
	renderPath() {
		this.deletePath();
		
		for (let point of this.points) {
			let r = new PIXI.Sprite(this.texture);
			r.position.x = point['x'];
			r.position.y = point['y'];
			this.renderedTokenPath.addChild(r);
			//var r = new PIXI.
			//let point = this.points[pointIndex];
			//console.log(point)
			//let x1 = point['x'];// * this.gridsize;
			//let y1 = point['y'];// * this.gridsize;
			//console.log(x1, y1, this.gridsize, this.gridsize);
			//r.drawRect(x1, y1, this.gridsize, this.gridsize);
		}
		var r = new PIXI.Graphics();
		r.beginFill(0xFFFF00, 0.3);

	
		// set the line style to have a width of 5 and set the color to red
	//	r.lineStyle(5, 0xFF0000);

		//r.lineStyle(6, 0x000000, 0.5).moveTo(token.x, token.y).lineTo(token.x + 100, token.y + 100)
		//	.lineStyle(4, 0xFFFFFF, 0.25).moveTo(token.x, token.y).lineTo(token.x + 100, token.y + 100);
			
		// draw a rectangle
		//console.log(((this.negative) ? -1 : 0) * this.xRange[1] * this.gridsize + this.startX, ((this.negative) ? 1 : 0) * this.yRange[1] * this.gridsize + this.startY,
			//this.xRange[1] * this.gridsize + this.startX, this.yRange[1] * this.gridsize + this.startY);
		var x1 = this.startX;
		var y1 = this.startY;
		var x2 = this.xRange[1] * this.gridsize;
		var y2 = this.yRange[1] * this.gridsize;
		
		switch (this.startingPoint) {
			case "topleft":
				break;
			case "middle":
				x1 -= x2;
				y1 -= y2;
				x2 *= 2;
				y2 *= 2;
				break;
			default:
				break;
		}
		//r.drawRect(((this.negative) ? -1 : 0) * this.xRange[1] * this.gridsize + this.startX, this.xRange[1] * this.gridsize + this.startX,
		//			((this.negative) ? -1 : 0) * this.yRange[1] * this.gridsize + this.startY, this.yRange[1] * this.gridsize + this.startY);
		r.drawRect(x1, y1, x2, y2);
		r.endFill();
		this.renderedTokenPath.addChild(r);
		//r.blendMode = PIXI.BLEND_MODES.NORMAL;

	//	stage.addChild(graphics);
		
		//this.renderedTokenPath = r;
		canvas.app.stage.addChild(this.renderedTokenPath);//, tex, false, transform, false);
	
	}
	
	getRange() {
		return [this.xRange, this.yRange];
	}
	
	setRange(x1, x2, y1, y2) {
		this.xRange = [x1, x2];
		this.yRange = [y1, y2];
	}
	
	setGridsize(gridsize) {
		this.gridsize = gridsize;
	}
	
	getKeepStartingPoint() {
		return this.keepStartingPoint;
	}
	
	setKeepStartingPoint(keepStartingPoint) {
		this.keepStartingPoint = keepStartingPoint;
	}
	
	setStartingPoint(startingPoint) {
		this.startingPoint = startingPoint;
	}
	
	getStartingPoint() {
		return this.startingPoint;
	}
	
	/*cleanup() {
		this.deletePath();
	}
	
	restore() {
		let graphics = new PIXI.Graphics();
		graphics.beginFill(0xFFFF00, 0.3);
		graphics.drawRect(0, 0, this.gridsize, this.gridsize);
		graphics.endFill();
		this.texture = canvas.app.renderer.generateTexture(graphics);
		this.renderedTokenPath = new PIXI.Container();
	}*/
}

class movementMenu extends FormApplication {
	
	constructor(token, ...args) {
		super(...args);
		this.token = token;
		canvas.mouseInteractionManager.target.addListener("click", this.token.tp.clickHandler, this.token.tp);
		Hooks.once("closemovementMenu", this.token.tp.removeClickHandler.bind(this.token.tp));
	}
	
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			template : "modules/automatic-token-movement/templates/token-config.html",
			width : 600,
			height : "auto",
			classes: ["sheet", "token-sheet"],
			title : "Movement Menu Options",
			closeOnSubmit : true,
			id : "movement-menu-container"
        });
	}
	
	async getData() {
		let ranges = this.token.tp.getRandomPath().getRange();
		var startingPoint = "filler val";
		if (this.token.tp.getRandomPath().getKeepStartingPoint()) {
			startingPoint = "checked";
		}
		return {
				startingPoint: startingPoint,
				tokenId: this.token.id,
				selectedPathType: this.token.tp.getCurrentPath(),
				selectedStartingPoint: this.token.tp.getRandomPath().getStartingPoint(),
				minX: ranges[0][0],
				maxX: ranges[0][1],
				minY: ranges[1][0],
				maxY: ranges[1][1],
				vision: true
				};
	}
	
	activateListeners(html) {
		const body = $("#movement-menu-container");
		
		const position = $("#position");
		const positionButton = $(".positionButton");
		const vision = $("#vision");
		const visionButton = $(".visionButton");
		
		const nonePathType = $("#noneForm");
		const assignedPathType = $("#assignedForm");
		const randomPathType = $("#randomForm");
		
		const token = this.token;
		
		position.toggleClass("hide");
		
		let currentBody = position;
		let currentPathType = [nonePathType, assignedPathType, randomPathType][this.token.tp.getCurrentPath()];
		currentPathType.toggleClass("hide");
		super.activateListeners(html);
		
		
		$(".item").click (function() {
            currentBody.toggleClass("hide");
            if ($(this).hasClass("positionButton")) {
				logger.log("position");
                currentBody = position;
            } else if ($(this).hasClass("visionButton")) {
				logger.log("vision");
                currentBody = vision;
            }
			currentBody.toggleClass("hide");
            body.height("auto");
		});
		
		$("#pathType").change (function() {
			logger.log("click");
			currentPathType.toggleClass("hide");
			logger.log(JSON.stringify($(this)));
			let val = $(this).val()
			if (val == "none") {
				logger.log("assigned");
				currentPathType = nonePathType;
				token.tp.setCurrentPath(0);
				token.tp.renderPath(0);
			} else if (val == "assigned") {
				logger.log("random");
				currentPathType = assignedPathType;
				token.tp.setCurrentPath(1);
				token.tp.renderPath(1);
			} else if (val == "random") {
				currentPathType = randomPathType;
				token.tp.setCurrentPath(2);
				token.tp.renderPath(2);
			}
			currentPathType.toggleClass("hide");
			body.height("auto");
		});
	}
	
	get title() {
		return "Automatic Movement";
	}
	
	async _updateObject(event, formData) {
		console.log("updateObject");
		console.log(event);
		console.log(formData);
		let token = canvas.tokens.get(formData.tokenId);

		if (formData.pathType == "none") {
			console.log("none");
			pathManager.stopAll([token]);
			token.tp.setCurrentPath(0);
		}
		else if (formData.pathType == "assigned") {
			console.log("assigned");
			token.tp.setCurrentPath(1);
		}
		else if (formData.pathType == "random") {
			console.log("random");
			randomPath = token.tp.getRandomPath();
			randomPath.setKeepStartingPoint(formData.startingPoint);
			randomPath.setDefaultDelay(formData.delay);
			randomPath.setStartingPoint(formData.asdf)
			randomPath.setRange(formData.minX, 
								formData.maxX,
								formData.minY,
								formData.maxY
								);
			
			//randomPath.stop();
			//setTimeout(randomPath.start.bind(this), 1000);

			token.tp.setCurrentPath(2);
			
		}
		await pathManager.saveTokenSettings(token);
		return;
	}
	
	/*_onSourceChange(event) {
		console.log("ONSOURCHAWSE");
        event.preventDefault();
        const field = event.target;
        const form = field.form;
        if (!form.name.value) form.name.value = field.value.split("/").pop().split(".").shift();
    }*/
}

async function sleep(ms) {
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


var hook = Hooks.on("controlToken", (token, html, options) => {
	//DhH3RjzlrEauI80x
	//setProperty(token, "data.tp", "someValasdf")
	//console.log(JSON.stringify(new PathController(token.id)));
	
});


Hooks.on("renderTokenHUD", (tokenHUD, html, options) => {
	logger.log("renderTokenHUD");
	if (!game.user.isGM) return;

	let tokenId = getProperty(tokenHUD.object, "data._id");
	let token = canvas.tokens.get(tokenId);
	
	//let ranges = token.tp.getRandomPath().getRange();
	let controlsLayerIndex = canvas.layers.findIndex(function (element) {
		return element.constructor.name == "ControlsLayer";
	});
	
	
	logger.log("not GM, token: " + tokenId);
	let linearWalkHUD = $(`
		<div class="control-icon" style="margin-left: 4px;"> \ 
			<img id="linearHUD" src="modules/foundry-patrol/imgs/svg/line.svg" width="36" height="36" title="Linear Walk"> \
		</div>
	`);
	const patrolMenu = $(`<i class="control-icon fas fa-caret-down" style="margin-left: 4px;" title="Patrol Menu"></i>`);

	const patrolDiv = $(`
		<div class="patrolDiv" style="display: flex;  flex-direction: row; justify-content: center; align-items:center; margin-right: 75px;">\
		</div>
	`);

	html.find(".left").append(patrolDiv);
	html.find(".patrolDiv").append(linearWalkHUD);
	html.find(".right").append(patrolMenu);

	patrolMenu.click((e) => {
		if (!hasProperty(token, "tp")) {
			pathManager.loadTokenSettings(token);
		}
		if (token.tp.getCurrentPath() == 1)
			token.tp.getTokenPath().renderPath();
		else if (token.tp.getCurrentPath() == 2)
			token.tp.getRandomPath().renderPath();
		var mm = new movementMenu(token);
		mm.render(true);
		Hooks.once("closemovementMenu", (mm) => {
			mm.token.tp.cleanup();
			//mm.token.tp.getRandomPath().cleanup()
		});
	});

	linearWalkHUD.click(async (e) => {
		//console.log(stringify(e));
		//return;
		logger.log("starting/stopping walk for " + token.id);
		let id = e.target.getAttribute("src");
		if (!hasProperty(token, "tp")) {
			pathManager.loadTokenSettings(token);
		}
		let path = null;
		if (token.tp.getCurrentPath() == 1) {
			logger.log("Token Path");
			path = token.tp.getTokenPath();
		} else if (token.tp.getCurrentPath() == 2) {
			logger.log("Random Path");
			path = token.tp.getRandomPath();
		} else {
			logger.log("No Path");
			return;
		}
		if (path.getWalking()) {
			await path.stop();
		} else {
			await path.start();
		}
		return;
		//TODO: This is the code to get all selected tokens, for mass turn on/off
		// The code that assists this needs to be redone with the current saving
		let tokenLayerIndex = canvas.layers.findIndex(function (element) {
			return element.constructor.name == "TokenLayer";
		});
		logger.log(tokenId);
		controlledTokens = canvas.layers[tokenLayerIndex].controlled.filter(token => token._controlled);
		tokens = controlledTokens.map(element => canvas.tokens.get(element.id));
		sos = pathManager.startOrStop(tokens)
		logger.log("startOrStop? " + sos);
		if (sos) {
			pathManager.startAll(tokens, randomPath);
		} else {
			pathManager.stopAll(tokens);
		}
	});
});
_pointerDown = function(e, f) {
	logger.log("Mouse DOWN");
	logger.log(e.data.button);
	var gridsize = canvas.scene.data.grid;
	var x = Math.floor(Math.floor(e.data.global.x / gridsize) + Math.ceil(canvas.scene.data.padding * canvas.scene.data.width / gridsize)) * gridsize;
	var y = Math.floor(Math.floor(e.data.global.y / gridsize) + Math.ceil(canvas.scene.data.padding * canvas.scene.data.height / gridsize)) * gridsize;
	console.log(e.data.global.x, e.data.global.y);
	console.log(canvas.scene.data.padding);
	console.log((e.data.global.y + (canvas.scene.data.padding * canvas.scene.data.height)));
	console.log(x, y);
	var r = new PIXI.Graphics();
	r.beginFill(0xFFFF00, 0.3);
	r.drawRect(x, y, gridsize, gridsize);
	r.endFill();
		
	canvas.app.stage.addChild(r);
	//logger.log(stringify(e.data));
}
/*
_rightPointerUp = function(e, f) {
	if (listen == null) {
		listen = canvas.mouseInteractionManager.target.addListener("click", _pointerDown);
	} else {
		canvas.mouseInteractionManager.target.removeListener("click", _pointerDown);
		listen=null;
		logger.log(e.data.button);
	}
	//logger.log(stringify(e.data));
}
*/
drawArrow = function (x1, y1, x2, y2, gridsize) {
	let r = new PIXI.Graphics();
	let ray = new Ray({x:x2, y:y2}, {x:x1, y:y1});
	r.lineStyle(4, 0x000000, 1).moveTo(x1, y1).lineTo(x2, y2)
		.lineTo((Math.cos(ray.angle + Math.PI/4) * gridsize/4) + x2, (Math.sin(ray.angle + Math.PI/4) * gridsize/4) + y2)
		.moveTo(x2, y2)
		.lineTo((Math.cos(ray.angle - Math.PI/4) * gridsize/4) + x2, (Math.sin(ray.angle - Math.PI/4) * gridsize/4) + y2)
	r.endFill();
	return r;
}
var listen = null;
Hooks.on("ready", (tokenHUD, html, options) => {
	window.addEventListener('keydown', e => {
		if (e.keyCode == 80) {
			let tokenLayerIndex = canvas.layers.findIndex(function (element) {
				return element.constructor.name == "TokenLayer";
			});
			//logger.log(tokenId);
			controlledTokens = canvas.layers[tokenLayerIndex].controlled.filter(token => token._controlled);
			tokens = controlledTokens.map(element => canvas.tokens.get(element.id));
			sos = pathManager.startOrStop(tokens).then(sos => {
				logger.log("startOrStop? " + sos);
				if (sos) {
					pathManager.startAll(tokens);
				} else {
					pathManager.stopAll(tokens);
				}
			});
		}
	});
	//canvas.addEventListener("pointerdown", this._pointerDown);
	//canvas.mouseInteractionManager.target.addListener("rightup", _rightPointerUp);
	/*var r = new PIXI.Graphics();
	
	r.lineStyle(1, 0x000000).moveTo(0, 0).lineTo(1000, 1000);
	
	r.endFill();

	canvas.app.stage.addChild(r);*/
	
});
console.log("automatic-movement hooked in");
//CONFIG.debug.hooks = true;


