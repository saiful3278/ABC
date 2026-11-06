I will modify the `backend/views/viewer.ejs` file to disable the automatic start of the stream and add a manual "Start Stream" button.

The plan involves:
1.  **Frontend (`backend/views/viewer.ejs`)**:
    *   Add a "Start Stream" button to the UI controls.
    *   Remove the automatic `fetch('/device/:id/start', ...)` call that currently runs when the WebSocket connects.
    *   Attach that `fetch` call to the new "Start Stream" button's click event.

**Regarding the APK:**
No changes are needed in the APK (`Deamon_apk`). The APK is already designed to listen for the "start" command via WebSocket. By changing the frontend to send this command only when the button is clicked, the APK will naturally wait for the manual trigger.

**Regarding the Routes:**
I will keep the `POST /device/:id/start` route in `backend/server.js` as requested ("Keep one route for each device id page").

I will now proceed with editing `backend/views/viewer.ejs`.