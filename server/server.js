let express = require('express');
let bodyParser = require('body-parser');
let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


let initNodes = [];
let nodes = [];

app.post('/', function(req, res){
	nodes.push({
		node: nodes.length-1,
		mac: req.body.mac,
		x: null,
		y: null,
		rssis: req.body.rssis
	});
	if(nodes.length>=3){
		calcPos(nodes, function(datas){
			res.json(datas);
		});
	} else {
		res.json(nodes)
	}
});

app.post('/track', function(req,res){
	// need to get distance
	return getTrilateration(nodes[0], nodes[1], nodes[2]);
});

app.post('/init', function(req,res){
	initNodes.push({
		node: initNodes.length,
		mac: req.body.mac
	});
	res.json({length: initNodes.length});
});

app.get('/macs', function(req,res){
	res.json(initNodes);
});

app.get('/reset', function(req,res){
	initNodes = [];
	nodes = [];
	res.json({'success': true, message: 'resetted'});
});

function calcPos(nodes, callback){
	nodes[0].x = 0;
	nodes[0].y = 0;
	let rssis = nodes[1].rssis;
	for(rssi in rssis){
		if(rssi.node===0){
			nodes[1].x = rssi.rssi;
		}
	}
	nodes[1].y = 0;
	let rssis = nodes[0].rssis;
	let k1;
	let k2;
	let k3;
	for(rssi in rssis){
		if(rssi.node===1){
			k1 = rssi.rssi;
		} else {
			k2 = rssi.rssi;
		}
	}
	let rssis = nodes[1].rssis;
	for(rssi in rssis){
		if(rssi.node===2){
			k3 = rssi.rssi;
		}
	}
	let c = Math.acos( (k1**2+k2**2-k3**2) / (2*k1*k2) );
	nodes[2].x = k1*Math.sin(c);
	nodes[2].y = k1*Math.cos(c);
	callback(nodes);
}

// copypastad from github (https://gist.github.com/kdzwinel/8235348): issues with same x coord
// https://github.com/gheja/trilateration.js/blob/master/trilateration.js (3d space)
function getTrilateration(position1, position2, position3) {
	var xa = position1.x;
	var ya = position1.y;
	var xb = position2.x;
	var yb = position2.y;
	var xc = position3.x;
	var yc = position3.y;
	var ra = position1.rssi;
	var rb = position2.rssi;
	var rc = position3.rssi;

	var S = (Math.pow(xc, 2.) - Math.pow(xb, 2.) + Math.pow(yc, 2.) - Math.pow(yb, 2.) + Math.pow(rb, 2.) - Math.pow(rc, 2.)) / 2.0;
	var T = (Math.pow(xa, 2.) - Math.pow(xb, 2.) + Math.pow(ya, 2.) - Math.pow(yb, 2.) + Math.pow(rb, 2.) - Math.pow(ra, 2.)) / 2.0;
	var y = ((T * (xb - xc)) - (S * (xb - xa))) / (((ya - yb) * (xb - xc)) - ((yc - yb) * (xb - xa)));
	var x = ((y * (ya - yb)) - T) / (xb - xa);

	return {
		x: x,
		y: y
	};
}

app.listen(3000, "0.0.0.0", function(){
	console.log('Running on port 3000');
});