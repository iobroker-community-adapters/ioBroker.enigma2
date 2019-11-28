'use strict';

goog.provide('Blockly.JavaScript.Sendto');

goog.require('Blockly.JavaScript');


/// --- SendTo enigma2 --------------------------------------------------
Blockly.Words['enigma2']               = {'en': 'enigma2',			'de': 'enigma2',			'ru': 'enigma2'};
Blockly.Words['enigma2_message']       = {'en': 'message',			'de': 'Nachricht',			'ru': 'message'};
Blockly.Words['enigma2_timeout']       = {'en': 'timeout',			'de': 'timeout',			'ru': 'timeout'};
Blockly.Words['enigma2_msgType']       = {'en': 'message Type',		'de': 'Nachrichten Art',	'ru': 'message Type'};

Blockly.Words['enigma2_log']           = {'en': 'log level',                   'de': 'Loglevel',                           'ru': 'Протокол'};
Blockly.Words['enigma2_log_none']      = {'en': 'none',                        'de': 'keins',                              'ru': 'нет'};
Blockly.Words['enigma2_log_info']      = {'en': 'info',                        'de': 'info',                               'ru': 'инфо'};
Blockly.Words['enigma2_log_debug']     = {'en': 'debug',                       'de': 'debug',                              'ru': 'debug'};
Blockly.Words['enigma2_log_warn']      = {'en': 'warning',                     'de': 'warning',                            'ru': 'warning'};
Blockly.Words['enigma2_log_error']     = {'en': 'error',                       'de': 'error',                              'ru': 'ошибка'};

Blockly.Words['enigma2_anyInstance']   = {'en': 'all instances',               'de': 'Alle Instanzen',                     'ru': 'all instances'};
Blockly.Words['enigma2_tooltip']       = {'en': 'Send message to enigma2',    'de': 'Sende eine Nachricht an den Receiver',   'ru': 'Send message to enigma2'};
Blockly.Words['enigma2_help']          = {'en': 'https://github.com/Matten-Matten/ioBroker.enigma2/blob/master/README.md', 'de': 'https://github.com/Matten-Matten/ioBroker.enigma2/blob/master/README.md', 'ru': 'https://github.com/Matten-Matten/ioBroker.enigma2/blob/master/README.md'};

Blockly.Sendto.blocks['enigma2'] =
    '<block type="enigma2">'
    + '     <value name="INSTANCE">'
    + '     </value>'
    + '     <value name="MESSAGE">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">text</field>'
    + '         </shadow>'
	
	+ '     <value name="TIMEOUT">'
    + '         <shadow type="value">'
    + '             <field name="TEXT">text</field>'
    + '         </shadow>'
	
	+ '     <value name="MSGTYPE">'
    + '         <shadow type="value">'
    + '             <field name="TEXT">text</field>'
    + '         </shadow>'
/*	
    + '     </value>'
    + '     <value name="TIMEOUT">'
    + '     </value>'
    + '     <value name="MSGTYPE">'
    + '     </value>'
*/
    + '     <value name="LOG">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['enigma2'] = {
    init: function() {
        var options = [[Blockly.Words['enigma2_anyInstance'][systemLang], '']];
        if (typeof main !== 'undefined' && main.instances) {
            for (var i = 0; i < main.instances.length; i++) {
                var m = main.instances[i].match(/^system.adapter.enigma2.(\d+)$/);
                if (m) {
                    var k = parseInt(m[1], 10);
                    options.push(['enigma2.' + k, '.' + k]);
                }
            }
            if (options.length === 0) {
                for (var u = 0; u <= 4; u++) {
                    options.push(['enigma2.' + u, '.' + u]);
                }
            }
        } else {
            for (var n = 0; n <= 4; n++) {
                options.push(['enigma2.' + n, '.' + n]);
            }
        }

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Words['enigma2'][systemLang])
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendValueInput('MESSAGE')
            .appendField(Blockly.Words['enigma2_message'][systemLang]);

		this.appendValueInput('TIMEOUT')
            .appendField(Blockly.Words['enigma2_timeout'][systemLang]);
			
		this.appendValueInput('MSGTYPE')
            .appendField(Blockly.Words['enigma2_msgType'][systemLang]);

        this.appendDummyInput('LOG')
            .appendField(Blockly.Words['enigma2_log'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['enigma2_log_none'][systemLang],  ''],
                [Blockly.Words['enigma2_log_info'][systemLang],  'log'],
                [Blockly.Words['enigma2_log_debug'][systemLang], 'debug'],
                [Blockly.Words['enigma2_log_warn'][systemLang],  'warn'],
                [Blockly.Words['enigma2_log_error'][systemLang], 'error']
            ]), 'LOG');

/*        this.appendDummyInput('SILENT')
            .appendField(Blockly.Words['telegram_silent'][systemLang])
            .appendField(new Blockly.FieldCheckbox("FALSE"), "SILENT");

        this.appendDummyInput('PARSEMODE')
            .appendField("Parsemode")
            .appendField(new Blockly.FieldDropdown([["default","default"], ["HTML","HTML"], ["Markdown","Markdown"]]), "PARSEMODE");    

        if (input.connection) input.connection._optional = true;

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
*/
        this.setTooltip(Blockly.Words['enigma2_tooltip'][systemLang]);
        this.setHelpUrl(Blockly.Words['enigma2_help'][systemLang]);
    }
};

Blockly.JavaScript['enigma2'] = function(block) {
    var dropdown_instance = block.getFieldValue('INSTANCE');
    var logLevel = block.getFieldValue('LOG');
    var value_message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
	var value_timeout = Blockly.JavaScript.valueToCode(block, 'TIMEOUT', Blockly.JavaScript.ORDER_ATOMIC);
	var value_msgType = Blockly.JavaScript.valueToCode(block, 'MSGTYPE', Blockly.JavaScript.ORDER_ATOMIC);

    var logText;
    if (logLevel) {
		logText = 'console.' + logLevel + '("enigma2", {\n message: ' +  value_message + ',\n timeout: ' +  value_timeout + ',\n msgType: ' +  value_msgType + '\n });\n'
    } else {
        logText = '';
    }

    return 'sendTo"enigma2' + dropdown_instance + '", {\nmessage: ' +  value_message + ',\ntimeout: ' +  value_timeout + ',\nmsgType: ' +  value_msgType + '\n});\n' +
        logText;
};
