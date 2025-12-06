package com.sam.deamon_apk

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import java.util.concurrent.TimeUnit
import org.json.JSONObject

class WebSocketService : Service() {
    private val endpoint = "ws://100.112.8.35:22533/ws"
    private val client = OkHttpClient.Builder().readTimeout(0, TimeUnit.MILLISECONDS).build()
    private var ws: WebSocket? = null
    private var bridge: ScrcpyBridge? = null
    private val scope = CoroutineScope(Dispatchers.IO)
    private var reconnectJob: Job? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(1, notification("Starting"))
        ensureBridge()
        bridge?.startListeners()
        connect()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> scope.launch { ensureBridge(); bridge?.start(4000000, 480, 40) }
            ACTION_STOP -> scope.launch { bridge?.stop() }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        ws?.close(1000, null)
        ws = null
        scope.launch {
            bridge?.stop()
        }
    }

    private fun connect() {
        val request = Request.Builder().url(endpoint).build()
        ws = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: okhttp3.Response) {
                StatusRepository.setWebSocketStatus("connected")
                val id = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"
                val hello = "{\"type\":\"device\",\"id\":\"$id\"}"
                webSocket.send(hello)
                StatusRepository.setDeviceId(id)
                ensureBridge()
                bridge?.startListeners()
                updateNotification("Connected")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val obj = JSONObject(text)
                    when (obj.optString("cmd")) {
                        "start" -> {
                            val bitrateVal = if (obj.has("bitrate")) obj.optInt("bitrate") else null
                            val maxSizeVal = if (obj.has("maxSize")) obj.optInt("maxSize") else null
                            val maxFpsVal = if (obj.has("maxFps")) obj.optInt("maxFps") else null
                            scope.launch { bridge?.start(bitrateVal, maxSizeVal, maxFpsVal) }
                        }
                        "stop" -> scope.launch { bridge?.stop() }
                        else -> {
                            when (obj.optString("type")) {
                                "touch" -> {
                                    val x = obj.optDouble("x", Double.NaN)
                                    val y = obj.optDouble("y", Double.NaN)
                                    if (!x.isNaN() && !y.isNaN()) scope.launch { runShell("input tap ${(x*1080).toInt()} ${(y*1920).toInt()}") }
                                }
                                "key" -> {
                                    val key = obj.optString("key", "")
                                    val map = mapOf("Enter" to 66, "Backspace" to 67, "Escape" to 111)
                                    val code = map[key] ?: 66
                                    scope.launch { runShell("input keyevent $code") }
                                }
                            }
                        }
                    }
                } catch (_: Exception) {}
            }

            override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                bridge?.sendControl(bytes.toByteArray())
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                StatusRepository.setWebSocketStatus("disconnected")
                StatusRepository.incReconnect()
                scheduleReconnect()
                updateNotification("Disconnected")
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: okhttp3.Response?) {
                StatusRepository.setWebSocketStatus("error")
                StatusRepository.setLastError(t.message ?: "")
                StatusRepository.incReconnect()
                scheduleReconnect()
                updateNotification("Error: ${t.message}")
            }
        })
    }

    private fun runShell(cmd: String) {
        try { ProcessBuilder("su","-c", cmd).start() } catch (_: Exception) {}
    }

    private fun ensureBridge() {
        if (bridge == null) bridge = ScrcpyBridge({ bytes -> ws?.send(bytes) ?: Unit }, { text -> ws?.send(text) ?: Unit })
    }

    private fun scheduleReconnect() {
        if (reconnectJob?.isActive == true) return
        reconnectJob = scope.launch {
            try { Thread.sleep(3000) } catch (_: Exception) {}
            connect()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel("daemon", "Daemon", NotificationManager.IMPORTANCE_LOW)
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    private fun notification(text: String): Notification {
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, "daemon")
        } else {
            Notification.Builder(this)
        }
        return builder.setContentTitle("Remote Control")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
            .build()
    }

    private fun updateNotification(text: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(1, notification(text))
    }

    companion object {
        const val ACTION_START = "com.sam.deamon_apk.START"
        const val ACTION_STOP = "com.sam.deamon_apk.STOP"
        fun start(context: Context) {
            context.startForegroundService(Intent(context, WebSocketService::class.java))
        }
        fun startScrcpy(context: Context) {
            val i = Intent(context, WebSocketService::class.java).apply { action = ACTION_START }
            context.startForegroundService(i)
        }
        fun stopScrcpy(context: Context) {
            val i = Intent(context, WebSocketService::class.java).apply { action = ACTION_STOP }
            context.startService(i)
        }
    }
}

