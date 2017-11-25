![Logo](admin/enigma2.png)
ioBroker enigma2 Adapter
==============
Adapter für ioBroker um Informationen von einem enigma2 Receiver abzufragen.

### basierend auf dem adapter von vader722/ioBroker.vuplus


## Funktionen
- BOX_IP
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
- STANDBY
- VOLUME

## Version

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

## issues
* kein Senden von Befehlen aus dem Adapter heraus.
* keine Installation von Github möglich. (ZIP downloaden entpacken, den Ordner in "iobroker.enigma2" umbenennen und in "ioBroker\node_modules" einfügen)
