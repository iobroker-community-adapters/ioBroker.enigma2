/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

const request		= require('request');
const net			= require('net');
const http			= require('http');
const querystring	= require('querystring');
const xml2js		= require('xml2js');

// you have to require the utils module and call adapter function
const utils 		=    require(__dirname + '/lib/utils'); // Get common adapter utils

const adapter 		= utils.adapter('enigma2');

var isConnected      	= null;
var deviceId         	= 1;

var PATH = {
	MESSAGEANSWER:		'/web/messageanswer?getanswer=now',
	DEVICEINFO:		'/web/deviceinfo',
	REMOTE_CONTROL:		'/web/remotecontrol?command=',
	VOLUME:			'/web/vol',
	VOLUME_SET:		'/web/vol?set=set',
	ABOUT:			'/web/about',
	GET_CURRENT:		'/web/getcurrent',
	POWERSTATE:		'/web/powerstate',
	MESSAGE:		'/web/message?text=',
	DELETE:			'/web/timerdelete?sRef=',
	TIMER_TOGGLE:		'/api/timertogglestatus?sRef=',
	TIMERLIST:		'/web/timerlist',
	MAIN_COMMAND:		'/web/powerstate?newstate=',
	IP_CHECK:		'/web/about',
	ZAP:			'/web/zap?sRef=',
	ISRECORD:		'/web/timerlist',
	API:			'/api/statusinfo'
};

var commands = {
	CHANNEL_DOWN:		403,
	CHANNEL_UP:		402,
	DOWN:			108,
	EPG:			358,
	EXIT:			174,
	LEFT:			105,
	MENU:			139,
	MUTE_TOGGLE:		113,
	OK:			352,
	PLAY_PAUSE:		164,
	RADIO:			385,
	REC:			167,
	RIGHT:			106,
	STANDBY_TOGGLE:		116,
	STOP:			128,
	TV:			377,
	UP:			103
};

var main_commands = {
	DEEP_STANDBY:		1,
	REBOOT:			2,
	RESTART_GUI:		3,
	WAKEUP_FROM_STANDBY:	4,
	STANDBY:		5
};

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

        if (commands[name]) {
            getResponse('NONE', deviceId, PATH['REMOTE_CONTROL'] + commands[name] + '&rcu=advanced', function (error, command, deviceId, xml) {
                if (error) {
                    //adapter.log.error('Cannot send command "' + name + '": ' + error);
                }
            });
        } else
	if (main_commands[name]) {
            getResponse('NONE', deviceId, PATH['MAIN_COMMAND'] + main_commands[name], function (error, command, deviceId, xml) {
                if (error) {
                    //adapter.log.error('Cannot send command "' + name + '": ' + error);
                }
            });
        } else
        if (id === adapter.namespace + '.Timer.Update') {
            getResponse('TIMERLIST', deviceId, PATH['TIMERLIST'], TimerSearch);
            adapter.log.debug("Timer manuell aktualisiert");
            //adapter.setState('Timer.Update', {val: state.val, ack: true});

        } else
//+++++++++++++++++++++++++++
		if (id === adapter.namespace + '.Alexa_Command.Standby') {
			adapter.getState('Alexa_Command.Standby', function(err, state) {
				if (state.val === true) {
					getResponse('NONE', deviceId, PATH['MAIN_COMMAND'] + '4', function (error, command, deviceId, xml) {
						if (error) {
						//adapter.log.error('Cannot send command "' + name + '": ' + error);
						adapter.setState('Alexa_Command.Standby', {val: state.val, ack: true});
						}
					});
				} else 
					if (state.val === false) { 
						getResponse('NONE', deviceId, PATH['MAIN_COMMAND'] + '5', function (error, command, deviceId, xml) {
							if (error) {
							//adapter.log.error('Cannot send command "' + name + '": ' + error);
							adapter.setState('Alexa_Command.Standby', {val: state.val, ack: true});
							}
						});
					}
			});
        } else
		if (id === adapter.namespace + '.Alexa_Command.Mute') {
			adapter.getState('Alexa_Command.Mute', function(err, state) {
				if (state.val === true) {
					getResponse('NONE', deviceId, PATH['REMOTE_CONTROL'] + '113', function (error, command, deviceId, xml) {
						if (error) {
						//adapter.log.error('Cannot send command "' + name + '": ' + error);
						adapter.setState('Alexa_Command.Mute', {val: state.val, ack: true});
						}
					});
				} else 
					if (state.val === false) { 
						getResponse('NONE', deviceId, PATH['REMOTE_CONTROL'] + '113', function (error, command, deviceId, xml) {
							if (error) {
							//adapter.log.error('Cannot send command "' + name + '": ' + error);
							adapter.setState('Alexa_Command.Mute', {val: state.val, ack: true});
							}
						});
					}
			});
        } else
