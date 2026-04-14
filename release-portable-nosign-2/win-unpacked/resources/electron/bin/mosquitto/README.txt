Place Mosquitto here if you want to bundle it with the Electron application.

Expected file:

  mosquitto.exe

Optional files:

  mosquitto_passwd.exe
  *.dll files required by mosquitto.exe

Electron startup search order:

1. MOSQUITTO_PATH environment variable
2. electron/bin/mosquitto/mosquitto.exe
3. C:\Program Files\mosquitto\mosquitto.exe
4. C:\Program Files (x86)\mosquitto\mosquitto.exe

If Mosquitto is not found:

- the application still starts
- MQTT local broker auto-start is skipped
- a warning dialog explains how to configure it
