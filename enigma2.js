/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

const request		= require('request');
const net			= require('net');
const ping			= require('ping');
const http			= require('http');
const querystring	= require('querystring');
const xml2js		= require('xml2js');

// you have to require the utils module and call adapter function
const utils 		=    require(__dirname + '/lib/utils'); // Get common adapter utils

const adapter 		= utils.adapter('enigma2');

var isConnected      	= null;
var deviceId         	= 1;

var CMD_CHANNEL_DOWN 	= 403;
var CMD_CHANNEL_UP	 	= 402;
var CMD_DOWN			= 108;
var CMD_EPG				= 358;
var CMD_EXIT			= 174;
var CMD_LEFT			= 105;
var CMD_MENU			= 139;
var CMD_MUTE_TOGGLE		= 113;
var CMD_OK				= 352;
var CMD_PLAY_PAUSE		= 164;
var CMD_RADIO			= 385;
var CMD_REC				= 167;
var CMD_RIGHT			= 106;
//var CMD_VOLUME_DOWN  	= 114;
//var CMD_VOLUME_UP    	= 115;
var CMD_STANDBY_TOGGLE 	= 116;
var CMD_STOP			= 128;
var CMD_TV				= 377;
var CMD_UP				= 103;





var PATH_MESSAGEANSWER	= '/web/messageanswer?getanswer=now';				
var PATH_DEVICEINFO		= '/web/deviceinfo';			
var PATH_REMOTE_CONTROL = '/web/remotecontrol?command=';
var PATH_VOLUME         = '/web/vol';
var PATH_VOLUME_SET     = '/web/vol?set=set';
var PATH_ABOUT          = '/web/about';
var PATH_GET_CURRENT    = '/web/getcurrent';
var PATH_POWERSTATE     = '/web/powerstate';
var PATH_MESSAGE		= '/web/message?text=';
var PATH_MESSAGE_TYPE	= '1';
var PATH_MESSAGE_TIMEOUT = '10';


var commands = {
    CHANNEL_DOWN:	CMD_CHANNEL_DOWN,
    CHANNEL_UP:		CMD_CHANNEL_UP,
	DOWN:			CMD_DOWN,
    EPG:			CMD_EPG,
	EXIT:			CMD_EXIT,
	LEFT:			CMD_LEFT,
	MENU:			CMD_MENU,
	MUTE_TOGGLE:	CMD_MUTE_TOGGLE,
	OK:				CMD_OK,
    PLAY_PAUSE:		CMD_PLAY_PAUSE,
	RADIO:			CMD_RADIO,
	REC:			CMD_REC,
	RIGHT:			CMD_RIGHT,
	MENU:			CMD_MENU,
//    VOLUME_UP:    CMD_VOLUME_UP,
//    VOLUME_DOWN:  CMD_VOLUME_DOWN,
	STANDBY_TOGGLE:	CMD_STANDBY_TOGGLE,
	STOP:			CMD_STOP,
	TV:				CMD_TV,
	UP:				CMD_UP
};
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++
// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    if (id && state && !state.ack) {
        var parts = id.split('.');
        var name = parts.pop();
        if (id === adapter.namespace + '.Message.Type') {
		adapter.log.debug('Info Message Type: ' + state.val);
		adapter.setState('Message.Type', {val: state.val, ack: true});
        } else
		if (id === adapter.namespace + '.Message.Timeout') {
		adapter.log.debug('Info Message Timeout: ' + state.val + 's');
		adapter.setState('Message.Timeout', {val: state.val, ack: true});
        }
	}
});
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++
adapter.on('stateChange', function (id, state) {
    if (id && state && !state.ack) {
        var parts = id.split('.');
        var name = parts.pop();
        if (commands[name]) {
            getResponse('NONE', deviceId, PATH_REMOTE_CONTROL + commands[name], function (error, command, deviceId, xml) {
                if (error) {
                    //adapter.log.error('Cannot send command "' + name + '": ' + error);
                }
            });
        } else
        if (id === adapter.namespace + '.enigma2.STANDBY') {
            getResponse('NONE', deviceId, PATH_POWERSTATE + '?newstate=' + (state.val ? 1 : 0), function (error, command, deviceId, xml) {
                if (!error) {
                    adapter.setState('enigma2.STANDBY', state.val, true);
                } else {
                    adapter.setState('enigma2.STANDBY', {val: state.val, ack: true});
                }
            });
        } else if (id === adapter.namespace + '.command.SET_VOLUME') {
            getResponse('NONE', deviceId, PATH_VOLUME_SET + parseInt(state.val, 10), function (error, command, deviceId, xml) {
                if (!error) {
                    adapter.setState('command.SET_VOLUME', {val: '', ack: true});
                } else {
                    adapter.setState('command.SET_VOLUME', {val: state.val, ack: true});
                }
            });
        } else if (id === adapter.namespace + '.command.REMOTE-CONTROL') {
            adapter.log.debug('Its our Command: ' + state.val);
            getResponse('NONE', deviceId, PATH_REMOTE_CONTROL + state.val , function (error, command, deviceId, xml) {
                if (!error) {
                    adapter.setState('command.REMOTE-CONTROL', state.val, true);
                } else {
                    adapter.setState('command.REMOTE-CONTROL', {val: state.val, ack: true});
                }
            });
		} else if (id === adapter.namespace + '.Message.Text') {
            adapter.log.debug('Info message: ' + state.val);
			var PATH_MESSAGE_TEXT  = state.val;
			
			adapter.getState('Message.Type', function(err, state) {
				adapter.log.debug('Info Message Type: ' + state.val);
				var PATH_MESSAGE_TYPE  = state.val;
				
			adapter.getState('Message.Timeout', function(err, state) {
				adapter.log.debug('Info Message Type: ' + state.val);
				var PATH_MESSAGE_TIMEOUT  = state.val;

			//getResponse('NONE', deviceId, PATH_MESSAGE + encodeURIComponent(state.val) + '&type=1&timeout=5', function (error, command, deviceId, xml) {
            getResponse('NONE', deviceId, PATH_MESSAGE + encodeURIComponent(PATH_MESSAGE_TEXT) + '&type=' + PATH_MESSAGE_TYPE + '&timeout=' + PATH_MESSAGE_TIMEOUT, function (error, command, deviceId, xml) {
                if (!error) {
                    adapter.setState('Message.Text', PATH_MESSAGE_TEXT, true);
                } else {
                    adapter.setState('Message.Text', {val: PATH_MESSAGE_TEXT, ack: true});
                }
			});
            });
			});
		}
    }
	
});

