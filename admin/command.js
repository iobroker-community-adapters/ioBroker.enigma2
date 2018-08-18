//########### ENIGMA 2 BUTTON SCRIPT V1.2 ############
//
// -> https://github.com/Matten-Matten/ioBroker.enigma2/blob/master/admin/COMMAND
//
var WEBINTERFACE, EXIT, STATE, MENU, RADIO, ADAPTER, IP, TV, PORT, VOL, USER, PW;
//
//
//####### WERTE IN DEN KLAMMERN ANPASSEN #########
//                                              ##
// Hier die IP ADRESSE der e2 Box eintragen     ##
IP = '192.168.0.1';//                           ##
//                                              ##
// Hier den PORT der e2 Box eintragen           ##
PORT = '80';//                                  ##
//                                              ##
// USER der e2 Box eintragen                    ##
USER = 'root';//                                ##
//                                              ##
// Hier das PASSWORT der e2 Box eintragen       ##
PW = 'dreambox';//                              ##
//                                              ##
// Hier die WEBIF_VERSION eintragen             ##
//      0= Dream webif / 1= openwebif           ##
WEBINTERFACE = '1';//                           ##
// Hier die Adapter Instanz festlegen           ##
var ADAPTER_INSTANZ = 'enigma2.0';//            ##
//                                              ##
//################################################
//
//
//### AB HIER NIX VERÄNDERN ###########################################################################################
//
//
// WEBIF_VERSION
if (WEBINTERFACE === '0') {
  // DREAMWEBIF 
  EXIT = '1';
  MENU = '141';
  RADIO = '377';
  TV = '385';
  console.log('WEBIF_VERSION = Dream webif');
} else if (WEBINTERFACE == '1') {
  // OPENWEBIF
  EXIT = '174';
  MENU = '139';
  RADIO = '385';
  TV = '377';
  console.log('WEBIF_VERSION = openwebif');
} else {
  console.error('WEBIF_VERSION AUSWÄHLEN!');
}
// Schaltzustand der e2 Box
on({id: ADAPTER_INSTANZ + ".command.STANDBY_TOGGLE"/*command.STANDBY_TOGGLE*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  STATE = (obj.state ? obj.state.val : "");
});

// Adapterzustand
on({id: "system.adapter." + ADAPTER_INSTANZ + ".alive"/*ADAPTER_INSTANZ + .alive*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if ((obj.state ? obj.state.val : "") === true) {
    ADAPTER = true;
  } else {
    ADAPTER = false;
  }
});
// Box Standby
on({id: ADAPTER_INSTANZ + ".command.STANDBY_TOGGLE"/*command.STANDBY_TOGGLE*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',116].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  }
});
// VOLUME
on({id: ADAPTER_INSTANZ + ".command.SET_VOLUME"/*command.SET_VOLUME*/, change: "ne"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    VOL = getState(ADAPTER_INSTANZ + ".command.SET_VOLUME").val;
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/vol?set=set',Math.round(VOL)].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  }
});
// MUTE
on({id: ADAPTER_INSTANZ + ".command.MUTE_TOGGLE"/*command.MUTE_TOGGLE*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',113].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  }
});
// CHANNEL_UP
on({id: ADAPTER_INSTANZ + ".command.CHANNEL_UP"/*command.CHANNEL_UP*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',402].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  }
});
// CHANNEL_DOWN
on({id: ADAPTER_INSTANZ + ".command.CHANNEL_DOWN"/*command.CHANNEL_DOWN*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',403].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  }
});
// OK
on({id: ADAPTER_INSTANZ + ".command.OK"/*command.OK*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',352].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  }
});
// DOWN
on({id: ADAPTER_INSTANZ + ".command.DOWN"/*command.DOWN*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',108].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  }
});
// EPG
on({id: ADAPTER_INSTANZ + ".command.EPG"/*command.EPG*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',358].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  }
});
// EXIT
on({id: ADAPTER_INSTANZ + ".command.EXIT"/*command.EXIT*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',EXIT].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  } else {
    console.warn('DER RECEIVER IST AUS!');
  }
});
// LEFT
on({id: ADAPTER_INSTANZ + ".command.LEFT"/*command.LEFT*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',105].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  }
});
// MENU
on({id: ADAPTER_INSTANZ + ".command.MENU"/*command.MENU*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',MENU].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  } else {
    console.warn('DER RECEIVER IST AUS!');
  }
});
// PAUSE
on({id: ADAPTER_INSTANZ + ".command.PAUSE"/*command.PAUSE*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',119].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  }
});
// PLAY
on({id: ADAPTER_INSTANZ + ".command.PLAY"/*command.PLAY*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',207].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  }
});
// RADIO
on({id: ADAPTER_INSTANZ + ".command.RADIO"/*command.RADIO*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',RADIO].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  } else {
    console.warn('DER RECEIVER IST AUS!');
  }
});
// REC
on({id: ADAPTER_INSTANZ + ".command.REC"/*command.REC*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',167].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  }
});
// RIGHT
on({id: ADAPTER_INSTANZ + ".command.RIGHT"/*command.RIGHT*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',106].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  }
});
// STOP
on({id: ADAPTER_INSTANZ + ".command.STOP"/*command.STOP*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',128].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  }
});
// TV
on({id: ADAPTER_INSTANZ + ".command.TV"/*command.TV*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER === true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',TV].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  } else {
    console.warn('DER RECEIVER IST AUS!');
  }
});
// UP
on({id: ADAPTER_INSTANZ + ".command.UP"/*command.UP*/, change: "any"}, function (obj) {
  var value = obj.state.val;
  var oldValue = obj.oldState.val;
  if (ADAPTER == true && ADAPTER == true) {
    try {
      require("request")((['http://',USER,':',PW,'@',IP,':',PORT,'/web/remotecontrol?command=',103].join(''))).on("error", function (e) {console.error(e);});
    } catch (e) { console.error(e); }
  }
});
