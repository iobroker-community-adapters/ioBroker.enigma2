/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

const request		= require('request');
const net		= require('net');
const ping		= require('ping');
const http		= require('http');
const querystring	= require('querystring');
const xml2js		= require('xml2js');

// you have to require the utils module and call adapter function
const utils =    require(__dirname + '/lib/utils'); // Get common adapter utils


// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.example.0
const adapter = utils.adapter('enigma2');

adapter.on('ready', function () {
    main();
    deleteObject();
});


function getResponse (command, deviceId, path, callback){
   // var device = dreamSettings.boxes[deviceId];
    var options = {
        host: adapter.config.IPAddress,
        port: adapter.config.Port,
        internalharddisk: adapter.config.internalharddisk,
		secondharddisk: adapter.config.secondharddisk,
		webif: adapter.config.webif,
		buttonscript: adapter.config.buttonscript,
		alexa: adapter.config.alexa,
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
//		adapter.setState('enigma2-CONNECTION', false );
        adapter.log.debug("received error: "+e.message+" Box eventuell nicht erreichbar?");
//          adapter.setState('enigma2.CONNECTION', ack: false);
		return;
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
		case "MESSAGETEXT":
		case "MESSAGEANSWER":
 			adapter.log.debug("message answer: " +xml.e2simplexmlresult.e2statetext[0]);			
            adapter.setState('enigma2.MESSAGE_ANSWER', {val: xml.e2simplexmlresult.e2statetext[0], ack: true});
		if (adapter.config.buttonscript === 'true' || adapter.config.buttonscript === true){	
			adapter.log.debug("message answer2: " + parseBool(xml.e2simplexmlresult.e2statetext));			
            adapter.setState('Message.MESSAGE_ANSWER', {val: parseBool(xml.e2simplexmlresult.e2state), ack: true});
			};	
            break;			
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
//            adapter.setState('enigma2.COMMAND', {val: "", ack: true});
//            break;

        case "GETSTANDBY":
            adapter.log.debug("Box Standby: " + parseBool(xml.e2powerstate.e2instandby));
            adapter.setState('enigma2.STANDBY', {val: parseBool(xml.e2powerstate.e2instandby), ack: true});
            //setState(boxId + 1, parseBool(xml.e2powerstate.e2instandby));		// true|false
            break;
        case "GETVOLUME":
            adapter.log.debug("Box Volume:" + parseInt(xml.e2volume.e2current[0]));
            adapter.setState('enigma2.VOLUME', {val: parseInt(xml.e2volume.e2current[0]), ack: true});
            adapter.log.debug("Box Muted:" + parseBool(xml.e2volume.e2ismuted));
            adapter.setState('enigma2.MUTED', {val: parseBool(xml.e2volume.e2ismuted), ack: true});
			break;
        case "GETCURRENT":
            adapter.log.debug("Box EVENTDURATION:" + parseInt(xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventduration[0]));
            adapter.setState('enigma2.EVENTDURATION', {val: parseInt(xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventduration[0]), ack: true});
            adapter.log.debug("Box EVENTREMAINING:" + parseInt(xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventremaining[0]));
            adapter.setState('enigma2.EVENTREMAINING', {val: parseInt(xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventremaining[0]), ack: true});
            adapter.log.debug("Box Programm: " +xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventname[0]);			
            adapter.setState('enigma2.PROGRAMM', {val: xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventname[0], ack: true});
			adapter.log.debug("Box Programm_danach: " +xml.e2currentserviceinformation.e2eventlist[0].e2event[1].e2eventname[0]);			
            adapter.setState('enigma2.PROGRAMM_AFTER', {val: xml.e2currentserviceinformation.e2eventlist[0].e2event[1].e2eventname[0], ack: true});
            adapter.log.debug("Box Programm Info: " +xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventdescriptionextended[0]);			
            adapter.setState('enigma2.PROGRAMM_INFO', {val: xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventdescriptionextended[0], ack: true});
			adapter.log.debug("Box Programm danach Info: " +xml.e2currentserviceinformation.e2eventlist[0].e2event[1].e2eventdescriptionextended[0]);			
            adapter.setState('enigma2.PROGRAMM_AFTER_INFO', {val: xml.e2currentserviceinformation.e2eventlist[0].e2event[1].e2eventdescriptionextended[0], ack: true});			
			adapter.log.debug("Box eventdescription: " +xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventdescription[0]);			
            adapter.setState('enigma2.EVENTDESCRIPTION', {val: xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventdescription[0], ack: true});
			adapter.log.debug("Box Sender Servicereference: " +xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventservicereference[0]);			
            adapter.setState('enigma2.CHANNEL_SERVICEREFERENCE', {val: xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventservicereference[0], ack: true});

//			adapter.setState('enigma2.MUTED', {val: parseBool(xml.e2currentserviceinformation.e2volume[0].e2ismuted), ack: true});
//			adapter.log.debug("Box Muted:" + parseBool(xml.e2currentserviceinformation.e2volume[0].e2ismuted));

		
            break;
        case "GETINFO":
            adapter.log.debug("Box Sender: " +xml.e2abouts.e2about[0].e2servicename[0]);
            adapter.setState('enigma2.CHANNEL', {val: xml.e2abouts.e2about[0].e2servicename[0], ack: true});
			adapter.log.debug("Box Model: " +xml.e2abouts.e2about[0].e2model[0]);
			adapter.setState('enigma2.MODEL', {val: xml.e2abouts.e2about[0].e2model[0], ack: true});
			
            break;
        case "DEVICEINFO":
			adapter.log.debug("Box webifversion: " +xml.e2deviceinfo.e2webifversion[0]);
            adapter.setState('enigma2.WEB_IF_VERSION', {val: xml.e2deviceinfo.e2webifversion[0], ack: true});
			adapter.log.debug("Box Netzwerk: " +xml.e2deviceinfo.e2network[0].e2interface[0].e2name[0]);
            adapter.setState('enigma2.NETWORK', {val: xml.e2deviceinfo.e2network[0].e2interface[0].e2name[0], ack: true});
			adapter.log.debug("Box IP: " +xml.e2deviceinfo.e2network[0].e2interface[0].e2ip[0]);
            adapter.setState('enigma2.BOX_IP', {val: xml.e2deviceinfo.e2network[0].e2interface[0].e2ip[0], ack: true});
		if (adapter.config.internalharddisk === 'true' || adapter.config.internalharddisk === true)
		{
	 		if (adapter.config.secondharddisk === 'false' || adapter.config.secondharddisk === false)
			{
				adapter.log.debug("Box HDD capacity: " + xml.e2deviceinfo.e2hdds[0].e2hdd[0].e2capacity[0]);	
				adapter.log.debug("Box HDD free: " +xml.e2deviceinfo.e2hdds[0].e2hdd[0].e2free[0]);
				adapter.setState('enigma2.HDD_CAPACITY', {val: xml.e2deviceinfo.e2hdds[0].e2hdd[0].e2capacity[0], ack: true});
				adapter.setState('enigma2.HDD_FREE', {val: xml.e2deviceinfo.e2hdds[0].e2hdd[0].e2free[0], ack: true});	
			};
		};
	 	if (adapter.config.secondharddisk === 'true' || adapter.config.secondharddisk === true)
		{
            adapter.log.debug("Box HDD capacity: " + xml.e2deviceinfo.e2hdds[0].e2hdd[1].e2capacity[0]);	
	        adapter.log.debug("Box HDD free: " +xml.e2deviceinfo.e2hdds[0].e2hdd[1].e2free[0]);
            adapter.setState('enigma2.HDD_CAPACITY', {val: xml.e2deviceinfo.e2hdds[0].e2hdd[1].e2capacity[0], ack: true});
			adapter.setState('enigma2.HDD_FREE', {val: xml.e2deviceinfo.e2hdds[0].e2hdd[1].e2free[0], ack: true});	
            adapter.log.debug("Box HDD2 capacity: " + xml.e2deviceinfo.e2hdds[0].e2hdd[0].e2capacity[0]);	
	        adapter.log.debug("Box HDD2 free: " +xml.e2deviceinfo.e2hdds[0].e2hdd[0].e2free[0]);
            adapter.setState('enigma2.HDD2_CAPACITY', {val: xml.e2deviceinfo.e2hdds[0].e2hdd[0].e2capacity[0], ack: true});
	        adapter.setState('enigma2.HDD2_FREE', {val: xml.e2deviceinfo.e2hdds[0].e2hdd[0].e2free[0], ack: true});	
		};

//############################	TEST #################################
//	
// Box Standby
//
//####################################################################
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

function checkStatus() 
{
    ping.sys.probe(adapter.config.IPAddress, function(isAlive){
        if (isAlive) {
			adapter.log.debug("enigma2 Verbunden!");
			adapter.setState('enigma2-CONNECTION', true, true );
			getResponse ("MESSAGEANSWER", 1, "/web/messageanswer?getanswer=now", evaluateCommandResponse);
            getResponse ("GETSTANDBY", 1, "/web/powerstate", evaluateCommandResponse);
            getResponse ("GETINFO", 1, "/web/about", evaluateCommandResponse);
            getResponse ("GETVOLUME", 1, "/web/vol", evaluateCommandResponse);
			getResponse ("GETCURRENT", 1, "/web/getcurrent", evaluateCommandResponse);
			getResponse ("DEVICEINFO", 1, "/web/deviceinfo", evaluateCommandResponse);
        } else {
            		adapter.log.debug("enigma2: " + adapter.config.IPAddress + " ist nicht erreichbar!");
			adapter.setState('enigma2-CONNECTION', false, false );
			// Werte aus Adapter löschen
			adapter.setState('enigma2.BOX_IP', "" );
			adapter.setState('enigma2.CHANNEL', "" );
			adapter.setState('enigma2.CHANNEL_SERVICEREFERENCE', "" );
			adapter.setState('enigma2.EVENTDESCRIPTION', "" );
			adapter.setState('enigma2.EVENTDURATION', "" );
			adapter.setState('enigma2.EVENTREMAINING', "" );
			adapter.setState('enigma2.MESSAGE_ANSWER', "" );
			adapter.setState('enigma2.MODEL', "" );
			adapter.setState('enigma2.MUTED', "" );
			adapter.setState('enigma2.NETWORK', "" );
			adapter.setState('enigma2.PROGRAMM', "" );
			adapter.setState('enigma2.PROGRAMM_AFTER', "" );
			adapter.setState('enigma2.PROGRAMM_AFTER_INFO', "" );
			adapter.setState('enigma2.PROGRAMM_INFO', "" );
			adapter.setState('enigma2.STANDBY', true, true );
			adapter.setState('enigma2.VOLUME', "" );
			adapter.setState('enigma2.WEB_IF_VERSION', "" );
			adapter.setState('Message.MESSAGE_ANSWER', false, true );
        }
    });
}


function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    adapter.log.debug('config IPAddress: ' + adapter.config.IPAddress);
	adapter.log.debug('config Port: ' + adapter.config.Port);
    adapter.log.debug('config Username: ' + adapter.config.Username);
    adapter.log.debug('config Password'+ adapter.config.Password);


    /**
     *
     *      For every state in the system there has to be also an object of type state
     *
     *
     *
     *      Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
     *
     */

//#########Verbindung#############################
    adapter.setObject('enigma2-CONNECTION', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'state',
	        read:  true,
            write: false
        },
        native: {}
    });
