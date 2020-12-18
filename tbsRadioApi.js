const http = require('http');
const url = require('url');
const debug = require('debug')('tbs-web-api');
const args = require('minimist')(process.argv.slice(2));
const fetch = require('node-fetch');
const os = require('os');
const pkg = require('./package.json');
const util = require('util');
const events = require('events');
const querystring = require('querystring');
const chalk = require('chalk');

var hostname = '127.0.0.1';
var port = 3001;
var currentRequestId = 1;
var timeoutDiscovery = 5000;
var reconnectInterval = 300000;
var discoveryInterval = 60000;
var discoveryRuns = 4;
var groupManagement = true;
var windows = false;
var thisVersion = pkg.version;

var devices = [];

interpretArguments();
if (!windows) {
	startApi();
} else {
	console.log( process.argv[1].substring(0, process.argv[1].length - 17) );
}

function startApi() {
	//console.log('cast-web-api v'+thisVersion);
	//console.log('Discovering devices, please wait...');
	createWebServer();
}

//HANDLE ARGUMENTS
function interpretArguments() {
	log('debug', 'interpretArguments()', JSON.stringify(args));
	if (getNetworkIp()) {
		hostname = getNetworkIp();
	}
	if (args.hostname) {
		hostname = args.hostname;
	}
	if (args.port) {
		port = args.port;
	}
	if (args.timeoutDiscovery) {
		timeoutDiscovery = args.timeoutDiscovery;
	}
	if (args.reconnectInterval) {
		reconnectInterval = args.reconnectInterval;
	}
	if (args.discoveryInterval) {
		discoveryInterval = args.discoveryInterval;
	}
	if (args.discoveryRuns) {
		discoveryRuns = args.discoveryRuns;
	}
	if (args.groupManagement) {
		groupManagement = (args.groupManagement == 'true');
	}
	if (args.windows) {
		windows = true;
	}
}

//GET NETWORK IP
function getNetworkIp() {
	var interfaces = os.networkInterfaces();
	var addresses = [];
	for (var k in interfaces) {
		for (var k2 in interfaces[k]) {
			var address = interfaces[k][k2];
			if (address.family === 'IPv4' && !address.internal) {
				addresses.push(address.address);
			}
		}
	}
	log('debug', 'getNetworkIp()', 'addresses: ' + addresses);
	return addresses[0];
}