//+++++++++++++++++++++++++++ enigma2.Update
        if (id === adapter.namespace + '.enigma2.Update') {
			getResponse('GETSTANDBY',		deviceId, PATH['POWERSTATE'],		evaluateCommandResponse);
			getResponse('MESSAGEANSWER',		deviceId, PATH['MESSAGEANSWER'],	evaluateCommandResponse);
			getResponse('GETINFO',			deviceId, PATH['ABOUT'],		evaluateCommandResponse);
			getResponse('GETVOLUME',		deviceId, PATH['VOLUME'],		evaluateCommandResponse);
			getResponse('GETCURRENT',		deviceId, PATH['GET_CURRENT'],		evaluateCommandResponse);
			getResponse('ISRECORD',			deviceId, PATH['ISRECORD'],		evaluateCommandResponse);
			//getResponse('STATUSINFO',		deviceId, PATH['API'],			APIstatusinfo);
			adapter.log.debug("E2 States manuell aktualisiert");
			adapter.setState('enigma2.Update', {val: state.val, ack: true});
        } else
        if (id === adapter.namespace + '.enigma2.STANDBY') {
			getResponse('NONE', deviceId, PATH['MAIN_COMMAND'] + 0, function (error, command, deviceId, xml) {
                if (!error) {
			adapter.setState('enigma2.STANDBY', state.val, true);
			getResponse('GETSTANDBY', deviceId, PATH['POWERSTATE'],  evaluateCommandResponse);
                } else {
			adapter.setState('enigma2.STANDBY', {val: state.val, ack: true});
			getResponse('GETSTANDBY', deviceId, PATH['POWERSTATE'],  evaluateCommandResponse);
                }
            });
        } else if (id === adapter.namespace + '.command.SET_VOLUME') {
            getResponse('NONE', deviceId, PATH['VOLUME_SET'] + parseInt(state.val, 10), function (error, command, deviceId, xml) {
                if (!error) {
                    adapter.setState('command.SET_VOLUME', {val: '', ack: true});
                } else {
                    adapter.setState('command.SET_VOLUME', {val: state.val, ack: true});
                    getResponse('GETVOLUME',  deviceId, PATH['VOLUME'], evaluateCommandResponse);
                }
            });
        } else if (id === adapter.namespace + '.command.REMOTE-CONTROL') {
            adapter.log.debug('Its our Command: ' + state.val);
            getResponse('NONE', deviceId, PATH['REMOTE_CONTROL'] + state.val + '&rcu=advanced' , function (error, command, deviceId, xml) {
                if (!error) {
                    adapter.setState('command.REMOTE-CONTROL', state.val, true);
                } else {
                    adapter.setState('command.REMOTE-CONTROL', {val: state.val, ack: true});
                }
            });
        } else if (id === adapter.namespace + '.Message.Text') {
            adapter.log.debug('Info message: ' + state.val);
            var MESSAGE_TEXT  = state.val;

            adapter.getState('Message.Type', function(err, state) {
                adapter.log.debug('Info Message Type: ' + state.val);
                var MESSAGE_TYPE  = state.val;

                adapter.getState('Message.Timeout', function(err, state) {
                    adapter.log.debug('Info Message Type: ' + state.val);
                    var MESSAGE_TIMEOUT  = state.val;

                    getResponse('NONE', deviceId, PATH['MESSAGE'] + encodeURIComponent(MESSAGE_TEXT) + '&type=' + MESSAGE_TYPE + '&timeout=' + MESSAGE_TIMEOUT, function (error, command, deviceId, xml) {
                        if (!error) {
                            adapter.setState('Message.Text', MESSAGE_TEXT, true);
                        } else {
                            adapter.setState('Message.Text', {val: MESSAGE_TEXT, ack: true});
                        }
                    });
                });
            });
	//ZAP
		} else if (id === adapter.namespace + '.command.ZAP') {
            adapter.log.debug('Info message: ' + state.val);
				//var MESSAGE_TEXT  = state.val;
                    getResponse('NONE', deviceId, PATH['ZAP'] + state.val , function (error, command, deviceId, xml) {
                        if (!error) {
                            adapter.setState('command.ZAP',state.val, true);
                        } else {
                            adapter.setState('command.ZAP', {val: state.val, ack: true});
                        }
                    });
	//Timer
		} else if (parts[1] === 'Timer' && name === 'Timer_Toggle') {
			var timerID = parts[2];
			
			adapter.getState('Timer.'+timerID+'.Timer_servicereference', function(err, state) {
                var T_sRef  = state.val;
                adapter.getState('Timer.'+timerID+'.Timer_Start', function(err, state) {
                    var T_begin  = state.val;
                    adapter.getState('Timer.'+timerID+'.Timer_End', function(err, state) {
                        var T_end  = state.val;
                        getResponse('NONE', deviceId, PATH['TIMER_TOGGLE'] + T_sRef + '&begin=' + T_begin + '&end=' + T_end, function (error, command, deviceId, xml) {
                            if (!error) {
                                adapter.setState('Timer.'+timerID+'.Timer_Toggle', state.val, true);
                            } else {
                                getResponse('TIMERLIST', deviceId, PATH['TIMERLIST'], TimerSearch);
                            }
                        });
                    });
                });
            });
		} else if (parts[1] === 'Timer' && name === 'Delete') {
			var timerID = parts[2];
			
			adapter.getState('Timer.'+timerID+'.Timer_servicereference', function(err, state) {
                var T_sRef  = state.val;
                adapter.getState('Timer.'+timerID+'.Timer_Start', function(err, state) {
                    var T_begin  = state.val;
                    adapter.getState('Timer.'+timerID+'.Timer_End', function(err, state) {
                        var T_end  = state.val;
                        getResponse('NONE', deviceId, PATH['DELETE'] + T_sRef + '&begin=' + T_begin + '&end=' + T_end, function (error, command, deviceId, xml) {
                            if (!error) {
                                adapter.setState('Timer.'+timerID+'.Delete', state.val, true);
                            } else {
                                adapter.setState('Timer.'+timerID+'.Delete', {val: state.val, ack: true});
                                getResponse('TIMERLIST', deviceId, PATH['TIMERLIST'], TimerSearch);
                            }
                        });
                    });
                });
            });
        };
    }

});