adapter.setState('enigma2-CONNECTION', false, true );

//######################### Alexa #################################################

if (adapter.config.alexa === 'true' || adapter.config.alexa === true){
	
	//STANDBY
    adapter.setObject('Alexa.MUTED', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'switch',
			desc: 'Alexa Comando',
			def: false,
			read:  true,
            write: true
        },
        native: {}
    });
	//STANDBY
	adapter.setObject('Alexa.STANDBY', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'switch',
			desc: 'Alexa Comando',
			def: false,
			read:  true,
            write: true
        },
        native: {}
    });	
};	

//######################## COMMANDS ####################################################	 

if (adapter.config.buttonscript === 'true' || adapter.config.buttonscript === true){
	
    adapter.setObject('command.Button-Config.Port', {
        type: 'state',
        common: {
            type: 'number',
            role: 'state',
			read:  true,
            write: false
        },
        native: {}
    });
	
adapter.setState('command.Button-Config.Port', true );

//adapter.config.IPAddress
    adapter.setObject('command.Button-Config.IP', {
        type: 'state',
        common: {
            type: 'integer',
            role: 'state',
			read:  true,
            write: false
        },
        native: {}
    });
	
adapter.setState('command.Button-Config.IP', adapter.config.IPAddress, true );
//adapter.config.Username
    adapter.setObject('command.Button-Config.USER', {
        type: 'state',
        common: {
            type: 'integer',
            role: 'state',
			read:  true,
            write: false
        },
        native: {}
    });
	
adapter.setState('command.Button-Config.USER', adapter.config.Username, true );

//adapter.config.Password
    adapter.setObject('command.Button-Config.PW', {
        type: 'state',
        common: {
            type: 'integer',
            role: 'state',
			read:  true,
            write: false
        },
        native: {}
    });
	
adapter.setState('command.Button-Config.PW', adapter.config.Password, true );

//adapter.config.webif
    adapter.setObject('command.Button-Config.Webif', {
        type: 'state',
        common: {
            type: 'number',
            role: 'state',
			read:  true,
            write: false
        },
        native: {}
    });
	
adapter.setState('command.Button-Config.Webif', adapter.config.webif, true );
//######################################################################################
	//SET_VOLUME
	adapter.setObject('command.SET_VOLUME', {
        type: 'state',
        common: {
            type: 'number',
            role: 'level.volume',
			min: 0,
			max: 100,
			read:  false,
            write: true
        },
        native: {}
    });	
	//STANDBY_TOGGLE
	adapter.setObject('command.STANDBY_TOGGLE', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });
	//MUTE_TOGGLE
	adapter.setObject('command.MUTE_TOGGLE', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });
	//CHANNEL_UP
	adapter.setObject('command.CHANNEL_UP', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });		
	//CHANNEL_DOWN
	adapter.setObject('command.CHANNEL_DOWN', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });		
	//OK
	adapter.setObject('command.OK', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });		
	//EXIT
	adapter.setObject('command.EXIT', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });		
	//EPG
	adapter.setObject('command.EPG', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });		
	//MENU
	adapter.setObject('command.MENU', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });	

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++	

