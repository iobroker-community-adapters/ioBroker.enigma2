const http = require('http');
const xml2js = require('xml2js');
const utils = require('@iobroker/adapter-core');
const adapterName = require('./package.json').name.split('.').pop();

let adapter;

let isConnected = null;
const deviceId = 1;

// Polling
let eventInterval;
let deviceInfoInterval;
let movieListInterval;

const PATH = {
    MESSAGEANSWER: '/web/messageanswer?getanswer=now',
    DEVICEINFO: '/web/deviceinfo',
    REMOTE_CONTROL: '/web/remotecontrol?command=',
    VOLUME: '/web/vol',
    VOLUME_SET: '/web/vol?set=',
    ABOUT: '/web/about',
    GET_CURRENT: '/web/getcurrent',
    POWERSTATE: '/web/powerstate',
    MESSAGE: '/web/message?text=',
    DELETE: '/web/timerdelete?sRef=',
    TIMER_TOGGLE: '/api/timertogglestatus?sRef=',
    TIMERLIST: '/web/timerlist',
    MAIN_COMMAND: '/web/powerstate?newstate=',
    IP_CHECK: '/web/about',
    ZAP: '/web/zap?sRef=',
    ISRECORD: '/web/timerlist',
    API: '/api/statusinfo',
    GETLOCATIONS: '/web/getlocations',
    GETALLSERVICES: '/web/getallservices'
};

const commands = {
    CHANNEL_DOWN: 403,
    CHANNEL_UP: 402,
    DOWN: 108,
    EPG: 358,
    EXIT: 174,
    LEFT: 105,
    MENU: 139,
    MUTE_TOGGLE: 113,
    OK: 352,
    PLAY_PAUSE: 164,
    RADIO: 385,
    REC: 167,
    RIGHT: 106,
    STANDBY_TOGGLE: 116,
    STOP: 128,
    TV: 377,
    UP: 103,
};

