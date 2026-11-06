I will fix the connection issue by **inverting the connection logic**.

### The Problem
Currently, the APK acts as the *Server* (`Listening`) and waits for `scrcpy-server` to connect. If `scrcpy-server` starts too early, fails to connect once, or uses a slightly different socket name logic, the connection fails, leaving the APK stuck in "Listening".

### The Solution ("Out of the Box")
I will make the **APK act as the Client** and the **`scrcpy-server` act as the Server**.
1.  **`scrcpy-server`** (running as root) will start in default mode (Listening on `scrcpy`).
2.  **APK** will run a retry loop to actively **connect** to the `scrcpy` socket.
3.  This eliminates the race condition: The APK will simply keep knocking on the door until `scrcpy-server` answers.

### Plan Steps
1.  **Modify `ScrcpyBridge.kt`**:
    *   Remove `tunnel_forward=true` from the command (reverting to default Listening mode).
    *   Replace `listenVideo()` (Server logic) with `connectToVideoSocket()` (Client logic).
    *   Replace `listenSocket()` (Server logic) with `connectToControlSocket()` (Client logic).
    *   Implement a robust retry loop in the client logic to handle startup delays.

This ensures a reliable connection every time.