if (adapter.config.webif === '1' || adapter.config.webif === 1){
	
	//PLAY
	adapter.setObject('command.PLAY', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button.play',
			read:  false,
            write: true
        },
        native: {}
    });		
	//PAUSE
	adapter.setObject('command.PAUSE', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button.pause',
			read:  false,
            write: true
        },
        native: {}
    });	
	
//adapter.delObject('command.PLAY-PAUSE');

} else {
	//PLAY-PAUSE
	adapter.setObject('command.PLAY-PAUSE', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button.play',
			read:  false,
            write: true
        },
        native: {}
    });	
	
//adapter.delObject('command.PLAY');
//adapter.delObject('command.PAUSE');	

};	
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

	//REC
	adapter.setObject('command.REC', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });		
	//STOP
	adapter.setObject('command.STOP', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button.stop',
			read:  false,
            write: true
        },
        native: {}
    });		
	//TV
	adapter.setObject('command.TV', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });		
	//RADIO
	adapter.setObject('command.RADIO', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });		
	//UP
	adapter.setObject('command.UP', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });		
	//DOWN
	adapter.setObject('command.DOWN', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });		
	//RIGHT
	adapter.setObject('command.RIGHT', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });		
	//LEFT
	adapter.setObject('command.LEFT', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });	
//##################### Message #####################

    adapter.setObject('Message.Text', {
        type: 'state',
        common: {
            type: 'string',
            role: 'text',
			desc: 'messagetext=Text of Message',
			read:  true,
            write: true
        },
        native: {}
    });