adapter.on('ready', function () {
    main();
	main2();
	//timer();
    deleteObject();
});

function getResponse (command, deviceId, path, callback){
   // var device = dreamSettings.boxes[deviceId];
    var options = {
	    host:		adapter.config.IPAddress,
	    port:		adapter.config.Port,
	    TimerCheck:		adapter.config.TimerCheck,
	    path:		path,
	    alexa:		adapter.config.Alexa,
	    method:		'GET'
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

     var req = http.get(options, function(res) {
        const { statusCode } = res;
        var pageData = "";
		
		if(command === 'PICON')
		{
			res.setEncoding('base64');

			var pageData = "data:" + res.headers["content-type"] + ";base64,";
		}
		else
		{
			res.setEncoding('utf8');

			if (statusCode == 200) {
				setStatus(true);
			}
		}
			
		res.on('data', function (chunk) {
			pageData += chunk
		});
		res.on('end', function () {
			if(command !== 'PICON')
			{
				var parser = new xml2js.Parser();
				parser.parseString(pageData, function (err, result) {
					if (callback) {
						callback (command, 1, result);
					}
				});
			}
			else
			{
				if (callback) {
					callback (command, (statusCode == '200' && pageData.length > 0 ? true : false), pageData);
				}
			}
		});
    });
    req.on('error', function(e) {
        setStatus(false);
        adapter.log.debug("received error: "+e.message+" Box eventuell nicht erreichbar?");
		return;
    });
}

function parseBool(string){
    var cleanedString = string[0].replace(/(\r|\t\n|\n|\t)/gm,"");
    switch(cleanedString.toLowerCase()){
        case "true": case "yes": case "1": return true;
        default: return false;
    }
}

function sec2HMS(sec) {
	if (sec  === 0) {
        return '0';
    }

    const sec_num = parseInt(sec, 10);
    let hours   = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    let seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (minutes < 10) {minutes = '0' + minutes;}
    if (seconds < 10) {seconds = '0' + seconds;}
    if (hours === 0) {
        return minutes + ':' + seconds;
    }

    if (hours < 10) {hours = '0' + hours;}
    return hours + ':' + minutes + ':' + seconds;
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
	    //Alexa_Command.Standby
	    if (adapter.config.Alexa === 'true' || adapter.config.Alexa === true){
	    var alexastby = parseBool(xml.e2powerstate.e2instandby);
		if(alexastby === false || alexastby === "false"){
			adapter.setState('Alexa_Command.Standby', {val: true, ack: true});
		} else if(alexastby === true || alexastby === "true"){
			adapter.setState('Alexa_Command.Standby', {val: false, ack: true});
		}
	    }
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
	    //Alexa_Command.Mute
	    if (adapter.config.Alexa === 'true' || adapter.config.Alexa === true){
	    var alexaMute = parseBool(xml.e2volume.e2ismuted);		
		if(alexaMute === false || alexaMute === "false"){
			adapter.setState('Alexa_Command.Mute', {val: true, ack: true});
		} else if(alexaMute === true || alexaMute === "true"){
			adapter.setState('Alexa_Command.Mute', {val: false, ack: true});
		}
	    }
		break;
        case "GETCURRENT":	
		
	if(xml.e2currentserviceinformation.e2eventlist[0] !== undefined){
		
		adapter.log.debug("Box EVENTDURATION:" + parseInt(xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventduration[0]));
		var e2EVENTDURATION_X = (xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventduration[0]);
			adapter.setState('enigma2.EVENTDURATION_MIN', {val: Math.round(e2EVENTDURATION_X / 60), ack: true});
		var e2EVENTDURATION = sec2HMS(parseFloat(e2EVENTDURATION_X));
				
				if(e2EVENTDURATION === 'NaN:NaN:NaN' || e2EVENTDURATION === '0'){
					adapter.setState('enigma2.EVENTDURATION', {val: ''/*'0:0:0'*/, ack: true});
				} else {
					adapter.setState('enigma2.EVENTDURATION', {val: e2EVENTDURATION, ack: true});
					};
					
			//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
			
            adapter.log.debug("Box EVENTREMAINING:" + parseInt(xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventremaining[0]));
            //adapter.setState('enigma2.EVENTREMAINING', {val: sec2HMS(parseInt(xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventremaining[0])), ack: true});
			var e2EVENTREMAINING_X = (xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventremaining[0]);
				adapter.setState('enigma2.EVENTREMAINING_MIN', {val: Math.round(e2EVENTREMAINING_X / 60), ack: true});
			var e2EVENTREMAINING = sec2HMS(parseFloat(e2EVENTREMAINING_X));
				
				if(e2EVENTREMAINING === 'NaN:NaN:NaN' || e2EVENTREMAINING === '0'){
					adapter.setState('enigma2.EVENTREMAINING', {val: ''/*'0:0:0'*/, ack: true});
				} else {
					adapter.setState('enigma2.EVENTREMAINING', {val: e2EVENTREMAINING, ack: true});
					};
					
			//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
			
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
			var e2SERVICEREFERENCE = (xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventservicereference[0]);
				
				if(e2SERVICEREFERENCE === '-1:8087252:0:77132724:2:0:C:0:0:77040804:' || e2EVENTREMAINING === '0'){
					adapter.setState('enigma2.CHANNEL_SERVICEREFERENCE', {val: '', ack: true});
					adapter.setState('enigma2.CHANNEL_SERVICEREFERENCE_NAME', {val: '', ack: true});
				} else {
					adapter.setState('enigma2.CHANNEL_SERVICEREFERENCE', {val: e2SERVICEREFERENCE, ack: true});
					adapter.setState('enigma2.CHANNEL_SERVICEREFERENCE_NAME', {val: e2SERVICEREFERENCE.replace(/:/g, '_').slice(0,-1), ack: true});
					};
            //adapter.setState('enigma2.CHANNEL_SERVICEREFERENCE', {val: xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventservicereference[0], ack: true});
			//adapter.setState('enigma2.CHANNEL_SERVICEREFERENCE_NAME', {val: xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventservicereference[0].replace(/:/g, '_').slice(0,-1), ack: true});
			
			//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++	
				
				var Step1 = parseFloat((parseFloat(e2EVENTDURATION_X) - parseFloat(e2EVENTREMAINING_X)));
				var Step2 = parseFloat((Step1 / parseFloat(e2EVENTDURATION_X)));
				var Step3 = parseFloat((Math.round(Step2 * 100)));
					//adapter.log.info(Step3);
					adapter.setState('enigma2.EVENT_PROGRESS_PERCENT', {val: parseInt(Step3), ack: true});
				//EVENT_TIME_PASSED //NaN:NaN:NaN
				var Step1_1 = sec2HMS(parseInt(Step1));
					if(Step1_1 === 'NaN:NaN:NaN'){
						adapter.setState('enigma2.EVENT_TIME_PASSED', {val: "", ack: true});
					} else {
						adapter.setState('enigma2.EVENT_TIME_PASSED', {val: sec2HMS(parseInt(Step1)), ack: true});
					};

			//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++			
			
			var  e2Eventstart = (xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventstart[0]);
			var  e2Eventend = (xml.e2currentserviceinformation.e2eventlist[0].e2event[1].e2eventstart[0]);
			
			if(e2Eventstart !== e2Eventend){
				
				// Create a new JavaScript Date object based on the timestamp
				// multiplied by 1000 so that the argument is in milliseconds, not seconds.
				var date = new Date(e2Eventstart * 1000);
				// Hours part from the timestamp
				var hours = date.getHours();
				// Minutes part from the timestamp
				var minutes = "0" + date.getMinutes();

				// Will display time in 10:30 format
				var formattedTime = hours + ':' + minutes.substr(-2);
					adapter.setState('enigma2.EVENT_TIME_START', {val: (formattedTime), ack: true});
			
			//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

				var date = new Date(e2Eventend * 1000);
				// Hours part from the timestamp
				var hours = date.getHours();
				// Minutes part from the timestamp
				var minutes = "0" + date.getMinutes();

				// Will display time in 10:30 format
				var formattedTime = hours + ':' + minutes.substr(-2);
					adapter.setState('enigma2.EVENT_TIME_END', {val: (formattedTime), ack: true});
					//adapter.log.info(formattedTime);
					
			} else {
					adapter.setState('enigma2.EVENT_TIME_END', {val: '', ack: true});
					adapter.setState('enigma2.EVENT_TIME_START', {val: '', ack: true});
					};
			
			break;
	}
        case "GETINFO":
            adapter.log.debug("Box Sender: " +xml.e2abouts.e2about[0].e2servicename[0]);
            adapter.setState('enigma2.CHANNEL', {val: xml.e2abouts.e2about[0].e2servicename[0], ack: true});
			//adapter.log.debug("Box Model: " +xml.e2abouts.e2about[0].e2model[0]);
			//adapter.setState('enigma2.MODEL', {val: xml.e2abouts.e2about[0].e2model[0], ack: true});
            break;
		case "ISRECORD":
			//adapter.log.debug("is Recording: " + xml.e2timerlist.e2timer);
			if(xml.e2timerlist.e2timer !== undefined){
				adapter.log.debug("is Recording: " +xml.e2timerlist.e2timer[0].e2state[0]);
				adapter.setObjectNotExists('enigma2.isRecording', { type: 'state', common: { type: 'boolean', role: 'state', name: 'is Recording', read:  true, write: false }, native: {} });
				if(xml.e2timerlist.e2timer[0].e2state[0] === 2 || xml.e2timerlist.e2timer[0].e2state[0] === '2'){
					adapter.setState('enigma2.isRecording', {val: true, ack: true});
				} else {
					adapter.setState('enigma2.isRecording', {val: false, ack: true});	
				}
			} else {
				//adapter.delObject('enigma2.isRecording');
				adapter.setObjectNotExists('enigma2.isRecording', { type: 'state', common: { type: 'boolean', role: 'state', name: 'is Recording', read:  true, write: false }, native: {} });
				adapter.setState('enigma2.isRecording', {val: false, ack: true});
			}
            break;
        case "DEVICEINFO":
            adapter.setState('enigma2.WEB_IF_VERSION', {val: xml.e2deviceinfo.e2webifversion[0], ack: true});
            adapter.setState('enigma2.NETWORK', {val: xml.e2deviceinfo.e2network[0].e2interface[0].e2name[0], ack: true});
            adapter.setState('enigma2.BOX_IP', {val: xml.e2deviceinfo.e2network[0].e2interface[0].e2ip[0], ack: true});
			adapter.setState('enigma2.MODEL', {val: xml.e2deviceinfo.e2devicename[0], ack: true});
			 break;
		case "DEVICEINFO_HDD":
			if(xml.e2deviceinfo.e2hdds[0].e2hdd !== undefined){
			
			    adapter.setObjectNotExists('enigma2.HDD_CAPACITY', {
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
				adapter.setObjectNotExists('enigma2.HDD_FREE', {
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
				
				adapter.setState('enigma2.HDD_CAPACITY', {val: xml.e2deviceinfo.e2hdds[0].e2hdd[0].e2capacity[0], ack: true});
				adapter.setState('enigma2.HDD_FREE', {val: xml.e2deviceinfo.e2hdds[0].e2hdd[0].e2free[0], ack: true});
				if(xml.e2deviceinfo.e2hdds[0].e2hdd[1] !== undefined){
				
					adapter.setObjectNotExists('enigma2.HDD2_CAPACITY', {
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
					adapter.setObjectNotExists('enigma2.HDD2_FREE', {
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

					adapter.setState('enigma2.HDD2_CAPACITY', {val: xml.e2deviceinfo.e2hdds[0].e2hdd[1].e2capacity[0], ack: true});
					adapter.setState('enigma2.HDD2_FREE', {val: xml.e2deviceinfo.e2hdds[0].e2hdd[1].e2free[0], ack: true});
				} else {
					adapter.delObject('enigma2.HDD2_CAPACITY');
					adapter.delObject('enigma2.HDD2_FREE');
				};
			} else {
				adapter.delObject('enigma2.HDD2_CAPACITY');
				adapter.delObject('enigma2.HDD2_FREE');
				adapter.delObject('enigma2.HDD_CAPACITY');
				adapter.delObject('enigma2.HDD_FREE');
			}
		
            break;
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

function APIstatusinfo () {
var etwas, result;
try {
  require("request")('http://' + adapter.config.IPAddress + ':' + adapter.config.Port + PATH['API'], function (error, response, result) {
	if (!error) { 
		etwas = result.slice(((result.indexOf('"isRecording": ') + 1) - 1), result.indexOf('", "currservice_description":') + 1);
			if(etwas === '' || etwas === undefined){
				adapter.log.debug("isRecording: undefined");
				adapter.delObject('enigma2.isRecording');
			} else {
				adapter.log.debug("isRecording: " + parseBool(etwas.slice(16, etwas.length - 1)));
				adapter.setObjectNotExists('enigma2.isRecording', { type: 'state', common: { type: 'boolean', role: 'state', name: 'is Recording', read:  true, write: false }, native: {} });
				adapter.setState('enigma2.isRecording', {val: (parseBool(etwas.slice(16, etwas.length - 1))), ack: true});
			}
	} else {
		adapter.log.debug("isRecording: error");
		adapter.delObject('enigma2.isRecording');
	}
  }).on("error", function (e) {console.error(e);});
} catch (e) { console.error(e); }
}

function setStatus(status)
{
	if(status != isConnected)
	{
        isConnected = status;
        if (isConnected) {
			adapter.log.info("enigma2 Verbunden!");
			adapter.setState('enigma2-CONNECTION', true, true );
			getResponse('GETSTANDBY',		deviceId, PATH['POWERSTATE'],		evaluateCommandResponse);
			getResponse('MESSAGEANSWER',		deviceId, PATH['MESSAGEANSWER'],	evaluateCommandResponse);
			getResponse('GETINFO',			deviceId, PATH['ABOUT'],		evaluateCommandResponse);
			getResponse('GETVOLUME',		deviceId, PATH['VOLUME'],		evaluateCommandResponse);
			getResponse('GETCURRENT',		deviceId, PATH['GET_CURRENT'],		evaluateCommandResponse);
			getResponse('ISRECORD',			deviceId, PATH['ISRECORD'], 		evaluateCommandResponse);
			//getResponse('STATUSINFO',		deviceId, PATH['API'],			APIstatusinfo);
        } else {
            adapter.log.info("enigma2: " + adapter.config.IPAddress + ":" + adapter.config.Port + " ist nicht erreichbar!");
            adapter.setState('enigma2-CONNECTION', false, true );
            // Werte aus Adapter loeschen
            /*adapter.setState('enigma2.BOX_IP', "" );
            adapter.setState('enigma2.CHANNEL', "" );
            adapter.setState('enigma2.CHANNEL_PICON', "" );
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
            adapter.setState('Message.MESSAGE_ANSWER', false, true );*/
        }
	}
}

function main() {
	// adapter.config:
	adapter.log.debug('config IPAddress: ' + adapter.config.IPAddress);
	adapter.log.debug('config Port: ' + adapter.config.Port);
	adapter.log.debug('config Username: ' + adapter.config.Username);
	adapter.log.debug('config Password'+ adapter.config.Password);


    adapter.setObjectNotExists('Message.Text', {
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
		
    adapter.setObjectNotExists('Message.Type', {
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

	adapter.setObjectNotExists('Message.Timeout', {
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
	
    adapter.setObjectNotExists('enigma2-CONNECTION', {
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
	
	//+++++++++++++++++++++++++ ALEXA +++++++++++++++++++++++++++++++++++++++++++
	
	if (adapter.config.Alexa === 'true' || adapter.config.Alexa === true){
		adapter.setObjectNotExists('Alexa_Command.Standby', {
			type: 'state',
			common: {
				type: 'boolean',
				role: 'state',
				name: 'Receiver Standby Toggle with Alexa (true=Receiver ON / false=Receiver OFF)',
				read:  true,
				write: true
			},
			native: {}
		});
		adapter.setObjectNotExists('Alexa_Command.Mute', {
			type: 'state',
			common: {
				type: 'boolean',
				role: 'state',
				name: 'Receiver Mute Toggle with Alexa (true=volume ON / false=Volume OFF)',
				read:  true,
				write: true
			},
			native: {}
		});
	} else {
		adapter.delObject('Alexa_Command.Standby');
		adapter.delObject('Alexa_Command.Mute');
	};
	
	//+++++++++++++++++++++++++ STATE +++++++++++++++++++++++++++++++++++++++++++
	
    adapter.setObjectNotExists('enigma2.VOLUME', {
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
    adapter.setObjectNotExists('enigma2.MESSAGE_ANSWER', {
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
    adapter.setObjectNotExists('enigma2.MUTED', {
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
    adapter.setObjectNotExists('enigma2.STANDBY', {
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
    adapter.setObjectNotExists('enigma2.CHANNEL', {
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
    adapter.setObjectNotExists('enigma2.CHANNEL_SERVICEREFERENCE', {
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
	adapter.setObjectNotExists('enigma2.CHANNEL_SERVICEREFERENCE_NAME', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
			name: 'Servicereference Name',
			read:  true,
            write: false
        },
        native: {}
    });
    /*adapter.setObjectNotExists('enigma2.CHANNEL_PICON', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
			name: 'Servicereference Picon',
			read:  true,
            write: false
        },
        native: {}
    });*/
	adapter.setObjectNotExists('enigma2.PROGRAMM', {
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
	adapter.setObjectNotExists('enigma2.PROGRAMM_INFO', {
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
	adapter.setObjectNotExists('enigma2.PROGRAMM_AFTER', {
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
	adapter.setObjectNotExists('enigma2.PROGRAMM_AFTER_INFO', {
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
	adapter.setObjectNotExists('enigma2.EVENTDESCRIPTION', {
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
	
	adapter.setObjectNotExists('enigma2.EVENTDURATION', {
        type: 'state',
        common: {
            type: 'number',
            role: 'media.duration.text',
			name: 'Event Duration in H:M:S',
			read:  true,
            write: false
        },
        native: {}
    });

	adapter.setObjectNotExists('enigma2.EVENTREMAINING', {
        type: 'state',
        common: {
            type: 'number',
            role: 'media.elapsed.text',
			name: 'Event Remaining in H:M:S',
			read:  true,
            write: false
        },
        native: {}
    });
	
	adapter.setObjectNotExists('enigma2.EVENTDURATION_MIN', {
        type: 'state',
        common: {
            type: 'number',
            role: 'media.duration',
			name: 'Event Duration in Minute',
			read:  true,
            write: false
        },
        native: {}
    });

	adapter.setObjectNotExists('enigma2.EVENTREMAINING_MIN', {
        type: 'state',
        common: {
            type: 'number',
            role: 'media.elapsed',
			name: 'Event Remaining in Minute',
			read:  true,
            write: false
        },
        native: {}
    });
	
	adapter.setObjectNotExists('enigma2.EVENT_PROGRESS_PERCENT', {
        type: 'state',
        common: {
            type: 'number',
            role: 'media.progress',
			name: 'Event Progress Percent',
			read:  true,
            write: false
        },
        native: {}
    });
    
	adapter.setObjectNotExists('enigma2.EVENT_TIME_PASSED', {
        type: 'state',
        common: {
            type: 'string',
            role: 'media.broadcastDate',
			name: 'Event Time Passed',
			read:  true,
            write: false
        },
        native: {}
    });
	
	adapter.setObjectNotExists('enigma2.EVENT_TIME_START', {
        type: 'state',
        common: {
            type: 'string',
            role: 'media.broadcastDate',
			name: 'Event Start',
			read:  true,
            write: false
        },
        native: {}
    });
	
	adapter.setObjectNotExists('enigma2.EVENT_TIME_END', {
        type: 'state',
        common: {
            type: 'string',
            role: 'media.broadcastDate',
			name: 'Event End',
			read:  true,
            write: false
        },
        native: {}
    });
	
    // in this example all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');
	

    //Check ever 3 secs
    adapter.log.info("starting Polling every " + adapter.config.PollingInterval + " ms");
    setInterval(function() {
		getResponse('GETSTANDBY',		deviceId, PATH['POWERSTATE'],		evaluateCommandResponse);		
		getResponse('MESSAGEANSWER',	deviceId, PATH['MESSAGEANSWER'],	evaluateCommandResponse);
		getResponse('GETINFO',			deviceId, PATH['ABOUT'],			evaluateCommandResponse);
		getResponse('GETVOLUME',		deviceId, PATH['VOLUME'],			evaluateCommandResponse);
		getResponse('GETCURRENT',		deviceId, PATH['GET_CURRENT'],		evaluateCommandResponse);
		getResponse('ISRECORD',			deviceId, PATH['ISRECORD'],			evaluateCommandResponse);
		//getResponse('STATUSINFO',		deviceId, PATH['API'],				APIstatusinfo);
	}, adapter.config.PollingInterval);

    setInterval(function() {
        if (isConnected) {
			getResponse('DEVICEINFO_HDD',	deviceId, PATH['DEVICEINFO'],	evaluateCommandResponse);
        }
	}, 30000);
}



function main2() {

	adapter.setObjectNotExists('enigma2.MODEL', {
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
	adapter.setObjectNotExists('enigma2.WEB_IF_VERSION', {
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
	adapter.setObjectNotExists('enigma2.NETWORK', {
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
	adapter.setObjectNotExists('enigma2.BOX_IP', {
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
   // adapter.log.info("starting Polling every " + adapter.config.PollingInterval / 1000 + " seconds");
    //setInterval(checkStatus,adapter.config.PollingInterval);
	getResponse('DEVICEINFO', deviceId, PATH['DEVICEINFO'],  evaluateCommandResponse);
}





function checkTimer()
{ 	
	getResponse('TIMERLIST', deviceId, PATH['TIMERLIST'], TimerSearch);
	adapter.log.debug("suche nach Timer");
}

function timer()
{
	// Initial einmal Starten, dann per setInterval
	checkTimer();
	
	setInterval(checkTimer,adapter.config.TimerCheck);
	adapter.log.info("starting Timercheck every " + adapter.config.TimerCheck + " ms");
}




//############################################   TIMER   ####################################################

function TimerSearch (command, deviceId, xml) {
	//var bool;
    switch (command.toUpperCase())
    {
        case "TIMERLIST":
            // Clear Timerlist
            adapter.delObject('Timer');
			if(xml.e2timerlist.e2timer !== undefined)
			{
				for (var i = 0; i < xml.e2timerlist.e2timer.length; i++)
				{
					adapter.setObjectNotExists('Timer.' + i + '.Event-Name', {
						type: 'state',
						common: {
							type: 'string',
							role: 'state',
							name: 'Sendung Name',
							read:  true,
							write: false
						},
						native: {}
					});
					adapter.setObjectNotExists('Timer.' + i + '.Station', {
						type: 'state',
						common: {
							type: 'string',
							role: 'state',
							name: 'TV Sender',
							read:  true,
							write: false
						},
						native: {}
					});
					adapter.setObjectNotExists('Timer.' + i + '.Disabled', {
						type: 'state',
						common: {
							type: 'number',
							role: 'state',
							states: {
								0: 'Timer aktiviert',
								1: 'Timer deaktiviert'
							},
							name: 'Timer Aktivität',
							read:  true,
							write: false
						},
						native: {}
					});
					adapter.setObjectNotExists('Timer.' + i + '.Repeated', {
						type: 'state',
						common: {
							type: 'number',
							role: 'state',
							/*states: {
							'False': 'keine Wiederholung',
							0: 'keine Wiederholung',
							1: 'Mo',
							2: 'Di',
							4: 'Mi',
							8: 'Do',
							16: 'Fr',
							32: 'Sa',
							64: 'So'
							},*/
							name: 'Timer Wiederholung',
							read:  true,
							write: false
						},
						native: {}
					});
					adapter.setObjectNotExists('Timer.' + i + '.Timer_Start', {
						type: 'state',
						common: {
							type: 'number',
							role: 'state',
							name: 'Timer Aktivität',
							read:  true,
							write: false
						},
						native: {}
					});
					adapter.setObjectNotExists('Timer.' + i + '.Timer_End', {
						type: 'state',
						common: {
							type: 'number',
							role: 'state',
							name: 'Timer Aktivität',
							read:  true,
							write: false
						},
						native: {}
					});

					adapter.setObjectNotExists('Timer.' + i + '.Timer_servicereference', {
						type: 'state',
						common: {
							type: 'number',
							role: 'state',
							name: 'Timer Aktivität',
							read:  true,
							write: false
						},
						native: {}
					});
					//++BUTTON++ 	Timer_Toggle
					/*adapter.setObjectNotExists('Timer.' + i + '.Delete', {
						type: 'state',
						common: {
							type: 'boolean',
							role: 'button',
							name: 'Timer Delete',
							read:  false,
							write: true
						},
						native: {}
					});
					adapter.setObjectNotExists('Timer.' + i + '.Timer_Toggle', {
						type: 'state',
						common: {
							type: 'boolean',
							role: 'button',
							name: 'Timer ON/OFF',
							read:  false,
							write: true
						},
						native: {}
					});*/

					adapter.setState('Timer.' + i + '.Event-Name', {val: xml.e2timerlist.e2timer[i].e2name[0], ack: true});
					adapter.setState('Timer.' + i + '.Station', {val: xml.e2timerlist.e2timer[i].e2servicename[0], ack: true});
					adapter.setState('Timer.' + i + '.Disabled', {val: xml.e2timerlist.e2timer[i].e2disabled[0], ack: true});
					adapter.setState('Timer.' + i + '.Repeated', {val: xml.e2timerlist.e2timer[i].e2repeated[0], ack: true});
					adapter.setState('Timer.' + i + '.Timer_servicereference', {val: xml.e2timerlist.e2timer[i].e2servicereference[0], ack: true});
					adapter.setState('Timer.' + i + '.Timer_End', {val: xml.e2timerlist.e2timer[i].e2timeend[0], ack: true});
					adapter.setState('Timer.' + i + '.Timer_Start', {val: xml.e2timerlist.e2timer[i].e2timebegin[0], ack: true});
				}
			}
			break;

        default:
            adapter.log.info("received unknown TimerSearch '"+command+"' @ TimerSearch");
    }
}

function deleteObject () {
//old only in V1.0.0
	adapter.delObject('command.Button-Config.USER');
	adapter.delObject('command.Button-Config.PW');
	adapter.delObject('command.Button-Config.Webif');
	adapter.delObject('command.Button-Config.Port');
	adapter.delObject('command.Button-Config.IP');
}