const mainCommands = {
    DEEP_STANDBY: 1,
    REBOOT: 2,
    RESTART_GUI: 3,
    WAKEUP_FROM_STANDBY: 4,
    STANDBY: 5,
};

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function startAdapter(options) {
    options = options || {};
    Object.assign(options, { name: adapterName });

    adapter = new utils.Adapter(options);

    adapter.on('unload', callback => {
        try {
            eventInterval && clearInterval(eventInterval);
            eventInterval = null;

            deviceInfoInterval && clearInterval(deviceInfoInterval);
            deviceInfoInterval = null;

            movieListInterval && clearInterval(movieListInterval);
            movieListInterval = null;
        } catch (e) {
            callback();
        }
    });

    adapter.on('message', async obj => {
        if (obj !== null && obj !== undefined) {
            adapter.log.debug(`enigma2 message: ${JSON.stringify(obj.message)}`);

            adapter.log.debug(`enigma2 message Timeout: ${parseFloat(JSON.stringify(obj.message.timeout).replace(/"/g, ''))}`);
            await adapter.setStateAsync('Message.Timeout', {
                val: parseFloat(JSON.stringify(obj.message.timeout).replace(/"/g, '')),
                ack: true
            });

            adapter.log.debug(`enigma2 command Message Type: ${parseFloat(JSON.stringify(obj.message.msgType).replace(/"/g, ''))}`);
            await adapter.setStateAsync('Message.Type', {
                val: parseFloat(JSON.stringify(obj.message.msgType).replace(/"/g, '')),
                ack: true
            });

            adapter.log.debug(`enigma2 message Text: ${JSON.stringify(obj.message.message).replace(/"/g, '')}`);
            await adapter.setStateAsync('Message.Text', {val: JSON.stringify(obj.message.message).replace(/"/g, ''), ack: false});
        }
    });

    adapter.on('stateChange', async (id, state) => {
        if (id && state && !state.ack) {
            const parts = id.split('.');
            const name = parts.pop();

            if (id === `${adapter.namespace}.Message.Type`) {
                adapter.log.debug(`Info Message Type: ${state.val}`);
                await adapter.setStateAsync('Message.Type', {val: state.val, ack: true});
            } else if (id === `${adapter.namespace}.Message.Timeout`) {
                adapter.log.debug(`Info Message Timeout: ${state.val}s`);
                await adapter.setStateAsync('Message.Timeout', {val: state.val, ack: true});
            }

            if (commands[name]) {
                await getResponseAsync('NONE', deviceId, `${PATH['REMOTE_CONTROL'] + commands[name]}&rcu=advanced`);
            } else if (mainCommands[name]) {
                await getResponseAsync('NONE', deviceId, PATH['MAIN_COMMAND'] + mainCommands[name]);
            } else if (id === `${adapter.namespace}.Timer.Update`) {
                const xml = await getResponseAsync('TIMERLIST', deviceId, PATH['TIMERLIST']);
                await timerSearchResponse('TIMERLIST', deviceId, xml);

                adapter.log.debug('Timer manuell aktualisiert');

            } else if (id === `${adapter.namespace}.Alexa_Command.Standby`) {
                //+++++++++++++++++++++++++++
                const state = await adapter.getStateAsync('Alexa_Command.Standby');
                if (state.val === true) {
                    await getResponseAsync('NONE', deviceId, `${PATH['MAIN_COMMAND']}4`);
                } else if (state.val === false) {
                    await getResponseAsync('NONE', deviceId, `${PATH['MAIN_COMMAND']}5`);
                }
                await adapter.setStateAsync('Alexa_Command.Standby', {val: state.val, ack: true});
            } else if (id === `${adapter.namespace}.Alexa_Command.Mute`) {
                const state = await adapter.getStateAsync('Alexa_Command.Mute');
                if (state && state.val === true) {
                    await getResponseAsync('NONE', deviceId, `${PATH['REMOTE_CONTROL']}113`);
                    await adapter.setStateAsync('Alexa_Command.Mute', {val: state.val, ack: true});
                } else if (!state || state.val === false) {
                    await getResponseAsync('NONE', deviceId, `${PATH['REMOTE_CONTROL']}113`);
                    await adapter.setStateAsync('Alexa_Command.Mute', {val: state.val, ack: true});
                }
            } else if (id === `${adapter.namespace}.enigma2.Update`) {
                // enigma2.Update
                let xml = await getResponseAsync('GETSTANDBY', deviceId, PATH['POWERSTATE']);
                await evaluateCommandResponse('GETSTANDBY', deviceId, xml);

                xml = await getResponseAsync('MESSAGEANSWER', deviceId, PATH['MESSAGEANSWER']);
                await evaluateCommandResponse('MESSAGEANSWER', deviceId, xml);

                xml = await getResponseAsync('GETINFO', deviceId, PATH['ABOUT']);
                await evaluateCommandResponse('GETINFO', deviceId, xml);

                xml = await getResponseAsync('GETVOLUME', deviceId, PATH['VOLUME']);
                await evaluateCommandResponse('GETVOLUME', deviceId, xml);

                xml = await getResponseAsync('GETCURRENT', deviceId, PATH['GET_CURRENT']);
                await evaluateCommandResponse('GETCURRENT', deviceId, xml);

                xml = await getResponseAsync('ISRECORD', deviceId, PATH['ISRECORD']);
                await evaluateCommandResponse('ISRECORD', deviceId, xml);

                xml = await getResponseAsync('TIMERLIST', deviceId, PATH['TIMERLIST']);
                await evaluateCommandResponse('TIMERLIST', deviceId, xml);

                xml = await getResponseAsync('GETMOVIELIST', deviceId, PATH['GETLOCATIONS']);
                await evaluateCommandResponse('GETMOVIELIST', deviceId, xml);

                adapter.log.debug('E2 States manuell aktualisiert');
                await adapter.setStateAsync('enigma2.Update', {val: state.val, ack: true});
            } else if (id === `${adapter.namespace}.enigma2.STANDBY`) {
                await getResponseAsync('NONE', deviceId, `${PATH['MAIN_COMMAND']}0`);
                await adapter.setStateAsync('enigma2.STANDBY', state.val, true);
                const xml = await getResponseAsync('GETSTANDBY', deviceId, PATH['POWERSTATE']);
                await evaluateCommandResponse('GETSTANDBY', deviceId, xml);
            } else if (id === `${adapter.namespace}.command.SET_VOLUME`) {
                await getResponseAsync('NONE', deviceId, `${PATH['VOLUME_SET']}set${parseInt(state.val, /*10*/)}`);
                await adapter.setStateAsync('command.SET_VOLUME', {val: state.val, ack: true});
                const xml = await getResponseAsync('GETVOLUME', deviceId, PATH['VOLUME']);
                await evaluateCommandResponse('GETVOLUME', deviceId, xml);
            } else if (id === `${adapter.namespace}.command.VOLUME_UP`) {
                adapter.log.debug(' Vol UP');
                await getResponseAsync('NONE', deviceId, `${PATH['VOLUME_SET']}up`);
                await adapter.setStateAsync('command.VOLUME_UP', {val: true, ack: true});
                const xml = await getResponseAsync('GETVOLUME', deviceId, PATH['VOLUME']);
                await evaluateCommandResponse('GETVOLUME', deviceId, xml);
            } else if (id === `${adapter.namespace}.command.VOLUME_DOWN`) {
                adapter.log.debug(' Vol Down');
                await getResponseAsync('NONE', deviceId, `${PATH['VOLUME_SET']}down`);
                await adapter.setStateAsync('command.VOLUME_DOWN', {val: true, ack: true});
                const xml = await getResponseAsync('GETVOLUME', deviceId, PATH['VOLUME']);
                await evaluateCommandResponse('GETVOLUME', deviceId, xml);
            } else if (id === `${adapter.namespace}.command.REMOTE-CONTROL`) {
                adapter.log.debug(`Its our Command: ${state.val}`);
                await getResponseAsync('NONE', deviceId, `${PATH['REMOTE_CONTROL'] + state.val}&rcu=advanced`);
                await adapter.setStateAsync('command.REMOTE-CONTROL', {val: state.val, ack: true});
            } else if (id === `${adapter.namespace}.Message.Text`) {
                adapter.log.debug(`Info message: ${state.val}`);
                const MESSAGE_TEXT = state.val;

                let state = await adapter.getStateAsync('Message.Type')
                adapter.log.debug(`Info Message Type: ${state.val}`);
                const MESSAGE_TYPE = state.val;

                state = await adapter.getStateAsync('Message.Timeout');
                adapter.log.debug(`Info Message Type: ${state.val}`);
                const MESSAGE_TIMEOUT = state.val;

                await getResponseAsync('NONE', deviceId, `${PATH['MESSAGE'] + encodeURIComponent(MESSAGE_TEXT)}&type=${MESSAGE_TYPE}&timeout=${MESSAGE_TIMEOUT}`);
                await adapter.setStateAsync('Message.Text', {val: MESSAGE_TEXT, ack: true});
            } else if (id === `${adapter.namespace}.command.ZAP`) {
                // ZAP
                adapter.log.debug(`Info message: ${state.val}`);
                //const MESSAGE_TEXT  = state.val;
                await getResponseAsync('NONE', deviceId, PATH['ZAP'] + state.val);
                await adapter.setStateAsync('command.ZAP', {val: state.val, ack: true});
            } else if (parts[1] === 'Timer' && name === 'Timer_Toggle') {
                //Timer
                const timerID = parts[2];

                let state = await adapter.getStateAsync(`Timer.${timerID}.Timer_servicereference`);
                const T_sRef = state.val;
                state = await adapter.getStateAsync(`Timer.${timerID}.Timer_Start`);
                const T_begin = state.val;
                state = await adapter.getStateAsync(`Timer.${timerID}.Timer_End`);
                const T_end = state.val;
                await getResponseAsync('NONE', deviceId, `${PATH['TIMER_TOGGLE'] + T_sRef}&begin=${T_begin}&end=${T_end}`);
                const xml = await getResponseAsync('TIMERLIST', deviceId, PATH['TIMERLIST']);
                await timerSearchResponse('TIMERLIST', deviceId, xml);
            } else if (parts[1] === 'Timer' && name === 'Delete') {
                const timerID = parts[2];

                let state = await adapter.getStateAsync(`Timer.${timerID}.Timer_servicereference`);
                const T_sRef = state.val;
                state = await adapter.getStateAsync(`Timer.${timerID}.Timer_Start`);
                const T_begin = state.val;
                state = await adapter.getStateAsync(`Timer.${timerID}.Timer_End`);
                const T_end = state.val;
                await getResponseAsync('NONE', deviceId, `${PATH['DELETE'] + T_sRef}&begin=${T_begin}&end=${T_end}`);
                await adapter.setStateAsync(`Timer.${timerID}.Delete`, {val: state.val, ack: true});
                const xml = await getResponseAsync('TIMERLIST', deviceId, PATH['TIMERLIST']);
                await timerSearchResponse('TIMERLIST', deviceId, xml);
            }
        }
    });

    adapter.on('ready', async () => {
        await main();
        await main2();
        //timer();
        //deleteObject();
    });

    return adapter;
}
// Polling

async function getResponseAsync(command, deviceId, path) {
    command = command || 'NONE';

    return new Promise(resolve  => {
        // const device = dreamSettings.boxes[deviceId];
        const options = {
            host: adapter.config.IPAddress,
            port: adapter.config.Port,
            TimerCheck: adapter.config.TimerCheck,
            Webinterface: adapter.config.Webinterface,
            movieliste: adapter.config.movieliste ? 'true' : 'false',
            timerliste: adapter.config.timerliste ? 'true' : 'false',
            path,
            alexa: adapter.config.Alexa ? 'true' : 'false',
            method: 'GET',
        };

        adapter.log.debug(`creating request for command '${command}' (deviceId: ${deviceId}, host: ${options.host}, port: ${options.port}, path: '${options.path}')`);

        if (typeof adapter.config.Username != 'undefined' && typeof adapter.config.Password != 'undefined') {
            if (adapter.config.Username.length > 0 && adapter.config.Password.length > 0) {
                options.headers = {
                    'Authorization': `Basic ${Buffer.from(`${adapter.config.Username}:${adapter.config.Password}`).toString('base64')}`
                }
                adapter.log.debug(`using authorization with user '${adapter.config.Username}'`);
            } else {
                adapter.log.debug('using no authorization');
            }
        }

        const req = http.get(options, res => {
            const { statusCode } = res;
            let pageData = '';

            if (command === 'PICON') {
                res.setEncoding('base64');

                pageData = `data:${res.headers['content-type']};base64,`;
            } else {
                res.setEncoding('utf8');

                if (statusCode == 200) {
                    setStatus(true);
                }
            }

            res.on('data', chunk => pageData += chunk);
            res.on('end', () => {
                if (command !== 'PICON') {
                    if (path.includes('/api/')) {
                        // using JSON API
                        try {
                            const parser = JSON.parse(pageData);
                            resolve(command, deviceId, parser);
                        } catch (err) {
                            adapter.log.error(`[await getResponseAsync] error: ${err.message}`);
                            adapter.log.error(`[await getResponseAsync] stack: ${err.stack}`);
                            resolve(null);
                        }
                    } else {
                        // using XML API
                        const parser = new xml2js.Parser();
                        parser.parseString(pageData, (err, result) =>
                            resolve(result));
                    }
                } else {
                    resolve(pageData);
                }
            });
        });
        req.on('error', async e => {
            await setStatus(false);
            adapter.log.debug(`received error: ${e.message} Box eventuell nicht erreichbar?`);
            await adapter.setStateAsync('enigma2.isRecording', false, true);
            resolve(null);
        });
    });
}

function parseBool(string) {
    const cleanedString = string[0].replace(/(\r|\t\n|\n|\t)/gm, '').toLowerCase();
    return cleanedString === 'true' || cleanedString === 'yes' || cleanedString === '1';
}

function sec2HMS(sec) {
    if (sec === 0) {
        return '0';
    }

    const sec_num = parseInt(sec, 10);
    let hours = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    let seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (minutes < 10) {
        minutes = `0${minutes}`;
    }
    if (seconds < 10) {
        seconds = `0${seconds}`;
    }
    if (hours === 0) {
        return `${minutes}:${seconds}`;
    }

    if (hours < 10) {
        hours = `0${hours}`;
    }
    return `${hours}:${minutes}:${seconds}`;
}

async function evaluateCommandResponse(command, deviceId, xml) {
    if (!xml) {
        return;
    }
    try {
        adapter.log.debug(`evaluating response for command '${command}': ${JSON.stringify(xml)}`);

        let bool;

        switch (command.toUpperCase()) {
            case 'MESSAGE':
            case 'MESSAGETEXT':
            case 'MESSAGEANSWER':
                adapter.log.debug(`message answer: ${xml.e2simplexmlresult.e2statetext[0]}`);
                await adapter.setStateAsync('enigma2.MESSAGE_ANSWER', {val: xml.e2simplexmlresult.e2statetext[0], ack: true});
                break;
            case 'RESTART':
            case 'REBOOT':
            case 'DEEPSTANDBY':
                break;
            case 'MUTE':
            case 'UNMUTE':
            case 'MUTE_TOGGLE':
            case 'VOLUME':
            case 'SET_VOLUME':
                await adapter.setStateAsync('enigma2.COMMAND', {val: '', ack: true});
                break;
            case 'WAKEUP':
            case 'STANDBY':
            case 'OFF':
            case 'STANDBY_TOGGLE':
                break;
            case 'GETSTANDBY':
                adapter.log.debug(`Box Standby: ${parseBool(xml.e2powerstate.e2instandby)}`);
                await adapter.setStateAsync('enigma2.STANDBY', {val: parseBool(xml.e2powerstate.e2instandby), ack: true});
                if (adapter.config.Webinterface === 'true' && parseBool(xml.e2powerstate.e2instandby) === true) {
                    await adapter.setStateAsync('enigma2.CHANNEL_PICON', {val: '', ack: true});
                }
                // Alexa_Command.Standby
                if (adapter.config.Alexa) {
                    const alexastby = parseBool(xml.e2powerstate.e2instandby);
                    if (alexastby === false || alexastby === 'false') {
                        await adapter.setStateAsync('Alexa_Command.Standby', {val: true, ack: true});
                    } else if (alexastby === true || alexastby === 'true') {
                        await adapter.setStateAsync('Alexa_Command.Standby', {val: false, ack: true});
                    }
                }
                break;
            case 'GETVOLUME':
                if (!xml.e2volume || !xml.e2volume.e2current) {
                    adapter.log.error('No e2volume found');
                    return;
                }
                bool = parseBool(xml.e2volume.e2ismuted);
                adapter.log.debug(`Box Volume:${parseInt(xml.e2volume.e2current[0])}`);
                await adapter.setStateAsync('enigma2.VOLUME', {val: parseInt(xml.e2volume.e2current[0]), ack: true});
                adapter.log.debug(`Box Muted:${parseBool(xml.e2volume.e2ismuted)}`);
                await adapter.setStateAsync('enigma2.MUTED', {val: parseBool(xml.e2volume.e2ismuted), ack: true});
                // Alexa_Command.Mute
                if (adapter.config.Alexa) {
                    const alexaMute = parseBool(xml.e2volume.e2ismuted);
                    if (alexaMute === false || alexaMute === 'false') {
                        await adapter.setStateAsync('Alexa_Command.Mute', {val: true, ack: true});
                    } else if (alexaMute === true || alexaMute === 'true') {
                        await adapter.setStateAsync('Alexa_Command.Mute', {val: false, ack: true});
                    }
                }
                break;
            case 'GETCURRENT':
                if (xml && xml.e2currentserviceinformation && xml.e2currentserviceinformation.e2eventlist[0] !== undefined) {
                    adapter.log.debug(`Box EVENTDURATION: ${parseInt(xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventduration[0])}`);
                    const e2EVENTDURATION_X = (xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventduration[0]);
                    await adapter.setStateAsync('enigma2.EVENTDURATION_MIN', {val: Math.round(e2EVENTDURATION_X / 60), ack: true});
                    const e2EVENTDURATION = sec2HMS(parseFloat(e2EVENTDURATION_X));

                    if (e2EVENTDURATION === 'NaN:NaN:NaN' || e2EVENTDURATION === '0') {
                        await adapter.setStateAsync('enigma2.EVENTDURATION', {val: ''/*'0:0:0'*/, ack: true});
                    } else {
                        await adapter.setStateAsync('enigma2.EVENTDURATION', {val: e2EVENTDURATION, ack: true});
                    }

                    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

                    adapter.log.debug(`Box EVENTREMAINING: ${parseInt(xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventremaining[0])}`);
                    const e2EVENTREMAINING_X = xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventremaining[0];
                    await adapter.setStateAsync('enigma2.EVENTREMAINING_MIN', {
                        val: Math.round(e2EVENTREMAINING_X / 60),
                        ack: true
                    });
                    const e2EVENTREMAINING = sec2HMS(parseFloat(e2EVENTREMAINING_X));

                    if (e2EVENTREMAINING === 'NaN:NaN:NaN' || e2EVENTREMAINING === '0') {
                        await adapter.setStateAsync('enigma2.EVENTREMAINING', {val: ''/*'0:0:0'*/, ack: true});
                    } else {
                        await adapter.setStateAsync('enigma2.EVENTREMAINING', {val: e2EVENTREMAINING, ack: true});
                    }

                    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

                    adapter.log.debug(`Box Programm: ${xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventname[0]}`);
                    await adapter.setStateAsync('enigma2.PROGRAMM', {
                        val: (xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventname[0]).replace('N/A', ''),
                        ack: true
                    });

                    adapter.log.debug(`Box Programm_danach: ${xml.e2currentserviceinformation.e2eventlist[0].e2event[1].e2eventname[0]}`);
                    await adapter.setStateAsync('enigma2.PROGRAMM_AFTER', {
                        val: (xml.e2currentserviceinformation.e2eventlist[0].e2event[1].e2eventname[0]).replace('N/A', ''),
                        ack: true
                    });

                    adapter.log.debug(`Box Programm Info: ${xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventdescriptionextended[0]}`);
                    await adapter.setStateAsync('enigma2.PROGRAMM_INFO', {
                        val: xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventdescriptionextended[0],
                        ack: true
                    });

                    adapter.log.debug(`Box Programm danach Info: ${xml.e2currentserviceinformation.e2eventlist[0].e2event[1].e2eventdescriptionextended[0]}`);
                    await adapter.setStateAsync('enigma2.PROGRAMM_AFTER_INFO', {
                        val: xml.e2currentserviceinformation.e2eventlist[0].e2event[1].e2eventdescriptionextended[0],
                        ack: true
                    });

                    adapter.log.debug(`Box eventdescription: ${xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventdescription[0]}`);
                    await adapter.setStateAsync('enigma2.EVENTDESCRIPTION', {
                        val: xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventdescription[0],
                        ack: true
                    });

                    adapter.log.debug(`Box Sender Servicereference: ${xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventservicereference[0]}`);
                    const e2SERVICEREFERENCE = (xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventservicereference[0]);

                    if (e2SERVICEREFERENCE === '-1:8087252:0:77132724:2:0:C:0:0:77040804:' || e2EVENTREMAINING === '0') {
                        await adapter.setStateAsync('enigma2.CHANNEL_SERVICEREFERENCE', {val: '', ack: true});
                        await adapter.setStateAsync('enigma2.CHANNEL_SERVICEREFERENCE_NAME', {val: '', ack: true});
                    } else {
                        await adapter.setStateAsync('enigma2.CHANNEL_SERVICEREFERENCE', {val: e2SERVICEREFERENCE, ack: true});
                        await adapter.setStateAsync('enigma2.CHANNEL_SERVICEREFERENCE_NAME', {
                            val: e2SERVICEREFERENCE.replace(/:/g, '_').slice(0, -1),
                            ack: true
                        });
                        if (adapter.config.Webinterface === 'true' || adapter.config.Webinterface === true) {
                            const state = await adapter.getStateAsync('enigma2.STANDBY');
                            if (state.val === false) {
                                //openwebif PICON http://...
                                await adapter.setStateAsync('enigma2.CHANNEL_PICON', {
                                    val: `http://${adapter.config.IPAddress}:${adapter.config.Port}/picon/${e2SERVICEREFERENCE.replace(/:/g, '_').slice(0, -1)}.png`,
                                    ack: true
                                });
                            } else {
                                await adapter.setStateAsync('enigma2.CHANNEL_PICON', {val: '', ack: true});
                            }
                        }
                    }
                    //EVENT_PROGRESS_PERCENT
                    const Step1 = parseFloat((parseFloat(e2EVENTDURATION_X) - parseFloat(e2EVENTREMAINING_X)));
                    const Step2 = parseFloat((Step1 / parseFloat(e2EVENTDURATION_X)));
                    const Step3 = parseFloat((Math.round(Step2 * 100)));
                    await adapter.setStateAsync('enigma2.EVENT_PROGRESS_PERCENT', {val: parseInt(Step3), ack: true});
                    //EVENT_TIME_PASSED //NaN:NaN:NaN
                    const Step1_1 = sec2HMS(parseInt(Step1));
                    if (Step1_1 === 'NaN:NaN:NaN') {
                        await adapter.setStateAsync('enigma2.EVENT_TIME_PASSED', {val: '', ack: true});
                    } else {
                        await adapter.setStateAsync('enigma2.EVENT_TIME_PASSED', {val: sec2HMS(parseInt(Step1)), ack: true});
                    }

                    const e2Eventstart = (xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventstart[0]);
                    const e2Eventend = (xml.e2currentserviceinformation.e2eventlist[0].e2event[1].e2eventstart[0]);

                    if (e2Eventstart !== e2Eventend) {
                        //EVENT_TIME_START
                        let date = new Date(e2Eventstart * 1000);
                        // Hours part from the timestamp
                        let hours = date.getHours();
                        // Minutes part from the timestamp
                        let minutes = `0${date.getMinutes()}`;

                        // Will display time in 10:30 format
                        let formattedTime = `${hours}:${minutes.substr(-2)}`;
                        await adapter.setStateAsync('enigma2.EVENT_TIME_START', {val: (formattedTime), ack: true});

                        //EVENT_TIME_END
                        date = new Date(e2Eventend * 1000);
                        // Hours part from the timestamp
                        hours = date.getHours();
                        // Minutes part from the timestamp
                        minutes = `0${date.getMinutes()}`;

                        // Will display time in 10:30 format
                        formattedTime = `${hours}:${minutes.substr(-2)}`;
                        await adapter.setStateAsync('enigma2.EVENT_TIME_END', {val: (formattedTime), ack: true});

                    } else {
                        await adapter.setStateAsync('enigma2.EVENT_TIME_END', {val: '', ack: true});
                        await adapter.setStateAsync('enigma2.EVENT_TIME_START', {val: '', ack: true});
                    }

                    break;
                }
            case 'GETINFO':
                adapter.log.debug(`Box Sender: ${xml.e2abouts.e2about[0].e2servicename[0]}`);
                await adapter.setStateAsync('enigma2.CHANNEL', {val: xml.e2abouts.e2about[0].e2servicename[0], ack: true});
                break;
            case 'DEVICEINFO':
                await adapter.setStateAsync('enigma2.WEB_IF_VERSION', {val: xml.e2deviceinfo.e2webifversion[0], ack: true});
                await adapter.setStateAsync('enigma2.NETWORK', {
                    val: xml.e2deviceinfo.e2network[0].e2interface[0].e2name[0],
                    ack: true
                });
                await adapter.setStateAsync('enigma2.BOX_IP', {
                    val: xml.e2deviceinfo.e2network[0].e2interface[0].e2ip[0],
                    ack: true
                });
                await adapter.setStateAsync('enigma2.MODEL', {val: xml.e2deviceinfo.e2devicename[0], ack: true});
                break;
            case 'DEVICEINFO_HDD':
                if (xml.e2deviceinfo.e2hdds[0].e2hdd !== undefined) {
                    await adapter.setObjectNotExistsAsync('enigma2.HDD_CAPACITY', {
                        type: 'state',
                        common: {
                            type: 'string',
                            role: 'state',
                            name: 'maximal Flash Capacity (Flash 1)',
                            read: true,
                            write: false
                        },
                        native: {}
                    });
                    await adapter.setObjectNotExistsAsync('enigma2.HDD_FREE', {
                        type: 'state',
                        common: {
                            type: 'string',
                            role: 'state',
                            name: 'free Flash Capacity (Flash 1)',
                            read: true,
                            write: false
                        },
                        native: {}
                    });

                    await adapter.setStateAsync('enigma2.HDD_CAPACITY', {
                        val: xml.e2deviceinfo.e2hdds[0].e2hdd[0].e2capacity[0],
                        ack: true
                    });
                    await adapter.setStateAsync('enigma2.HDD_FREE', {
                        val: xml.e2deviceinfo.e2hdds[0].e2hdd[0].e2free[0],
                        ack: true
                    });
                    if (xml.e2deviceinfo.e2hdds[0].e2hdd[1] !== undefined) {
                        await adapter.setObjectNotExistsAsync('enigma2.HDD2_CAPACITY', {
                            type: 'state',
                            common: {
                                type: 'string',
                                role: 'state',
                                name: 'maximal Flash Capacity (Flash 2)',
                                read: true,
                                write: false
                            },
                            native: {}
                        });
                        await adapter.setObjectNotExistsAsync('enigma2.HDD2_FREE', {
                            type: 'state',
                            common: {
                                type: 'string',
                                role: 'state',
                                name: 'free Flash Capacity (Flash 2)',
                                read: true,
                                write: false
                            },
                            native: {}
                        });

                        await adapter.setStateAsync('enigma2.HDD2_CAPACITY', {
                            val: xml.e2deviceinfo.e2hdds[0].e2hdd[1].e2capacity[0],
                            ack: true
                        });
                        await adapter.setStateAsync('enigma2.HDD2_FREE', {
                            val: xml.e2deviceinfo.e2hdds[0].e2hdd[1].e2free[0],
                            ack: true
                        });
                    } else {
                        await adapter.delObjectAsync('enigma2.HDD2_CAPACITY');
                        await adapter.delObjectAsync('enigma2.HDD2_FREE');
                    }
                } else {
                    await adapter.delObjectAsync('enigma2.HDD2_CAPACITY');
                    await adapter.delObjectAsync('enigma2.HDD2_FREE');
                    await adapter.delObjectAsync('enigma2.HDD_CAPACITY');
                    await adapter.delObjectAsync('enigma2.HDD_FREE');
                }
                break;
            case 'VOLUME_UP':
            case 'VOLUME_DOWN':
            case 'LEFT':
            case 'RIGHT':
            case 'UP':
            case 'DOWN':
            case 'EXIT':
            case 'CH_UP':
            case 'CH_DOWN':
            case 'SELECT':
            case 'OK':
            case 'BOUQUET_UP':
            case 'BOUQUET_DOWN':
            case 'INFO':
            case 'MENU':
            case 'ISRECORD':
                if (xml.e2timerlist.e2timer !== undefined) {
                    const meinArray = xml.e2timerlist.e2timer;
                    let rec = 0;
                    let isset = 3;
                    adapter.log.debug(`Array.length: ${meinArray.length}`);

                    for (let i = 0; i < meinArray.length; i++) {
                        if (2 === parseFloat(meinArray[i].e2state[0])) {
                            await adapter.setStateAsync('enigma2.isRecording', {val: true, ack: true});
                            rec = 2;
                        } else if (i === (meinArray.length - 1) && rec !== 2) {
                            await adapter.setStateAsync('enigma2.isRecording', {val: false, ack: true});
                        }
                        if (parseFloat(meinArray[i].e2state[0]) === 0 || parseFloat(meinArray[i].e2state[0]) === 2) {
                            await adapter.setStateAsync('enigma2.Timer_is_set', {val: true, ack: true});
                            isset = 2;
                        } else if (parseFloat(meinArray[i].e2state[0]) === 3 && isset !== 2) {
                            await adapter.setStateAsync('enigma2.Timer_is_set', {val: false, ack: true});
                        }
                    }
                } else {
                    await adapter.setStateAsync('enigma2.Timer_is_set', {val: false, ack: true});
                    await adapter.setStateAsync('enigma2.isRecording', {val: false, ack: true});
                }
                break;
            case 'TIMERLIST':
                let result = [];
                if (adapter.config.timerliste) {
                    if (xml && xml.e2timerlist && xml.e2timerlist.e2timer) {
                        let timerList = xml.e2timerlist.e2timer;

                        timerList.forEach(timerItem => result.push({
                            title: timerItem.e2name.toString(),
                            channel: timerItem.e2servicename.toString(),
                            serviceRef: timerItem.e2servicereference.toString(),
                            serviceRefName: timerItem.e2servicereference.toString().replace(/:/g, '_').slice(0, -1),
                            //starTime: timerItem.e2timebegin.toString(),
                            //endTime: timerItem.e2timeend.toString(),
                            // V1.3.4 #59
                            starTime: (timerItem.e2timebegin * 1000).toString(),
                            endTime: (timerItem.e2timeend * 1000).toString(),
                            // end
                            duration: timerItem.e2duration.toString(),
                            subtitle: timerItem.e2descriptio.toString(),
                            description: timerItem.e2descriptionextended.toString(),
                        }));

                        // only update if we have a result -> keep on data if box is in deepStandby
                        result = JSON.stringify(result);

                        const state = await adapter.getStateAsync('enigma2.TIMER_LIST');
                        // only update if we have a new timer
                        if (state && state.val !== null) {
                            if (result !== state.val) {
                                await adapter.setStateAsync('enigma2.TIMER_LIST', result, true);
                                adapter.log.debug('timer list updated');
                            } else {
                                adapter.log.debug("no new timer found -> timer list is up to date");
                            }
                        } else {
                            await adapter.setStateAsync('enigma2.TIMER_LIST', result, true);
                            adapter.log.debug('timer list updated');
                        }
                    }
                }
                break;
            case 'GETMOVIELIST':
                try {
                    if (xml && xml.e2locations && xml.e2locations.e2location) {
                        adapter.log.debug('updating movie list');

                        let movieList = [];
                        const movieDirs = xml.e2locations.e2location;
                        const allServices = await getResponseAsync('', deviceId, PATH['GETALLSERVICES']);		// list of all services to get the ref for movies (picons)

                        let servicesList = [];
                        if (allServices && allServices.e2servicelistrecursive && allServices.e2servicelistrecursive.e2bouquet) {
                            // prepare serviceList
                            for (const bouquet of allServices.e2servicelistrecursive.e2bouquet) {
                                if (bouquet && bouquet.e2servicelist) {
                                    for (const service of bouquet.e2servicelist) {
                                        servicesList.push(...service.e2service);
                                    }
                                }
                            }

                            //remove duplicates
                            servicesList = servicesList.filter(obj => !servicesList[obj.e2servicereference] && (servicesList[obj.e2servicereference] = true));
                        }

                        for (const dir of movieDirs) {
                            // iterate through media directories
                            await getAllMovies(dir, movieList, servicesList);
                            await sleep(500);
                        }

                        // sort recording time desc
                        movieList.sort((a, b) => b.recordingtime == a.recordingtime ? 0 : +(b.recordingtime > a.recordingtime) || -1);

                        movieList = JSON.stringify(movieList);

                        let state = await adapter.getStateAsync('enigma2.MOVIE_LIST');

                        // only update if we have new movies
                        if (state && state.val !== null) {
                            if (movieList !== state.val) {
                                await adapter.setStateAsync('enigma2.MOVIE_LIST', movieList, true);
                                adapter.log.debug('movie list updated');
                            } else {
                                adapter.log.debug('no new movies found -> movies list is up to date');
                            }
                        } else {
                            await adapter.setStateAsync('enigma2.MOVIE_LIST', movieList, true);
                            adapter.log.debug('movie list updated');
                        }
                    }
                } catch (err) {
                    adapter.log.error(`[GETMOVIELIST] error: ${err.message}`);
                    adapter.log.error(`[GETMOVIELIST] stack: ${err.stack}`);
                }

                break;
            default:
                adapter.log.info(`received unknown command '${command}' @ evaluateCommandResponse`);
                break;
        }
    } catch (err) {
        adapter.log.warn(`evaluateCommandResponse: ${err}`);
    }
}

async function getAllMovies(directory, movieList, servicesList) {
    adapter.log.debug(`get movies from directory: ${directory}`);

    try {
        if (adapter.config.movieliste) {
            if (adapter.config.Webinterface === 'true' || adapter.config.Webinterface === true) {
                // openwebif api
                const result = await getResponseAsync('', deviceId, `/api/movielist?dirname=${encodeURI(directory)}`);

                if (result) {
                    if (result.movies && result.movies.length > 0) {
                        for (const movie of result.movies) {
                            const service = servicesList.filter(obj => obj.e2servicename.toString() === movie.servicename.toString());

                            if (service && service[0]) {
                                movie.service = service[0].e2servicereference.toString();
                                movie.serviceRefName = service[0].e2servicereference.toString().replace(/:/g, '_').slice(0, -1);
                            }
                            movieList.push(movie);
                        }
                    }

                    if (result.bookmarks && result.bookmarks.length > 0) {
                        for (const subDir of result.bookmarks) {
                            await getAllMovies(`${directory + subDir}/`, movieList, servicesList);
                            await sleep(500);
                        }
                    }
                }
            } else {
                // TODO: dream api
            }
        }
    } catch (err) {
        adapter.log.error(`[getAllMovies] dir: ${directory}, error: ${err.message}`);
        adapter.log.error(`[getAllMovies] stack: ${err.stack}`);
    }
}

async function setStatus(status) {
    if (status !== isConnected) {
        isConnected = status;
        if (isConnected) {
            adapter.log.info('enigma2 Verbunden!');
            await adapter.setStateAsync('enigma2-CONNECTION', true, true);
            let xml = await getResponseAsync('GETSTANDBY', deviceId, PATH['POWERSTATE']);
            await evaluateCommandResponse('GETSTANDBY', deviceId, xml);

            xml = await getResponseAsync('MESSAGEANSWER', deviceId, PATH['MESSAGEANSWER']);
            await evaluateCommandResponse('MESSAGEANSWER', deviceId, xml);

            xml = await getResponseAsync('GETINFO', deviceId, PATH['ABOUT']);
            await evaluateCommandResponse('GETINFO', deviceId, xml);

            xml = await getResponseAsync('GETVOLUME', deviceId, PATH['VOLUME']);
            await evaluateCommandResponse('GETVOLUME', deviceId, xml);

            xml = await getResponseAsync('GETCURRENT', deviceId, PATH['GET_CURRENT']);
            await evaluateCommandResponse('GETCURRENT', deviceId, xml);

            xml = await getResponseAsync('ISRECORD', deviceId, PATH['ISRECORD']);
            await evaluateCommandResponse('ISRECORD', deviceId, xml);

            xml = await getResponseAsync('TIMERLIST', deviceId, PATH['TIMERLIST']);
            await evaluateCommandResponse('TIMERLIST', deviceId, xml);

            xml = await getResponseAsync('GETMOVIELIST', deviceId, PATH['GETLOCATIONS']);
            await evaluateCommandResponse('GETMOVIELIST', deviceId, xml);

            xml = await getResponseAsync('DEVICEINFO', deviceId, PATH['DEVICEINFO']);
            await evaluateCommandResponse('DEVICEINFO', deviceId, xml);
        } else {
            adapter.log.info(`enigma2: ${adapter.config.IPAddress}:${adapter.config.Port} ist nicht erreichbar!`);
            await adapter.setStateAsync('enigma2-CONNECTION', false, true);
            await adapter.setStateAsync('enigma2.isRecording', false, true);
            // Werte aus Adapter loeschen
            await adapter.setStateAsync('enigma2.BOX_IP', '', true);
            await adapter.setStateAsync('enigma2.CHANNEL', '', true);
            await adapter.setStateAsync('enigma2.CHANNEL_PICON', '', true);
            await adapter.setStateAsync('enigma2.CHANNEL_SERVICEREFERENCE', '', true);
            await adapter.setStateAsync('enigma2.EVENTDESCRIPTION', '', true);
            await adapter.setStateAsync('enigma2.EVENTDURATION', '', true);
            await adapter.setStateAsync('enigma2.EVENTREMAINING', '', true);
            await adapter.setStateAsync('enigma2.MESSAGE_ANSWER', '', true);
            await adapter.setStateAsync('enigma2.MODEL', '', true);
            await adapter.setStateAsync('enigma2.MUTED', false, true);
            await adapter.setStateAsync('enigma2.NETWORK', '', true);
            await adapter.setStateAsync('enigma2.PROGRAMM', '', true);
            await adapter.setStateAsync('enigma2.PROGRAMM_AFTER', '', true);
            await adapter.setStateAsync('enigma2.PROGRAMM_AFTER_INFO', '', true);
            await adapter.setStateAsync('enigma2.PROGRAMM_INFO', '', true);
            await adapter.setStateAsync('enigma2.STANDBY', true, true);
            await adapter.setStateAsync('enigma2.VOLUME', 0, true);
            await adapter.setStateAsync('enigma2.WEB_IF_VERSION', '', true);
            //await adapter.setStateAsync('Message.MESSAGE_ANSWER', false, true);
            //...
        }
    }
}

async function main() {
    // migrate configuration
    if (adapter.config.movieliste === 'true' || adapter.config.movieliste === 'false' ||
        adapter.config.timerliste === 'true' || adapter.config.timerliste === 'false' ||
        adapter.config.Alexa === 'true' || adapter.config.Alexa === 'false'
    ) {
        const obj = await adapter.getForeignObjectAsync(`system.adapter.${adapter.namespace}`);
        obj.native.movieliste = adapter.config.movieliste === 'true' || adapter.config.movieliste === true;
        obj.native.timerliste = adapter.config.timerliste === 'true' || adapter.config.timerliste === true;
        obj.native.Alexa = adapter.config.Alexa === 'true' || adapter.config.Alexa === true;
        await adapter.setForeignObjectAsync(`system.adapter.${adapter.namespace}`, obj);
        return;
    }

    // adapter.config:
    adapter.log.debug(`config IPAddress: ${adapter.config.IPAddress}`);
    adapter.log.debug(`config Port: ${adapter.config.Port}`);
    adapter.log.debug(`config Username: ${adapter.config.Username}`);
    adapter.log.debug(`config Password: ${adapter.config.Password}`);

    await adapter.setObjectNotExistsAsync('Message.Text', {
        type: 'state',
        common: {
            type: 'string',
            role: 'text',
            name: 'Send a info Message to the Receiver Screen',
            desc: 'messagetext=Text of Message',
            read: false,
            write: true
        },
        native: {}
    });

    await adapter.setObjectNotExistsAsync('Message.Type', {
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
            read: true,
            write: true
        },
        native: {}
    });
    await adapter.setStateAsync('Message.Type', 1, true);

    await adapter.setObjectNotExistsAsync('Message.Timeout', {
        type: 'state',
        common: {
            type: 'number',
            role: 'control',
            desc: 'timeout=Can be empty or the Number of seconds the Message should disappear after',
            read: true,
            write: true
        },
        native: {}
    });
    await adapter.setStateAsync('Message.Timeout', 15, true);

    //Verbindung
    await adapter.setObjectNotExistsAsync('enigma2-CONNECTION', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'state',
            name: 'Connection to Receiver',
            read: true,
            write: false
        },
        native: {}
    });
    await adapter.setStateAsync('enigma2-CONNECTION', false, true);

    //ALEXA
    if (adapter.config.Alexa) {
        await adapter.setObjectNotExistsAsync('Alexa_Command.Standby', {
            type: 'state',
            common: {
                type: 'boolean',
                role: 'state',
                name: 'Receiver Standby Toggle with Alexa (true=Receiver ON / false=Receiver OFF)',
                read: true,
                write: true
            },
            native: {}
        });
        await adapter.setObjectNotExistsAsync('Alexa_Command.Mute', {
            type: 'state',
            common: {
                type: 'boolean',
                role: 'state',
                name: 'Receiver Mute Toggle with Alexa (true=volume ON / false=Volume OFF)',
                read: true,
                write: true
            },
            native: {}
        });
    } else {
        await adapter.delObjectAsync('Alexa_Command.Standby');
        await adapter.delObjectAsync('Alexa_Command.Mute');
    }

    //STATE
    await adapter.setObjectNotExistsAsync('enigma2.VOLUME', {
        type: 'state',
        common: {
            type: 'number',
            role: 'level.volume',
            name: 'Volume 0-100%',
            read: true,
            write: false
        },
        native: {}
    });
    await adapter.setObjectNotExistsAsync('enigma2.MESSAGE_ANSWER', {
        type: 'state',
        common: {
            type: 'string',
            role: 'message',
            name: 'Message Answer',
            read: true,
            write: false
        },
        native: {}
    });
    await adapter.setObjectNotExistsAsync('enigma2.MUTED', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'media.mute',
            name: 'is Muted',
            read: true,
            write: false
        },
        native: {}
    });
    await adapter.setObjectNotExistsAsync('enigma2.STANDBY', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'state',
            name: 'Receiver in Standby',
            read: true,
            write: false
        },
        native: {}
    });
    await adapter.setObjectNotExistsAsync('enigma2.CHANNEL', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
            name: 'Channel Name',
            read: true,
            write: false
        },
        native: {}
    });
    await adapter.setObjectNotExistsAsync('enigma2.CHANNEL_SERVICEREFERENCE', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
            name: 'Servicereference Code',
            read: true,
            write: false
        },
        native: {}
    });
    await adapter.setObjectNotExistsAsync('enigma2.CHANNEL_SERVICEREFERENCE_NAME', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
            name: 'Servicereference Name',
            read: true,
            write: false
        },
        native: {}
    });
    if (adapter.config.Webinterface === "true" || adapter.config.Webinterface === true) {
        // openwebif api
        await adapter.setObjectNotExistsAsync('enigma2.CHANNEL_PICON', {
            type: 'state',
            common: {
                type: 'string',
                role: 'state',
                name: 'Servicereference Picon',
                read: true,
                write: false
            },
            native: {}
        });
    } else {
        await adapter.delObjectAsync('enigma2.CHANNEL_PICON');
    }
    await adapter.setObjectNotExistsAsync('enigma2.PROGRAMM', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
            name: 'current Programm',
            read: true,
            write: false
        },
        native: {}
    });
    await adapter.setObjectNotExistsAsync('enigma2.PROGRAMM_INFO', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
            name: 'current Programm Info',
            read: true,
            write: false
        },
        native: {}
    });
    await adapter.setObjectNotExistsAsync('enigma2.PROGRAMM_AFTER', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
            name: 'Programm after',
            read: true,
            write: false
        },
        native: {}
    });
    await adapter.setObjectNotExistsAsync('enigma2.PROGRAMM_AFTER_INFO', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
            name: 'Programm Info after',
            read: true,
            write: false
        },
        native: {}
    });
    await adapter.setObjectNotExistsAsync('enigma2.EVENTDESCRIPTION', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
            name: 'Event description',
            read: true,
            write: false
        },
        native: {}
    });

    await adapter.setObjectNotExistsAsync('enigma2.EVENTDURATION', {
        type: 'state',
        common: {
            type: 'string',
            role: 'media.duration.text',
            name: 'Event Duration in H:M:S',
            read: true,
            write: false
        },
        native: {}
    });

    await adapter.setObjectNotExistsAsync('enigma2.EVENTREMAINING', {
        type: 'state',
        common: {
            type: 'string',
            role: 'media.elapsed.text',
            name: 'Event Remaining in H:M:S',
            read: true,
            write: false
        },
        native: {}
    });

    await adapter.setObjectNotExistsAsync('enigma2.EVENTDURATION_MIN', {
        type: 'state',
        common: {
            type: 'number',
            role: 'media.duration',
            name: 'Event Duration in Minute',
            read: true,
            write: false
        },
        native: {}
    });

    await adapter.setObjectNotExistsAsync('enigma2.EVENTREMAINING_MIN', {
        type: 'state',
        common: {
            type: 'number',
            role: 'media.elapsed',
            name: 'Event Remaining in Minute',
            read: true,
            write: false
        },
        native: {}
    });

    await adapter.setObjectNotExistsAsync('enigma2.EVENT_PROGRESS_PERCENT', {
        type: 'state',
        common: {
            type: 'number',
            role: 'media.progress',
            name: 'Event Progress Percent',
            read: true,
            write: false
        },
        native: {}
    });

    await adapter.setObjectNotExistsAsync('enigma2.EVENT_TIME_PASSED', {
        type: 'state',
        common: {
            type: 'string',
            role: 'media.broadcastDate',
            name: 'Event Time Passed',
            read: true,
            write: false
        },
        native: {}
    });

    await adapter.setObjectNotExistsAsync('enigma2.EVENT_TIME_START', {
        type: 'state',
        common: {
            type: 'string',
            role: 'media.broadcastDate',
            name: 'Event Start',
            read: true,
            write: false
        },
        native: {}
    });

    await adapter.setObjectNotExistsAsync('enigma2.EVENT_TIME_END', {
        type: 'state',
        common: {
            type: 'string',
            role: 'media.broadcastDate',
            name: 'Event End',
            read: true,
            write: false
        },
        native: {}
    });

    await adapter.subscribeStatesAsync('*');

    //Check ever 3 secs
    adapter.log.info(`starting Polling every ${adapter.config.PollingInterval} ms`);
    /*	setInterval(function () {
            await getResponseAsync('GETSTANDBY', deviceId, PATH['POWERSTATE'], evaluateCommandResponse);
            await getResponseAsync('MESSAGEANSWER', deviceId, PATH['MESSAGEANSWER'], evaluateCommandResponse);
            await getResponseAsync('GETINFO', deviceId, PATH['ABOUT'], evaluateCommandResponse);
            await getResponseAsync('GETVOLUME', deviceId, PATH['VOLUME'], evaluateCommandResponse);
            await getResponseAsync('GETCURRENT', deviceId, PATH['GET_CURRENT'], evaluateCommandResponse);
            await getResponseAsync('ISRECORD', deviceId, PATH['ISRECORD'], evaluateCommandResponse);
            await getResponseAsync('TIMERLIST', deviceId, PATH['TIMERLIST'], evaluateCommandResponse);
        }, adapter.config.PollingInterval);

        setInterval(function () {
            if (isConnected) {
                await getResponseAsync('DEVICEINFO_HDD', deviceId, PATH['DEVICEINFO'], evaluateCommandResponse);
            }
        }, 30000);

        setInterval(function () {
            if (isConnected) {
                await getResponseAsync('GETMOVIELIST', deviceId, PATH['GETLOCATIONS'], evaluateCommandResponse);
            }
        }, 60000 * 30);
    */
    eventInterval = setInterval(async () => {
        if (isConnected) {
            let xml = await getResponseAsync('GETSTANDBY', deviceId, PATH['POWERSTATE']);
            await evaluateCommandResponse('GETSTANDBY', deviceId, xml);

            xml = await getResponseAsync('MESSAGEANSWER', deviceId, PATH['MESSAGEANSWER']);
            await evaluateCommandResponse('MESSAGEANSWER', deviceId, xml);

            xml = await getResponseAsync('GETINFO', deviceId, PATH['ABOUT']);
            await evaluateCommandResponse('GETINFO', deviceId, xml);

            xml = await getResponseAsync('GETVOLUME', deviceId, PATH['VOLUME']);
            await evaluateCommandResponse('GETVOLUME', deviceId, xml);

            xml = await getResponseAsync('GETCURRENT', deviceId, PATH['GET_CURRENT']);
            await evaluateCommandResponse('GETCURRENT', deviceId, xml);

            xml = await getResponseAsync('ISRECORD', deviceId, PATH['ISRECORD'],);
            await evaluateCommandResponse('ISRECORD', deviceId, xml);

            xml = await getResponseAsync('TIMERLIST', deviceId, PATH['TIMERLIST']);
            await evaluateCommandResponse('TIMERLIST', deviceId, xml);
        }
    }, adapter.config.PollingInterval);

    deviceInfoInterval = setInterval(async () => {
        if (isConnected) {
            const xml = await getResponseAsync('DEVICEINFO_HDD', deviceId, PATH['DEVICEINFO']);
            await evaluateCommandResponse('DEVICEINFO_HDD', deviceId, xml);
        }
    }, 30000);

    movieListInterval = setInterval(async() => {
        if (isConnected) {
            const xml = await getResponseAsync('GETMOVIELIST', deviceId, PATH['GETLOCATIONS']);
            await evaluateCommandResponse('GETMOVIELIST', deviceId, xml);
        }
    }, 60000 * 30);
}