adapter.setState('Message.Text', 'Text of Message', true );
	
    adapter.setObject('Message.Type', {
        type: 'state',
        common: {
            type: 'number',
            role: 'level',
			desc: 'messagetype=Number from 0 to 3, 0= Yes/No, 1= Info, 2=Message, 3=Attention',
			min: 0,
			max: 3,
			read:  true,
            write: true
        },
        native: {}
    });
adapter.setState('Message.Type', 1, true );

	adapter.setObject('Message.Timeout', {
        type: 'state',
        common: {
            type: 'number',
            role: 'control',
			desc: 'timeout=Can be empty or the Number of seconds the Message should disappear after',
			read:  true,
            write: true
        },
        native: {}
    });
adapter.setState('Message.Timeout', 15, true );
		
		adapter.setObject('Message.Button-Send', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'button',
			read:  false,
            write: true
        },
        native: {}
    });	
	    adapter.setObject('Message.MESSAGE_ANSWER', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'state',
			read:  true,
            write: false
        },
        native: {}
    });
		adapter.setObject('Message.Question_Activ', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'state',
			read:  true,
            write: true
        },
        native: {}
    });
	adapter.setState('Message.Question_Activ', false, true );
//#################### ENDE Message ########################

};	
//####################### STATE ###############################################################	
	
    adapter.setObject('enigma2.VOLUME', {
        type: 'state',
        common: {
            type: 'number',
            role: 'level.volume',
			read:  true,
            write: false
        },
        native: {}
    });
    adapter.setObject('enigma2.MESSAGE_ANSWER', {
        type: 'state',
        common: {
            type: 'integer',
            role: 'message',
			read:  true,
            write: false
        },
        native: {}
    });
    adapter.setObject('enigma2.MUTED', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'media.mute',
			read:  true,
            write: false
        },
        native: {}
    });
	adapter.setObject('enigma2.EVENTDURATION', {
        type: 'state',
        common: {
            type: 'number',
            role: 'media.duration',
			read:  true,
            write: false
        },
        native: {}
    });
		adapter.setObject('enigma2.EVENTREMAINING', {
        type: 'state',
        common: {
            type: 'number',
            role: 'media.duration',
			read:  true,
            write: false
        },
        native: {}
    });
    adapter.setObject('enigma2.STANDBY', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'state',
			read:  true,
            write: false
        },
        native: {}
    });
    adapter.setObject('enigma2.CHANNEL', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
	    read:  true,
            write: false
        },
        native: {}
    });
    adapter.setObject('enigma2.CHANNEL_SERVICEREFERENCE', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
	    read:  true,
            write: false
        },
        native: {}
    });
	    adapter.setObject('enigma2.PROGRAMM', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
	    read:  true,
            write: false
        },
        native: {}
    });
		    adapter.setObject('enigma2.PROGRAMM_INFO', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
	    read:  true,
            write: false
        },
        native: {}
    });
		    adapter.setObject('enigma2.PROGRAMM_AFTER', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
	    read:  true,
            write: false
        },
        native: {}
    });
		    adapter.setObject('enigma2.PROGRAMM_AFTER_INFO', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
			read:  true,
            write: false
        },
        native: {}
    });	
		    adapter.setObject('enigma2.EVENTDESCRIPTION', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
			read:  true,
            write: false
        },
        native: {}
    });
