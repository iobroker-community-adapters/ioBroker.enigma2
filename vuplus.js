/**
 *
 * example adapter
 *
 *
 *  file io-package.json comments:
 *
 *  {
 *      "common": {
 *          "name":         "example",                  // name has to be set and has to be equal to adapters folder name and main file name excluding extension
 *          "version":      "0.0.0",                    // use "Semantic Versioning"! see http://semver.org/
 *          "title":        "Node.js Example Adapter",  // Adapter title shown in User Interfaces
 *          "authors":  [                               // Array of authord
 *              "name <mail@example.com>"
 *          ]
 *          "desc":         "Example adapter",          // Adapter description shown in User Interfaces. Can be a language object {de:"...",ru:"..."} or a string
 *          "platform":     "Javascript/Node.js",       // possible values "javascript", "javascript/Node.js" - more coming
 *          "mode":         "daemon",                   // possible values "daemon", "schedule", "subscribe"
 *          "schedule":     "0 0 * * *"                 // cron-style schedule. Only needed if mode=schedule
 *          "loglevel":     "info"                      // Adapters Log Level
 *      },
 *      "native": {                                     // the native object is available via adapter.config in your adapters code - use it for configuration
 *          "test1": true,
 *          "test2": 42
 *      }
 *  }
 *
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";


var request		= require('request'),
    net			= require('net'),
    ping		= require("ping"),
    http		= require('http'),
    querystring	= require('querystring'),
    xml2js		= require("xml2js");

// you have to require the utils module and call adapter function
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.example.0
var adapter = utils.adapter('vuplus');

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));



    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.debug('ack is not set!');
        //OK unack Value, lets Check if its for us:
        if(id == "vuplus.0.VuPlus.COMMAND") {
            adapter.log.debug("Its our Command: " + state.val);
            //ACK
            adapter.setState(id, {val: state.val, ack: true});
            processCommand(state);
        }
    }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    if (typeof obj == 'object' && obj.message) {
        if (obj.command == 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    main();
});

function processCommand(state) {
    if (state.val == "STANDBY_TOGGLE") {
        adapter.log.info("Sending command: " + state.val);
        getResponse (state.val, 1, "/web/powerstate?newstate=0", evaluateCommandResponse);
    }
}

function getResponse (command, deviceId, path, callback){
   // var device = dreamSettings.boxes[deviceId];
    var options = {
        host: adapter.config.IPAddress,
        port: "80",
        path: path,
        method: 'GET'
    };

    adapter.log.debug("creating request for command '"+command+"' (deviceId: "+deviceId+", host: "+options.host+", port: "+options.port+", path: '"+options.path+"')");

    if (typeof adapter.config.Username != 'undefined' && typeof adapter.config.Password != 'undefined') {
        if (adapter.config.Username.length > 0 && adapter.config.Password.length > 0) {
            options.headers = {
                'Authorization': 'Basic ' + new Buffer(adapter.config.Username + ':' + adapter.config.Password).toString('base64')
            }
            adapter.log.debug("using authorization with user '"+adapter.config.Username+"'");
        } else {
            adapter.log.debug("using no authorization");
        }
    }
  /*  options.headers = {
        'Authorization': 'Basic ' + new Buffer(adapter.config.Username + ':' + adapter.config.Password).toString('base64')
    };*/

    var req = http.get(options, function(res) {
        var pageData = "";
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            pageData += chunk;
        });
        res.on('end', function () {
            var parser = new xml2js.Parser();
            parser.parseString(pageData, function (err, result) {
                if (callback) {
                    callback (command, 1, result);
                }
            });
        });
    });
    req.on('error', function(e) {
        adapter.log.info("received error: "+e.message);
    });

}

function parseBool(string){
    var cleanedString = string[0].replace(/(\t\n|\n|\t)/gm,"");
    switch(cleanedString.toLowerCase()){
        case "true": case "yes": case "1": return true;
        default: return false;
    }
}