//WEBSERVER
function createWebServer() {
	const server = http.createServer((req, res) => {
		var parsedUrl = url.parse(req.url, true);
		var path = parsedUrl['pathname'].split('/');
		var requestBuffer = '';
		var requestData = null;

		req.on('data', function (data) {
            requestBuffer += data;
        });

		req.on('end', function () {
			requestData = requestBuffer;
			log('debug-server', 'requestData', requestData);

			res.setHeader('Content-Type', 'application/json; charset=utf-8');

			if (path[1]=="device") {
				if (path[2]) {
					if (path[2] == 'startTbsRadio') {
					        try {
					             startTbsRadio();
					             res.statusCode = 200;
					             res.end( JSON.stringify( {response: 'ok'} ) );
					        } catch (e) {
					             res.statusCode = 404;
					             res.end( JSON.stringify( {response: 'error', error: e} ) );
						}
					}
					if (path[2] == 'stopTbsRadio') {
						try {
					             stopTbsRadio();
					             res.statusCode = 200;
					             res.end( JSON.stringify( {response: 'ok'} ) );
					        } catch (e) {
					             res.statusCode = 404;
					             res.end( JSON.stringify( {response: 'error', error: e} ) );
						}
					} 
				} else {
					res.statusCode = 200;
					res.end( JSON.stringify( getDevices('all') ) );
				}
			}

			if (path[1]=="config") {
				if (path[2]) {
					if (path[2]=="timeoutDiscovery") {
						if (path[3]) {
							if ( parseInt(path[3]) ) {
								timeoutDiscovery = parseInt(path[3]);
							}
						}
						res.end( JSON.stringify( { timeoutDiscovery: timeoutDiscovery } ) );
					}
					if (path[2]=="reconnectInterval") {
						if (path[3]) {
							if ( parseInt(path[3]) ) {
								reconnectInterval = parseInt(path[3]);
							}
						}
						res.end( JSON.stringify( { reconnectInterval: reconnectInterval } ) );
					}
					if (path[2]=="discoveryInterval") {
						if (path[3]) {
							if ( parseInt(path[3]) ) {
								discoveryInterval = parseInt(path[3]);
							}
						}
						res.end( JSON.stringify( { discoveryInterval: discoveryInterval } ) );
					}
					if (path[2]=="discoveryRuns") {
						if (path[3]) {
							if ( parseInt(path[3]) ) {
								discoveryRuns = parseInt(path[3]);
							}
						}
						res.end( JSON.stringify( { discoveryRuns: discoveryRuns } ) );
					}
					if (path[2]=="groupManagement") {
						if (path[3]) {
							groupManagement = (path[3] == 'true');
						}
						res.end( JSON.stringify( { groupManagement: groupManagement } ) );
					}
					if (path[2]=="version") {
						if (path[3]=="this") {
							res.end( JSON.stringify( { version: thisVersion } ) );
						}
						if (path[3]=="latest") {
							getLatestVersion()
							.then(version => {
								res.end( JSON.stringify( { version: version } ) );
							})
							.catch(errorMessage => {
								res.statusCode = 500;
								res.end( JSON.stringify( { response: error, error: errorMessage } ) );
							})
						} else {
							getLatestVersion()
							.then(version => {
								res.end( JSON.stringify( { this: thisVersion, latest: version } ) );
							})
							.catch(errorMessage => {
								res.statusCode = 500;
								res.end( JSON.stringify( { response: error, error: errorMessage } ) );
							})
						}
					}
				} else {
					res.end( JSON.stringify( { timeoutDiscovery: timeoutDiscovery, reconnectInterval: reconnectInterval, discoveryInterval: discoveryInterval, groupManagement: groupManagement, discoveryRuns: discoveryRuns } ) );
				}
			}

			if (path[1]=="memdump") {
				res.statusCode = 200;
				log( 'server', 'memory dump', util.inspect(devices) );
				res.end('ok');
			}

			if (path[1]=="") {
				res.statusCode = 200;
				res.end('{ "tbs-web-api" : "v' + thisVersion + '" }')
			}
		});
	});

	server.listen(port, () => {
	 	console.log('tbs-web-api running at http://'+hostname+':'+port+'/');
	});

	server.on('request', (req, res) => {
		if (req.url!='/favicon.ico') {
			log('server', 'on("request")', req.url);
		}
	});

	server.on('clientError', (err, socket) => {
		socket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
	});
}

function getLatestVersion() {
	return new Promise( function(resolve, reject) {
		fetch('https://raw.githubusercontent.com/vervallsweg/cast-web-api/master/package.json')
			.then(function(res) {
				return res.json();
			}).then(function(json) {
				log('debug', 'getLatestVersion()', 'JSON received: '+JSON.stringify(json));
				try {
					var version = json.version
					log('debug', 'getLatestVersion()', 'version: ' + version);
					resolve(version);
				} catch (e) {
					reject(e);
				}
			});

		setTimeout(() => {
			reject('request timeout');
		}, 5000);
	});
}

function buildMeta(functionName, message, id) {
	// {date+time}  {id_underline} {functionName}: {message}
	var date = new Date(); var time = date.toISOString(); if (id == null) { id=''; } else { time=time+' '; };
	return time + chalk.inverse(id) + ' ' + chalk.underline(functionName) + ': ' + message;
}

function log(type, functionName, message, id) {
	if (type=='info') {
		console.log( buildMeta(functionName, message, id) );
	}
	if (type=='error') {
		console.log( chalk.red( buildMeta(functionName, message, id) ) );
	}
	if (type=='debug') {
		debug( buildMeta(functionName, message, id) );
	}
	if (type=='debug-server') {
		debug( chalk.cyan( buildMeta(functionName, message, id) ) );
	}
	if (type=='debug-warn') {
		debug( chalk.yellow( buildMeta(functionName, message, id) ) );
	}
	if (type=='debug-error') {
		debug( chalk.red( buildMeta(functionName, message, id) ) );
	}
	if (type=='server') {
		console.log( chalk.cyan( buildMeta(functionName, message, id) ) );
	}
}

function startTbsRadio() {
    var exec = require('child_process').exec;
    exec("killall vlc");
    exec('cvlc -vvv rtmp://tbs.hscdn.com/tbsradio/efm/ :sout="#transcode{vcodec=none,acodec=mp3,ab=128,channels=2,samplerate=44100}:http{mux=mp3,dst=:8090/tbsefm}" :no-sout-all :sout-keep --daemon', (err, stdout, stderr) => {
        if (err) {
            console.error('exec error: ' + err);
        }
    });
}

function stopTbsRadio() {
    var exec = require('child_process').exec;
    exec("killall vlc");
}