if (adapter.config.internalharddisk === 'true' || adapter.config.internalharddisk === true){
    adapter.setObject('enigma2.HDD_CAPACITY', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
			read:  true,
            write: false
        },
        native: {}
    });
    adapter.setObject('enigma2.HDD_FREE', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
			read:  true,
            write: false
        },
        native: {}
    });
	};
if (adapter.config.secondharddisk === 'true' || adapter.config.secondharddisk === true){
    adapter.setObject('enigma2.HDD2_CAPACITY', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
			read:  true,
            write: false
        },
        native: {}
    });
    adapter.setObject('enigma2.HDD2_FREE', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
			read:  true,
            write: false
        },
        native: {}
    });
	};
	    adapter.setObject('enigma2.MODEL', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
	    read:  true,
            write: false
        },
        native: {}
    });
	    adapter.setObject('enigma2.WEB_IF_VERSION', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
			read:  true,
            write: false
        },
        native: {}
    });
	    adapter.setObject('enigma2.NETWORK', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
			read:  true,
            write: false
        },
        native: {}
    });
	    adapter.setObject('enigma2.BOX_IP', {
        type: 'state',
        common: {
            type: 'string',
            role: 'info.ip',
			read:  true,
            write: false
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

//    adapter.setState('enigma2.COMMAND', {val: "", ack: true});

    // the variable testVariable is set to true as command (ack=false)
   // adapter.setState('testVariable', true);

    // same thing, but the value is flagged "ack"
    // ack should be always set to true if the value is received from or acknowledged from the target system
    //adapter.setState('testVariable', {val: true, ack: true});

    // same thing, but the state is deleted after 30s (getState will return null afterwards)
    //adapter.setState('testVariable', {val: true, ack: true, expire: 30});


    //adapter.setState('enigma2.PowerState', {val: "Off", ack: true});


/*

    // examples for the checkPassword/checkGroup functions
    adapter.checkPassword('admin', 'iobroker', function (res) {
        console.log('check user admin pw ioboker: ' + res);
    });

    adapter.checkGroup('admin', 'admin', function (res) {
        console.log('check group user admin group admin: ' + res);
    });*/
    //Check ever 3 secs
    adapter.log.info("starting Polling every " + adapter.config.PollingInterval + " ms");
    setInterval(checkStatus,adapter.config.PollingInterval);
}


function deleteObject () {

    if (adapter.config.buttonscript === 'false' || adapter.config.buttonscript === false){

adapter.delObject('command.Button-Config.USER');
//adapter.log.info("delete command.Button-Config.USER");

adapter.delObject('command.Button-Config.PW');
//adapter.log.info("delete command.Button-Config.PW");

adapter.delObject('command.Button-Config.Webif');
//adapter.log.info("delete command.Button-Config.Webif");	
 	
adapter.delObject('command.Button-Config.Port');
adapter.delObject('command.Button-Config.IP');
adapter.delObject('command.SET_VOLUME');
adapter.delObject('command.STANDBY_TOGGLE');
adapter.delObject('command.MUTE_TOGGLE');
adapter.delObject('command.CHANNEL_UP');
adapter.delObject('command.CHANNEL_DOWN');
adapter.delObject('command.OK');
adapter.delObject('command.EXIT');
adapter.delObject('command.EPG');
adapter.delObject('command.MENU');
adapter.delObject('command.PLAY');
adapter.delObject('command.PAUSE');
adapter.delObject('command.PLAY-PAUSE');
adapter.delObject('command.REC');
adapter.delObject('command.STOP');
adapter.delObject('command.TV');
adapter.delObject('command.RADIO');
adapter.delObject('command.UP');
adapter.delObject('command.DOWN');
adapter.delObject('command.RIGHT');
adapter.delObject('command.LEFT');
adapter.delObject('Message.Text');
adapter.delObject('Message.Type');
adapter.delObject('Message.Timeout');
adapter.delObject('Message.Button-Send');
adapter.delObject('Message.MESSAGE_ANSWER');
adapter.delObject('Message.Question_Activ');

//adapter.delObject('Alexa.MUTED');
//adapter.delObject('Alexa.STANDBY');

//adapter.delObject('ALEXA.' + adapter.config.devicename);
//adapter.delObject('command.Button-Config.devicename');

//adapter.log.info("lösche enigma2 Button");
}
else {
//adapter.log.info("erstelle enigma2 Button");
};
		
//################### Alexa del ###########################

if (adapter.config.alexa === 'false' || adapter.config.alexa === false){

adapter.delObject('Alexa.MUTED');
adapter.delObject('Alexa.STANDBY');

//adapter.delObject('ALEXA.' + adapter.config.devicename);
//adapter.delObject('command.Button-Config.devicename');

//adapter.log.info("lösche enigma2 Alexa Button");
}
else {
//adapter.log.info("erstelle enigma2 Alexa Button");
};
//################### HDD1 del ###########################
if (adapter.config.internalharddisk === 'false' || adapter.config.internalharddisk === false){

adapter.delObject('enigma2.HDD_CAPACITY');
adapter.delObject('enigma2.HDD_FREE');
};
//################### HDD2 del ###########################
if (adapter.config.secondharddisk === 'false' || adapter.config.secondharddisk === false){

adapter.delObject('enigma2.HDD2_CAPACITY');
adapter.delObject('enigma2.HDD2_FREE');
};
//################### PLAY PAUSE del #####################

if (adapter.config.webif === '1' || adapter.config.webif === 1){
adapter.delObject('command.PLAY-PAUSE');
} else {
adapter.delObject('command.PLAY');
adapter.delObject('command.PAUSE');
};
}

