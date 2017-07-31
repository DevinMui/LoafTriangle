let express = require('express');
var path = require('path');
let ejs = require('ejs');
let bodyParser = require('body-parser');
let logger = require('morgan');
let pretty = require('express-prettify');
// TODO: Change everything to be more ES6
let KalmanFilter = require('kalmanjs');
let app = express();

app.use(pretty({ query: 'pretty' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view cache', true);
app.set('view engine', 'ejs');

let initNodes = [];
let nodes = [];
let nodeTrilateration = [];
let calibrate = []; // a bunch of rssi values from a device at 1m away
let txPower = 0; // txpower is also represented 

app.get('/kalman', function(req,res){
	calibrate = calcKalman(calibrate);
	let sum = 0;
	for(data of calibrate){
		sum+=data;
	}
	avg = sum/data.length;
	txPower = avg;
	res.json({txPower: txPower})
});

app.get('/', function(req,res){
	// res.json({success: true, message: 'welcome to experiment: "Finding the location of a WiFi-enabled device through Raspberry Pi Trilateration"'});
	res.render('index');
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
			nodes = datas;
			console.log(nodes)
			res.json(datas);
		});
	} else {
		res.json(nodes);
	}
});

app.get('/calculate', function(req,res){
	let datas = calcPos(nodes);
	res.json(datas);
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
	let test = [
	    {
	        "node": 1,
	        "mac": "b8:27:eb:c5:51:a0",
	        "x": null,
	        "y": null,
	        "rssis": [
	            {
	                "rssi": -49,
	                "mac": "b8:27:eb:ec:77:38"
	            },
	            {
	                "rssi": -58,
	                "mac": "b8:27:eb:6f:af:5f"
	            }
	        ]
	    },
	    {
	        "node": 2,
	        "mac": "b8:27:eb:6f:af:5f",
	        "x": null,
	        "y": null,
	        "rssis": [
	            {
	                "rssi": -55,
	                "mac": "b8:27:eb:c5:51:a0"
	            },
	            {
	                "rssi": -48,
	                "mac": "b8:27:eb:ec:77:38"
	            }
	        ]
	    },
	    {
	        "node": 0,
	        "mac": "b8:27:eb:ec:77:38",
	        "x": null,
	        "y": null,
	        "rssis": [
	            {
	                "rssi": -56,
	                "mac": "b8:27:eb:6f:af:5f"
	            },
	            {
	                "rssi": -61,
	                "mac": "b8:27:eb:c5:51:a0"
	            }
	        ]
    	}
    ];
    nodes = test;
	res.json(test);
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

function calcKalman(data){
	let kalmanFilter = new KalmanFilter({R: 0.01, Q: 3});
	let data = data.map(function(v){
		return kalmanFilter.filter(v);
	});
	return data;
}

function calcPos(datas){
	datas[0].x = 0;
	datas[0].y = 0;
	let rssis = datas[1].rssis;
	for(rssi of rssis){
		rssi.distance = convertToFeet(calculateDistance(rssi.rssi));
		for(node of datas){
			if(node.node===0 && rssi.mac === node.mac){
				datas[1].x = calculateDistance(rssi.rssi);
				break;
			}
		}
	}
	datas[1].y = 0;
	rssis = datas[0].rssis;
	let k1;
	let k2;
	let k3;
	for(rssi of rssis){
		rssi.distance = convertToFeet(calculateDistance(rssi.rssi));
		for(node of datas){
			if(node.node===1 && rssi.mac === node.mac){
				k1 = calculateDistance(rssi.rssi);
			} else {
				k2 = calculateDistance(rssi.rssi);
			}
		}
	}
	rssis = datas[1].rssis;
	for(rssi of rssis){
		rssi.distance = convertToFeet(calculateDistance(rssi.rssi));
		for(node of datas){
			if(node.node===2 && rssi.mac === node.mac){
				k3 = calculateDistance(rssi.rssi);
			}
		}
	}
	rssis = datas[2].rssis;
	for(rssi of rssis){
		rssi.distance = convertToFeet(calculateDistance(rssi.rssi));
	}
	// law of cosines
	let c = Math.acos( (k1**2+k2**2-k3**2) / (2*k1*k2) );
	datas[2].x = k1*Math.sin(c);
	datas[2].y = k1*Math.cos(c);
	return datas;
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

function convertToFeet(meters){
	return meters*3.28084
}

function calculateDistance(rssi,a0=txPower){
	let n = 2; // for indoor purposes, n = 2 should suffice
	let d = 10 ** ((a0 - rssi) / (10*n));
	return d;
}

app.listen(3000, "0.0.0.0", function(){
	console.log('Running on port 3000');
});