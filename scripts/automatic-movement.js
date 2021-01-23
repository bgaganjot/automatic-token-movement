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
	static startOrStop(tokens) {
		for (let i = 0; i < tokens.length; i++) {
			let token = tokens[i];
			if (hasProperty(token, "tp.paths")) {
				let paths = getProperty(token, "tp.paths");
				for (let key in paths) {
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
		for (let i = 0; i < tokens.length; i++) {
			let token = tokens[i];
			let p = null;
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
		for (let i = 0; i < tokens.length; i++) {
			let token = tokens[i];
			if (hasProperty(token, "tp.paths")) {
				let paths = getProperty(token, "tp.paths");
				for (let key in paths) {
					paths[key].stop();
				}
			}
		}
	}
	
	static loadTokenSettings(token) {
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
	
	static saveTokenSettings(token) {
		logger.log("Saving settings for " + token.id);
		token.setFlag("automatic-token-movement", token.id, stringify(getProperty(token, "tp")));
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
}

class path {
	constructor(tokenId) {
		this.tokenId = tokenId;
		//this.token = canvas.tokens.get(this.tokenId);
		this.walking = false;
		this.wallsLayerIndex = canvas.layers.findIndex(function (element) {
			return element.constructor.name == "WallsLayer";
		});
		this.delay = 1000;
	}
	
	
	setSettings () {		
		//Abstract
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
	
	setSettings(settings) {
		for (var prop in settings) {
			this[prop] = settings[prop];
		}	
	}
}

class tokenPath extends path{
	
	constructor(...args) {
		super(...args)

		//this.points = [{x:0,y:0}, {x:50,y:0}, {x:0,y:100}];
		this.points = [];
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
		let token = canvas.tokens.get(this.tokenId);
		let wallsLayerIndex = canvas.layers.findIndex(function (element) {
			return element.constructor.name == "WallsLayer";
		});
		
		let startingIndex = this.pointsIndex;
		let destination = this.nextPoint();
		if (!canvas.layers[wallsLayerIndex].checkCollision(new Ray({x:token.x+1,y:token.y+1}, destination))) {
			token.update(destination);
		}
	}
	

	
}

class randomPath extends path{
	constructor(...args) {
		super(...args);
		let token = canvas.tokens.get(this.tokenId);
		this.startX = token.x;
		this.startY = token.y;
		this.keepStartingPoint = true;
		this.xRange = [0, 5];
		this.yRange = [0, 5];
		this.negative = true;
		this.gridsize = canvas.scene.data.grid;
	}
	
	moveToken() {
		let token = canvas.tokens.get(this.tokenId);
		if (!this.keepStartingPoint) {
			this.startX = token.x;
			this.startY = token.y;
		}
		logger.log(this.startX);
		logger.log(this.startY);
		logger.log(this.xRange);
		logger.log(this.yRange);
		let x = Math.floor(Math.random() * this.xRange[1] + this.xRange[0]) * (Math.round(Math.random()) ? 1 : -1) * this.gridsize + this.startX;
		let y = Math.floor(Math.random() * this.yRange[1] + this.yRange[0]) * (Math.round(Math.random()) ? 1 : -1) * this.gridsize + this.startY;
		let destination = {x:x, y:y};
		
		let ray = new Ray({x:token.x + 1,y:token.y + 1}, destination);
		destination.rotation = ray.angle * -180/Math.PI;
		if (!canvas.layers[this.wallsLayerIndex].checkCollision(ray)) {
			this.delay = 500*ray.distance/50;
			token.update(destination);
		}
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
	
}

class movementMenu extends FormApplication {
	
	constructor(token, ...args) {
		super(...args);
		this.token = token;
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
			} else if (val == "assigned") {
				logger.log("random");
				currentPathType = assignedPathType;
			} else if (val == "random") {
				currentPathType = randomPathType;
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
			pathManager.saveTokenSettings(token);
		}
		else if (formData.pathType == "random") {
			console.log("random");
			randomPath = token.tp.getRandomPath();
			randomPath.setKeepStartingPoint(formData.startingPoint);
			randomPath.setDefaultDelay(formData.delay);
			randomPath.setRange(formData.minX, 
								formData.maxX,
								formData.minY,
								formData.maxY
								);
			
			//randomPath.stop();
			//setTimeout(randomPath.start.bind(this), 1000);

			
			token.tp.setCurrentPath(2);
			pathManager.saveTokenSettings(token);
		}
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


Hooks.on("controlToken", (token, html, options) => {
	//DhH3RjzlrEauI80x
	//setProperty(token, "data.tp", "someValasdf")
	//console.log(JSON.stringify(new PathController(token.id)));
	
});


Hooks.on("renderTokenHUD", (tokenHUD, html, options) => {
	logger.log("renderTokenHUD");
	if (!game.user.isGM) return;

	let tokenId = getProperty(tokenHUD.object, "data._id");
	let token = canvas.tokens.get(tokenId);
	
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
		new movementMenu(token).render(true);
	});

	linearWalkHUD.click((e) => {
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
			path.stop();
		} else {
			path.start();
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
Hooks.on("createToken", () => {
	//logger.log("something");
});
Hooks.on("init", async function() { 
/*
	logger.log("Hello World!");
	game.settings.register("automatic-token-movement", "AutomaticMovementTemplate", {
		name: "Settings Name",
		hint: "Hint",
		scope: "client",
		config: true,
		choices: {"/modules/automatic-token-movement/templates/token-config.html" : "Yes"},
		default: "/modules/automatic-token-movement/templates/token-config.html",
		type: String,
//		onChange: (value) => {
//		  CONFIG.bubblerolls.template = value;
//		},
	  });
	CONFIG.bubblerolls.template = game.settings.get(
		"automatic-token-movement",
		"AutomaticMovementTemplate"
	);
	*/
});
Hooks.on("renderTokenConfig", (var1, html, options) => {
	//logger.log("var1: " + stringify(var1));
	//logger.log("html: " + stringify(html));
	//logger.log("options: " + stringify(options));
	/*html.find(".position").append($(`<div class="automatic-movement">
		<div class="form-group">
			<label>"TOKEN.AutoMove"</label>
			<input type="checkbox" name="automove" data-dtype="Boolean" {{checked object.automove}}/>
		</div>
	</div>
	`)); */
	
});

console.log("automatic-movement hooked in");
