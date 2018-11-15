![Logo](admin/enigma2.png)
ioBroker enigma2 Adapter
==============
- Adapter for ioBroker to retrieve information from an enigma2 receiver and send commands
- (DE) Adapter für ioBroker um Informationen von einem enigma2 Receiver abzufragen und Befehle zu senden


## Funktionen
- BOX_IP
- NETWORK
- CHANNEL_SERVICEREFERENCE
- CHANNEL
- EVENTDESCRIPTION
- EVENTDURATION
- EVENTREMAINING
- HDD_CAPACITY
- HDD_FREE
- MESSAGE_ANSWER
- MODEL
- MUTED
- PROGRAMM
- PROGRAMM_INFO
- PROGRAMM_AFTER
- PROGRAMM_AFTER_INFO
- STANDBY
- VOLUME
- WEB_IF_VERSION

- enigma2-CONNECTION

## Command
- command.CHANNEL_DOWN
- command.CHANNEL_UP
- command.DOWN
- command.UP
- command.EPG
- command.EXIT
- command.LEFT
- command.MENU
- command.MUTE_TOGGLE
- command.OK
- command.PAUSE
- command.PLAY
- command.RADIO
- command.REC
- command.REMOTE-CONTROL
- command.RIGHT
- command.SET_VOLUME
- command.STANDBY_TOGGLE
- command.STOP
- command.TV
- command.UP

## Command
- main_command.DEEP_STANDBY
- main_command.REBOOT
- main_command.RESTART_GUI
- main_command.STANDBY
- main_command.WAKEUP_FROM_STANDBY


## Message
 - Message.Text           = Text of Message (Enter -> Send)
 - Message.Type           = Number from 0 to 3 (0= Yes/No ; 1= Info ; 2=Message ; 3=Attention)
 - Message.Timeout        = Can be empty or the Number of seconds the Message should disappear after.
 
 ## Timer !remove!
- Timer.Disabled
- Timer.Event-Name
- Timer.Repeated
- Timer.Station
- Timer.Timer_End
- Timer.Timer_Start
- Timer.Timer_servicereference
- Timer.Update

 
## Version

### 1.1.4 (2018-11-15)
* (Matten-Matten)      add main_command

### 1.1.3 (2018-11-15)
* (Matten-Matten)      remove Timer

### 1.1.2 (2018-11-01)
* (Matten-Matten)      Bug Fix

### 1.1.1 (2018-10-26)
* (NightWatcher)      CodeCleaning

### 1.1.0 (2018-10-26)
* (Matten-Matten)      add Timer, max 8 Timer
* (Matten-Matten)      add manually updating Timer states
* (Matten-Matten)      optimizations 
* (Matten-Matten)      auto Check HDD (max.2 HDD)
* (Matten-Matten)      add manually updating Enigma2 states
* (Matten-Matten)      read the device information only at the adapter start
* (Matten-Matten)      fixed hard disk (HDD) update Time every 30 sec.

### 1.0.0 (2018-10-23)
* (Matten-Matten)      add command.REMOTE-CONTROL
* (Matten-Matten)      Message optimized
* (Matten-Matten)      Command-Button integrated (no extra script needed!)


### 0.4.3 (2018-10-21)
* (Matten-Matten)      Nicht bestätigte Werte und zustände (rot angezeigt) angepasst
* (Matten-Matten)      Message um ein Objekt erweitert "ANSWER_IS"
* (Matten-Matten)      Button BUTTON SCRIPT auf V3.4 angepasst
                       

### 0.4.2 (2018-10-05)
* (Matten-Matten)      Button Probleme bei Dreamwebif angepasst
* (Matten-Matten)      Button BUTTON SCRIPT auf V3.1 angepasst


### 0.4.1 (2018-09-21)
* (Matten-Matten)      Button werden gelöscht wenn in der Config "BUTTON SCRIPT" deaktiviert wird
* (Matten-Matten)      Alexa (Mute,Standby)


### 0.3.3 (2018-09-20)
* (Matten-Matten)      Message senden hinzugefügt
* (Matten-Matten)      Message answer (true/false) hinzugefügt
* (Matten-Matten)      Message.Question_Activ hinzugefügt


### 0.3.0 (2018-08-19)
* (Matten-Matten)      enigma2-CONNECTION hinzugefügt
* (Matten-Matten)      Update Configurationsmaske
* (Matten-Matten)      Update ENIGMA 2 BUTTON SCRIPT V2.0 (nur noch manuell die Adapter Instanz im Script festlegen)

### 0.2.3 (2018-08-17)
* (Matten-Matten)      Admin V3.51

### 0.2.2 (2018-05-12)
* (Matten-Matten)      Button hinzugefügt

### 0.2.1 (2018-03-22)
* (Matten-Matten)      Fehlerbehebung in der HDD Abfrage

### 0.2.0 (2018-03-22)
* (Matten-Matten)      keine Fehlermeldung mehr wenn Box in DeepStandby
* (Matten-Matten)      Erweiterung (PROGRAMM_AFTER ; PROGRAMM_AFTER_INFO ; WEB_IF_VERSION ; NETWORK) hinzugefügt

### 0.1.0 (2018-03-21)
* (Matten-Matten)      installierbar

### 0.0.11 (2018-03-19)
* (Matten-Matten)                  Adapterkonfigurationsmaske (für Admin3) überarbeitet
* (wendy2702 & Matten-Matten)      Admin3 

### 0.0.10 (2018-03-19)
* (Matten-Matten)  Umstellungsversuch Admin3

### 0.0.9 (2018-02-07)
* (Matten-Matten)  Kategorie geändert
* (Matten-Matten)  Abfrage Werte sind nur noch lesbar nicht mehr beschreibbar.

### 0.0.8 (2017-11-25)
* (Matten-Matten)  Fehlerbehebung in HDD Abfrage
* (Matten-Matten)  Fehlerbehebung wenn Box Heruntergefahren (nicht erreichbar)
                    jetzt nur noch mit: info	received error: connect ECONNREFUSED 192.168. ...
* (Matten-Matten)  Konfigurations-Maske vereinfacht 

### 0.0.7 (2017-09-20)
* (Matten-Matten) add Fehlerbehebung in der MUTED Abfrage

### 0.0.6 (2017-09-19)
* (Matten-Matten) add Erweiterung der Adapterkonfiguration

### 0.0.5 (2017-09-18)
* (Matten-Matten) add grafische Optimierung der Adapterkonfiguration


