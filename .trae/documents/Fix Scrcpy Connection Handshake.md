I will fix the connection issue by ensuring the `scrcpy-server` process actively connects to the APK's listening socket.

### Fix Details
The APK is currently waiting for a connection (`LocalServerSocket.accept()`), but the `scrcpy-server` process isn't being told to connect to it. It likely defaults to "listening" mode, causing both sides to wait for each other.

To fix this, I will add the **`tunnel_forward=true`** argument to the startup command in `ScrcpyBridge.kt`. This instructs `scrcpy-server` to act as a client and connect to the socket named `scrcpy` that our APK has opened.

### File to Change
*   `Deamon_apk/app/src/main/java/com/sam/deamon_apk/ScrcpyBridge.kt`

### Steps
1.  Locate the command string builder in `start()`.
2.  Append `tunnel_forward=true` to the list of arguments.