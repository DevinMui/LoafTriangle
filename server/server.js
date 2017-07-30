let express = require('express');
let bodyParser = require('body-parser');
let logger = require('morgan');
var pretty = require('express-prettify');
let app = express();

app.use(pretty({ query: 'pretty' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(logger('dev'));

let initNodes = [];
let nodes = [];
let nodeTrilateration = [];

app.get('/', function(req,res){
	res.json({success: true, message: 'welcome to experiment: "Finding the location of a WiFi-enabled device through Raspberry Pi Trilateration"'});
});

app.get('/nodes',function(req,res){
	res.json(nodes);
});

app.post('/', function(req, res){
	nodes.push({
		node: req.body.node,
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
		res.json(nodes);
	}
});

app.get('/trilateration', function(req,res){
	res.json(nodeTrilateration);
});

app.post('/trilateration', function(req,res){
	var exists = false;
	for(var i=0;i<nodeTrilateration.length;i++){
		if(nodeTrilateration[i].mac===req.body.mac){
			nodeTrilateration[i] = req.body;
			exists = true;
		}
	}
	if(!exists){
		nodeTrilateration.push(req.body);
	}
	res.json(nodeTrilateration);
});

app.get('/track', function(req,res){
	// need to get distance
	let json = { 
		android: getTrilateration(nodeTrilateration[0], nodeTrilateration[1], nodeTrilateration[2]), 
		node0: { 
			distance: calculateDistance(nodeTrilateration[0].rssi),
			mac: nodeTrilateration[0].mac
		},
		node1: { 
			distance: calculateDistance(nodeTrilateration[1].rssi),
			mac: nodeTrilateration[1].mac
		},
		node2: {
			distance: calculateDistance(nodeTrilateration[2].rssi),
			mac: nodeTrilateration[2].mac
		}
	};
	res.json(json);
});

app.get('/init', function(req,res){
	res.json(initNodes);
	// res.json({length: initNodes.length});
});

app.get('/fake', function(req,res){
	initNodes.push({
		node: initNodes.length,
		mac: 'ff:ff:ff:ff:ff:ff'
	});
	res.json(initNodes);
});

app.post('/init', function(req,res){
	initNodes.push({
		node: initNodes.length,
		mac: req.body.mac
	});
	res.json({length: initNodes.length});
});

app.get('/reset', function(req,res){
	initNodes = [];
	nodes = [];
	nodeTrilateration = [];
	res.json({'success': true, message: 'resetted'});
});

function calcPos(nodes, callback){
	nodes[0].x = 0;
	nodes[0].y = 0;
	let rssis = nodes[1].rssis;
	for(rssi in rssis){
		if(rssi.node===0){
			nodes[1].x = calculateDistance(rssi.rssi);
		}
	}
	nodes[1].y = 0;
	let rssis = nodes[0].rssis;
	let k1;
	let k2;
	let k3;
	for(rssi in rssis){
		if(rssi.node===1){
			k1 = calculateDistance(rssi.rssi);
		} else {
			k2 = calculateDistance(rssi.rssi);
		}
	}
	let rssis = nodes[1].rssis;
	for(rssi in rssis){
		if(rssi.node===2){
			k3 = calculateDistance(rssi.rssi);
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
	var ra = calculateDistance(position1.rssi);
	var rb = calculateDistance(position2.rssi);
	var rc = calculateDistance(position3.rssi);

	var S = (Math.pow(xc, 2.) - Math.pow(xb, 2.) + Math.pow(yc, 2.) - Math.pow(yb, 2.) + Math.pow(rb, 2.) - Math.pow(rc, 2.)) / 2.0;
	var T = (Math.pow(xa, 2.) - Math.pow(xb, 2.) + Math.pow(ya, 2.) - Math.pow(yb, 2.) + Math.pow(rb, 2.) - Math.pow(ra, 2.)) / 2.0;
	var y = ((T * (xb - xc)) - (S * (xb - xa))) / (((ya - yb) * (xb - xc)) - ((yc - yb) * (xb - xa)));
	var x = ((y * (ya - yb)) - T) / (xb - xa);

	return {
		x: x,
		y: y
	};
}

// https://gist.github.com/eklimcz/446b56c0cb9cfe61d575
// rssi->meters
function calculateDistance(rssi){
	var txPower = -59; //hard coded power value. Usually ranges between -59 to -65
	if (rssi === 0) {
		return -1.0; 
	}
	var ratio = rssi*1.0/txPower;
	if (ratio < 1.0) {
		return Math.pow(ratio,10);
	} else {
		var distance =  (0.89976)*Math.pow(ratio,7.7095) + 0.111;    
		return distance;
	}
}

app.listen(3000, "0.0.0.0", function(){
	console.log('Running on port 3000');
});