'use strict';

goog.provide('Blockly.JavaScript.Sendto');

goog.require('Blockly.JavaScript');

/// --- SendTo enigma2 --------------------------------------------------
Blockly.Words['enigma2'] = { en: 'enigma2', de: 'enigma2', ru: 'enigma2' };
Blockly.Words['enigma2_message'] = { en: 'message', de: 'Nachrichten Text', ru: 'message' };
Blockly.Words['enigma2_timeout'] = { en: 'timeout', de: 'Anzeige Dauer in Sekunden', ru: 'timeout' };
Blockly.Words['enigma2_msgType'] = { en: 'message Type', de: 'Nachrichten Art', ru: 'message Type' };

Blockly.Words['enigma2_MSGTYPE_'] = { en: '1', de: 'Informationen', ru: '1' };
Blockly.Words['enigma2_MSGTYPE_0'] = { en: '0', de: 'Ja/Nein', ru: '0' };
//Blockly.Words['enigma2_MSGTYPE_1']      = {'en': '1',                        'de': 'Informationen',                        'ru': '1'};
Blockly.Words['enigma2_MSGTYPE_2'] = { en: '2', de: 'Warnung', ru: '2' };
Blockly.Words['enigma2_MSGTYPE_3'] = { en: '3', de: 'Fehler', ru: '3' };

Blockly.Words['enigma2_log'] = { en: 'log level', de: 'Loglevel', ru: 'Протокол' };
Blockly.Words['enigma2_log_none'] = { en: 'none', de: 'keins', ru: 'нет' };
Blockly.Words['enigma2_log_info'] = { en: 'info', de: 'info', ru: 'инфо' };
Blockly.Words['enigma2_log_debug'] = { en: 'debug', de: 'debug', ru: 'debug' };
Blockly.Words['enigma2_log_warn'] = { en: 'warning', de: 'warning', ru: 'warning' };
Blockly.Words['enigma2_log_error'] = { en: 'error', de: 'error', ru: 'ошибка' };

Blockly.Words['enigma2_anyInstance'] = { en: 'all instances', de: 'Alle Instanzen', ru: 'all instances' };
Blockly.Words['enigma2_tooltip'] = {
    en: 'Send message to enigma2',
    de: 'Sende eine Nachricht an den Receiver',
    ru: 'Send message to enigma2',
};
Blockly.Words['enigma2_help'] = {
    en: 'https://github.com/iobroker-community-adapters/ioBroker.enigma2/blob/master/README.md',
    de: 'https://github.com/iobroker-community-adapters/ioBroker.enigma2/blob/master/README.md',
    ru: 'https://github.com/iobroker-community-adapters/ioBroker.enigma2/blob/master/README.md',
};

Blockly.Sendto.blocks['enigma2'] =
    '<block type="enigma2">' +
    '  <field name="INSTANCE"></field>' +
    '  <field name="MSGTYPE">1</field>' +
    '  <field name="LOG"></field>' +
    '  <value name="MESSAGE">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">text</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="TIMEOUT">' +
    '    <shadow type="math_number">' +
    '      <field name="NUM">30</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['enigma2'] = {
    init: function () {
        const options = [[Blockly.Translate('enigma2_anyInstance'), '']];
        if (typeof main !== 'undefined' && main.instances) {
            for (let i = 0; i < main.instances.length; i++) {
                const m = main.instances[i].match(/^system.adapter.enigma2.(\d+)$/);
                if (m) {
                    const k = parseInt(m[1], 10);
                    options.push([`enigma2.${k}`, `.${k}`]);
                }
            }
            if (options.length === 0) {
                for (let u = 0; u <= 4; u++) {
                    options.push([`enigma2.${u}`, `.${u}`]);
                }
            }
        } else {
            for (let n = 0; n <= 4; n++) {
                options.push([`enigma2.${n}`, `.${n}`]);
            }
        }

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('enigma2'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendValueInput('MESSAGE').appendField(Blockly.Translate('enigma2_message'));

        this.appendValueInput('TIMEOUT').appendField(Blockly.Translate('enigma2_timeout'));

        this.appendDummyInput('MSGTYPE')
            .appendField(Blockly.Translate('enigma2_msgType'))
            .appendField(
                new Blockly.FieldDropdown([
                    [Blockly.Translate('enigma2_MSGTYPE_'), '1'],
                    [Blockly.Translate('enigma2_MSGTYPE_0'), '0'],
                    //                [Blockly.Translate('enigma2_MSGTYPE_1'),  '1'],
                    [Blockly.Translate('enigma2_MSGTYPE_2'), '2'],
                    [Blockly.Translate('enigma2_MSGTYPE_3'), '3'],
                ]),
                'MSGTYPE',
            );

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('enigma2_log'))
            .appendField(
                new Blockly.FieldDropdown([
                    [Blockly.Translate('enigma2_log_none'), ''],
                    [Blockly.Translate('enigma2_log_debug'), 'debug'],
                    [Blockly.Translate('enigma2_log_info'), 'log'],
                    [Blockly.Translate('enigma2_log_warn'), 'warn'],
                    [Blockly.Translate('enigma2_log_error'), 'error'],
                ]),
                'LOG',
            );

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('enigma2_tooltip'));
        this.setHelpUrl(Blockly.Translate('enigma2_help'));
    },
};

Blockly.JavaScript['enigma2'] = function (block) {
    const dropdown_instance = block.getFieldValue('INSTANCE');
    const logLevel = block.getFieldValue('LOG');
    const value_msgType = block.getFieldValue('MSGTYPE');
    const value_message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    const value_timeout = Blockly.JavaScript.valueToCode(block, 'TIMEOUT', Blockly.JavaScript.ORDER_ATOMIC);

    let logText = '';
    if (logLevel) {
        logText = `console.${logLevel}('enigma2: ' + ${value_message} + ', timeout: ' + ${value_timeout} + ', msgType: ' + ${value_msgType});\n`;
    }

    return (
        `sendTo('enigma2${dropdown_instance}', 'send', {\n` +
        `  message: ${value_message},\n` +
        `  timeout: ${value_timeout},\n` +
        `  msgType: ${value_msgType},\n` +
        `});\n${logText}`
    );
};