function evaluateCommandResponse (command, deviceId, xml) {
    adapter.log.debug("evaluating response for command '"+command+"': "+JSON.stringify(xml));

    //var id = parseInt(deviceId.substring(1));
    //var boxId = (dreamSettings.firstId) + (id * 10);

    switch (command.toUpperCase())
    {
        case "MESSAGE":
        case "RESTART":
        case "REBOOT":
        case "DEEPSTANDBY":
            //setState(boxId, "");
            break;
        case "MUTE":
        case "UNMUTE":
        case "MUTE_TOGGLE":
        case "VOLUME":
            //setState(boxId + 2, parseInt(xml.e2volume.e2current[0]));	// 20
            //setState(boxId + 3, parseBool(xml.e2volume.e2ismuted));		// True|False
            //setState(boxId, "");
            break;
        case "WAKEUP":
        case "STANDBY":
        case "OFF":
        case "STANDBY_TOGGLE":
            adapter.setState('VuPlus.COMMAND', {val: "", ack: true});
            break;
        case "GETSTANDBY":
            adapter.log.debug("Box Standy: " + parseBool(xml.e2powerstate.e2instandby));
            adapter.setState('VuPlus.STANDBY', {val: parseBool(xml.e2powerstate.e2instandby), ack: true});
            //setState(boxId + 1, parseBool(xml.e2powerstate.e2instandby));		// true|false
            break;
        case "GETVOLUME":
            adapter.log.debug("Box Volume:" + parseInt(xml.e2volume.e2current[0]));
            adapter.log.debug("Box Muted:" + parseBool(xml.e2volume.e2ismuted));
            adapter.setState('VuPlus.VOLUME', {val: parseInt(xml.e2volume.e2current[0]), ack: true});
            adapter.setState('VuPlus.MUTED', {val: parseBool(xml.e2volume.e2ismuted), ack: true});

            break;
        case "GETINFO":
            adapter.log.debug("Box Sender: " +xml.e2abouts.e2about[0].e2servicename[0]);
            adapter.log.debug("Box HDD capacity: " + xml.e2abouts.e2about[0].e2hddinfo[0].capacity[0]);
            adapter.log.debug("Box HDD free: " +xml.e2abouts.e2about[0].e2hddinfo[0].free[0]);
            adapter.setState('VuPlus.CHANNEL', {val: xml.e2abouts.e2about[0].e2servicename[0], ack: true});
            adapter.setState('VuPlus.HDD_CAPACITY', {val: xml.e2abouts.e2about[0].e2hddinfo[0].capacity[0], ack: true});
            adapter.setState('VuPlus.HDD_FREE', {val: xml.e2abouts.e2about[0].e2hddinfo[0].free[0], ack: true});

            break;
        case "KEY":
        case "VOLUME_UP":
        case "VOLUME_DOWN":
        case "LEFT":
        case "RIGHT":
        case "UP":
        case "DOWN":
        case "EXIT":
        case "CH_UP":
        case "CH_DOWN":
        case "SELECT":
        case "OK":
        case "BOUQUET_UP":
        case "BOUQUET_DOWN":
        case "INFO":
        case "MENU":
            //setState(boxId, "");
        default:
            adapter.log.info("received unknown command '"+command+"' @ evaluateCommandResponse");
    }
}

function checkStatus() {
    ping.sys.probe(adapter.config.IPAddress, function (isAlive) {
        if (isAlive) {
            getResponse ("GETSTANDBY", 1, "/web/powerstate", evaluateCommandResponse);
            getResponse ("GETINFO", 1, "/web/about", evaluateCommandResponse);
            getResponse ("GETVOLUME", 1, "/web/vol", evaluateCommandResponse);
        } else {
            adapter.log.debug("VUPlus: " + adapter.config.IPAddress + " is not reachable!");
        }
    });
}


function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    adapter.log.debug('config IPAddress: ' + adapter.config.IPAddress);
    adapter.log.debug('config Username: ' + adapter.config.Username);
    adapter.log.debug('config Password'+ adapter.config.Password);


    /**
     *
     *      For every state in the system there has to be also an object of type state
     *
     *      Here a simple example for a boolean variable named "testVariable"
     *
     *      Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
     *
     */

    adapter.setObject('testVariable', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'indicator'
        },
        native: {}
    });

    // in this example all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');


    /**
     *   setState examples
     *
     *   you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
     *
     */

    adapter.setState('VuPlus.COMMAND', {val: "", ack: true});

    // the variable testVariable is set to true as command (ack=false)
   // adapter.setState('testVariable', true);

    // same thing, but the value is flagged "ack"
    // ack should be always set to true if the value is received from or acknowledged from the target system
    //adapter.setState('testVariable', {val: true, ack: true});

    // same thing, but the state is deleted after 30s (getState will return null afterwards)
    //adapter.setState('testVariable', {val: true, ack: true, expire: 30});


    //adapter.setState('VuPlus.PowerState', {val: "Off", ack: true});


/*

    // examples for the checkPassword/checkGroup functions
    adapter.checkPassword('admin', 'iobroker', function (res) {
        console.log('check user admin pw ioboker: ' + res);
    });

    adapter.checkGroup('admin', 'admin', function (res) {
        console.log('check group user admin group admin: ' + res);
    });*/
    //Check ever 5 secs
    adapter.log.info("starting Polling every " + adapter.config.PollingInterval + " ms");
    setInterval(checkStatus,adapter.config.PollingInterval);
}
