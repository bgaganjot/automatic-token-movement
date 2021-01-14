class tokenMove {
	constructor() {}
	
	
}

Hooks.on("renderChatMessage", async function (msg) {
  token = msg.data.speaker.token;
  console.log("automatic-movement: " + JSON.stringify(token));
  center = token.getCenter();
  console.log("automatic-movement: " + center);
  token.setPosition(1,1);
  
});