async function main2() {
    await adapter.setObjectNotExistsAsync('enigma2.MODEL', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
            name: 'Receiver Model',
            read: true,
            write: false,
        },
        native: {}
    });
    await adapter.setObjectNotExistsAsync('enigma2.WEB_IF_VERSION', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
            name: 'Receiver Webinterface Version',
            read: true,
            write: false,
        },
        native: {}
    });
    await adapter.setObjectNotExistsAsync('enigma2.NETWORK', {
        type: 'state',
        common: {
            type: 'string',
            role: 'state',
            name: 'Receiver used Network',
            read: true,
            write: false,
        },
        native: {},
    });
    await adapter.setObjectNotExistsAsync('enigma2.BOX_IP', {
        type: 'state',
        common: {
            type: 'string',
            role: 'info.ip',
            name: 'Receiver IP-Adress',
            read: true,
            write: false,
        },
        native: {},
    });
    await adapter.setObjectNotExistsAsync('enigma2.isRecording', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'state',
            name: 'Receiver is Recording',
            read: true,
            write: false,
        },
        native: {},
    });
    await adapter.setObjectNotExistsAsync('enigma2.Timer_is_set', {
        type: 'state',
        common: {
            type: 'boolean',
            role: 'state',
            name: 'min 1 Timer is set',
            read: true,
            write: false,
        },
        native: {},
    });
    if (adapter.config.timerliste) {
        await adapter.setObjectNotExistsAsync('enigma2.TIMER_LIST', {
            type: 'state',
            common: {
                type: 'string',
                role: 'info',
                name: 'Timer List',
                read: true,
                write: false,
            },
            native: {},
        });
    } else {
        await adapter.delObjectAsync('enigma2.TIMER_LIST');
    }
    if (adapter.config.movieliste) {
        await adapter.setObjectNotExistsAsync('enigma2.MOVIE_LIST', {
            type: 'state',
            common: {
                type: 'string',
                role: 'info',
                name: 'Movie List',
                read: true,
                write: false,
            },
            native: {},
        });
    } else {
        await adapter.delObjectAsync('enigma2.MOVIE_LIST');
    }

    //Check ever 3 secs
    //adapter.log.info("starting Polling every " + adapter.config.PollingInterval / 1000 + " seconds");
    //setInterval(checkStatus,adapter.config.PollingInterval);
    //await getResponseAsync('DEVICEINFO', deviceId, PATH['DEVICEINFO'],  evaluateCommandResponse);
}