adapter.on('ready', function () {
    main();
    deleteObject();
});



function getResponse (command, deviceId, path, callback){
   // var device = dreamSettings.boxes[deviceId];
    var options = {
        host:				adapter.config.IPAddress,
        port:				adapter.config.Port,
        internalharddisk:	adapter.config.internalharddisk,
		secondharddisk:		adapter.config.secondharddisk,
		alexa:				adapter.config.alexa,
        path:				path,
        method:				'GET'
    };

//-------------------------------------------------------------------------------------
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
        adapter.log.debug("received error: "+e.message+" Box eventuell nicht erreichbar?");
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
    var bool;
	
    switch (command.toUpperCase())
    {
		case "MESSAGE":
		case "MESSAGETEXT":
		case "MESSAGEANSWER":
 			adapter.log.debug("message answer: " +xml.e2simplexmlresult.e2statetext[0]);			
            adapter.setState('enigma2.MESSAGE_ANSWER', {val: xml.e2simplexmlresult.e2statetext[0], ack: true});
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
        case "SET_VOLUME":
			adapter.setState('enigma2.COMMAND', {val: '', ack: true});		
            break;
        case "WAKEUP":
        case "STANDBY":
        case "OFF":
        case 'STANDBY_TOGGLE':
            break;
        case "GETSTANDBY":
            adapter.log.debug("Box Standby: " + parseBool(xml.e2powerstate.e2instandby));
            adapter.setState('enigma2.STANDBY', {val: parseBool(xml.e2powerstate.e2instandby), ack: true});
            break;
        case "GETVOLUME":
			if (!xml.e2volume || !xml.e2volume.e2current) {
                adapter.log.error('No e2volume found');
                return;
            }
            bool = parseBool(xml.e2volume.e2ismuted);
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
		//    getResponse ("MESSAGEANSWER", 1, "/web/messageanswer?getanswer=now", evaluateCommandResponse);
        //    getResponse ("GETSTANDBY", 1, "/web/powerstate", evaluateCommandResponse);
        //    getResponse ("GETINFO", 1, "/web/about", evaluateCommandResponse);
        //    getResponse ("GETVOLUME", 1, "/web/vol", evaluateCommandResponse);
		//    getResponse ("GETCURRENT", 1, "/web/getcurrent", evaluateCommandResponse);
		//    getResponse ("DEVICEINFO", 1, "/web/deviceinfo", evaluateCommandResponse);
			getResponse('MESSAGEANSWER', deviceId, PATH_MESSAGEANSWER,  evaluateCommandResponse);
			getResponse('DEVICEINFO', deviceId, PATH_DEVICEINFO,  evaluateCommandResponse);
			getResponse('GETSTANDBY', deviceId, PATH_POWERSTATE,  evaluateCommandResponse);
            getResponse('GETINFO',    deviceId, PATH_ABOUT,       evaluateCommandResponse);
            getResponse('GETVOLUME',  deviceId, PATH_VOLUME,      evaluateCommandResponse);
            getResponse('GETCURRENT', deviceId, PATH_GET_CURRENT, evaluateCommandResponse)
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
			adapter.setState('Message.ANSWER_IS', "" );
        }
    });
}


function main() {
// adapter.config:
    adapter.log.debug('config IPAddress: ' + adapter.config.IPAddress);
	adapter.log.debug('config Port: ' + adapter.config.Port);
    adapter.log.debug('config Username: ' + adapter.config.Username);
    adapter.log.debug('config Password'+ adapter.config.Password);

//#################### Alexa #################################################
/*if (adapter.config.alexa === 'true' || adapter.config.alexa === true){
	
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
};*/	


//++++++++ Message +++++++++++++

    adapter.setObject('Message.Text', {
        type: 'state',
        common: {
            type: 'string',
            role: 'text',
			name:  'Send a info Message to the Receiver Screen',
			desc: 'messagetext=Text of Message',
			read:  false,
            write: true
        },
        native: {}
    });
		
    adapter.setObject('Message.Type', {
        type: 'state',
        common: {
            type: 'number',
            role: 'state',
			name: 'Message Typ: 0= Yes/No, 1= Info, 2=Message, 3=Attention',
			desc: 'messagetype=Number from 0 to 3, 0= Yes/No, 1= Info, 2=Message, 3=Attention',
			states: {
					0: 'Yes/No',
					1: 'Info',
					2: 'Message',
					3: 'Attention'
					},
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

//+++++++++ Verbindung +++++++++++++++++++++
    adapter.setObject('enigma2-CONNECTION', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'state',
			name: 'Connection to Receiver',
	        read:  true,
            write: false
        },
        native: {}
    });
adapter.setState('enigma2-CONNECTION', false, true );

//+++++++++++++++++++++++++ STATE +++++++++++++++++++++++++++++++++++++++++++
	
    adapter.setObject('enigma2.VOLUME', {
        type: 'state',
        common: {
            type: 'number',
            role: 'level.volume',
			name: 'Volume 0-100%',
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
			name: 'Message Answer',
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
			name: 'is Muted',
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
			name: 'EVENT DURATION',
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
			name: 'EVENT REMAINING',
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
			name: 'Receiver in Standby',
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
			name: 'Channel Name',
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
			name: 'Servicereference Code',
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
			name: 'current Programm',
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
			name: 'current Programm Info',
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
			name: 'Programm after',
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
			name: 'Programm Info after',
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
			name: 'Event description',
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
			name: 'maximal Flash Capacity (Flash 1)',
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
			name: 'free Flash Capacity (Flash 1)',
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
			name: 'maximal Flash Capacity (Flash 2)',
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
			name: 'free Flash Capacity (Flash 2)',
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
			name: 'Receiver Model',
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
			name: 'Receiver Webinterface Version',
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
			name: 'Receiver used Network',
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
			name: 'Receiver IP-Adress',
			read:  true,
            write: false
        },
        native: {}
    });

    // in this example all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');
	
	
    //Check ever 3 secs
    adapter.log.info("starting Polling every " + adapter.config.PollingInterval + " ms");
    setInterval(checkStatus,adapter.config.PollingInterval);
}


function deleteObject () {
//old only in V1.0.0
adapter.delObject('command.Button-Config.USER');
adapter.delObject('command.Button-Config.PW');
adapter.delObject('command.Button-Config.Webif');
adapter.delObject('command.Button-Config.Port');
adapter.delObject('command.Button-Config.IP');
adapter.delObject('Message.Button-Send');
adapter.delObject('Message.MESSAGE_ANSWER');
adapter.delObject('Message.ANSWER_IS');
adapter.delObject('Message.Question_Activ');	
	
//################### Alexa del ###########################

if (adapter.config.alexa === 'false' || adapter.config.alexa === false){
	
adapter.delObject('Alexa.MUTED');
adapter.delObject('Alexa.STANDBY');
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

}