/*function checkTimer() {
	await getResponseAsync('TIMERLIST', deviceId, PATH['TIMERLIST'], timerSearchResponse);
	adapter.log.debug("suche nach Timer");
}

function timer() {
	// Initial einmal Starten, dann per setInterval
	checkTimer();

	setInterval(checkTimer, adapter.config.TimerCheck);
	adapter.log.info("starting Timercheck every " + adapter.config.TimerCheck + " ms");
}
*/
// TIMER
async function timerSearchResponse(command, deviceId, xml) {
    // disabled
	return;

	switch (command.toUpperCase()) {
		case 'TIMERLIST':
			// Clear Timerlist
			await adapter.delObjectAsync('Timer');
			if (xml.e2timerlist.e2timer !== undefined) {
				for (let i = 0; i < xml.e2timerlist.e2timer.length; i++) {
					await adapter.setObjectNotExistsAsync(`Timer.${i}.Event-Name`, {
						type: 'state',
						common: {
							type: 'string',
							role: 'state',
							name: 'Sendung Name',
							read: true,
							write: false,
						},
						native: {},
					});
					await adapter.setObjectNotExistsAsync(`Timer.${i}.Station`, {
						type: 'state',
						common: {
							type: 'string',
							role: 'state',
							name: 'TV Sender',
							read: true,
							write: false,
						},
						native: {},
					});
					await adapter.setObjectNotExistsAsync(`Timer.${i}.Disabled`, {
						type: 'state',
						common: {
							type: 'number',
							role: 'state',
							states: {
								0: 'Timer aktiviert',
								1: 'Timer deaktiviert'
							},
							name: 'Timer Aktivität',
							read: true,
							write: false,
						},
						native: {},
					});
					await adapter.setObjectNotExistsAsync(`Timer.${i}.Repeated`, {
						type: 'state',
						common: {
							type: 'number',
							role: 'state',
							states: {
							'False': 'keine Wiederholung',
							0: 'keine Wiederholung',
							1: 'Mo',
							2: 'Di',
							4: 'Mi',
							8: 'Do',
							16: 'Fr',
							32: 'Sa',
							64: 'So'
							},
							name: 'Timer Wiederholung',
							read: true,
							write: false,
						},
						native: {},
					});
					await adapter.setObjectNotExistsAsync(`Timer.${i}.Timer_Start`, {
						type: 'state',
						common: {
							type: 'number',
							role: 'state',
							name: 'Timer Aktivität',
							read: true,
							write: false,
						},
						native: {},
					});
					await adapter.setObjectNotExistsAsync(`Timer.${i}.Timer_End`, {
						type: 'state',
						common: {
							type: 'number',
							role: 'state',
							name: 'Timer Aktivität',
							read: true,
							write: false,
						},
						native: {},
					});

					await adapter.setObjectNotExistsAsync(`Timer.${i}.Timer_servicereference`, {
						type: 'state',
						common: {
							type: 'number',
							role: 'state',
							name: 'Timer Aktivität',
							read: true,
							write: false,
						},
						native: {},
					});
					//++BUTTON++ 	Timer_Toggle
					await adapter.setObjectNotExistsAsync(`Timer.${i}.Delete`, {
						type: 'state',
						common: {
							type: 'boolean',
							role: 'button',
							name: 'Timer Delete',
							read:  false,
							write: true,
						},
						native: {},
					});
					await adapter.setObjectNotExistsAsync(`Timer.${i}.Timer_Toggle`, {
						type: 'state',
						common: {
							type: 'boolean',
							role: 'button',
							name: 'Timer ON/OFF',
							read:  false,
							write: true,
						},
						native: {},
					});

					await adapter.setStateAsync(`Timer.${i}.Event-Name`, { val: xml.e2timerlist.e2timer[i].e2name[0], ack: true });
					await adapter.setStateAsync(`Timer.${i}.Station`, { val: xml.e2timerlist.e2timer[i].e2servicename[0], ack: true });
					await adapter.setStateAsync(`Timer.${i}.Disabled`, { val: xml.e2timerlist.e2timer[i].e2disabled[0], ack: true });
					await adapter.setStateAsync(`Timer.${i}.Repeated`, { val: xml.e2timerlist.e2timer[i].e2repeated[0], ack: true });
					await adapter.setStateAsync(`Timer.${i}.Timer_servicereference`, { val: xml.e2timerlist.e2timer[i].e2servicereference[0], ack: true });
					await adapter.setStateAsync(`Timer.${i}.Timer_End`, { val: xml.e2timerlist.e2timer[i].e2timeend[0], ack: true });
					await adapter.setStateAsync(`Timer.${i}.Timer_Start`, { val: xml.e2timerlist.e2timer[i].e2timebegin[0], ack: true });
				}
			}
			break;

		default:
			adapter.log.info(`received unknown TimerSearch '${command}' @ TimerSearch`);
            break;
	}
}

// If started as allInOne mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}