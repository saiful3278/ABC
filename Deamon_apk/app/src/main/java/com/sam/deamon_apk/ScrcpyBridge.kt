package com.sam.deamon_apk

import android.net.LocalServerSocket
import android.net.LocalSocket
import android.net.LocalSocketAddress
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import okio.ByteString
import java.io.InputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

class ScrcpyBridge(
    private val sendToBackend: (ByteString) -> Unit,
    private val sendText: (String) -> Unit
) {
    private var process: Process? = null
    private var videoJob: Job? = null
    private var controlJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO)
    private var sps: ByteArray? = null
    private var pps: ByteArray? = null
    private var videoServer: LocalServerSocket? = null
    private var controlServer: LocalServerSocket? = null
    private var listenersStarted: Boolean = false

    fun start(bitrate: Int?, maxSize: Int?, maxFps: Int?) {
        if (process != null) return
        StatusRepository.setScrcpyStatus("starting")
        val cmd = buildString {
            append("cp /sdcard/Documents/scrcpy-server-v3.3.3 /data/local/tmp/ && chmod 755 /data/local/tmp/scrcpy-server-v3.3.3 && CLASSPATH=/data/local/tmp/scrcpy-server-v3.3.3 /system/bin/app_process64 / com.genymobile.scrcpy.Server 3.3.3")
            if (bitrate != null) {
                append(" video_bit_rate=")
                append(bitrate)
            }
            if (maxSize != null) {
                append(" max_size=")
                append(maxSize)
            }
            if (maxFps != null) {
                append(" max_fps=")
                append(maxFps)
            }
            append(" raw_stream=true send_device_meta=false send_frame_meta=false send_dummy_byte=false send_codec_meta=false scid=00000000 audio=false")
        }
        sendText("{\"type\":\"status\",\"source\":\"apk\",\"level\":\"info\",\"msg\":\"CMD: " + cmd.replace("\"","\\\"") + "\"}")
        StatusRepository.setLastCommand(cmd)
        startListeners()
        process = ProcessBuilder("su", "-c", cmd).redirectErrorStream(true).start()
        scope.launch {
            try {
                val ins = process!!.inputStream
                val buf = ByteArray(4096)
                while (scope.isActive) {
                    val n = ins.read(buf)
                    if (n <= 0) break
                    val s = String(buf, 0, n)
                    sendText("{\"type\":\"status\",\"source\":\"apk\",\"level\":\"info\",\"msg\":\"" + s.replace("\n","\\n").replace("\"","\\\"") + "\"}")
                    StatusRepository.appendOutput(s)
                }
            } catch (_: Exception) {}
        }
        StatusRepository.setScrcpyStatus("running")
    }

    fun startListeners() {
        if (listenersStarted) return
        StatusRepository.setListenerVideoStatus("connecting")
        StatusRepository.setListenerControlStatus("connecting")
        videoJob = scope.launch { connectVideo() }
        controlJob = scope.launch { connectSocket("scrcpy-control", 1) }
        listenersStarted = true
    }

    suspend fun stop() {
        StatusRepository.setScrcpyStatus("stopping")
        try { process?.destroy() } catch (_: Exception) {}
        process = null
        StatusRepository.setScrcpyStatus("stopped")
    }

    fun sendControl(bytes: ByteArray) {
        val envelope = envelope(1, bytes)
        sendToBackend(ByteString.of(*envelope))
    }

    private fun envelope(channel: Int, payload: ByteArray): ByteArray {
        val buf = ByteBuffer.allocate(1 + 4 + payload.size)
        buf.order(ByteOrder.BIG_ENDIAN)
        buf.put(channel.toByte())
        buf.putInt(payload.size)
        buf.put(payload)
        return buf.array()
    }

    private fun connectSocket(name: String, channel: Int) {
        try {
            while (scope.isActive) {
                var client: LocalSocket? = null
                try {
                    client = LocalSocket()
                    client.connect(LocalSocketAddress(name))
                    StatusRepository.setListenerControlStatus("connected")
                    val input: InputStream = client.inputStream
                    val buffer = ByteArray(64 * 1024)
                    while (scope.isActive) {
                        val read = input.read(buffer)
                        if (read <= 0) break
                        val payload = buffer.copyOf(read)
                        val data = envelope(channel, payload)
                        sendToBackend(ByteString.of(*data))
                        if (channel == 0) StatusRepository.addVideo(read) else StatusRepository.addControl(read)
                    }
                } catch (e: Exception) {
                     sendText("{\"type\":\"status\",\"source\":\"apk\",\"level\":\"error\",\"msg\":\"Control Connect: " + e.message + "\"}")
                     Thread.sleep(1000) // Retry delay
                } finally {
                    try { client?.close() } catch (_: Exception) {}
                    StatusRepository.setListenerControlStatus("connecting")
                }
            }
        } catch (_: Exception) {
            StatusRepository.setListenerControlStatus("error")
        }
    }

    private fun connectVideo() {
        try {
            while (scope.isActive) {
                var client: LocalSocket? = null
                try {
                    client = LocalSocket()
                    client.connect(LocalSocketAddress("scrcpy_00000000"))
                    StatusRepository.setListenerVideoStatus("connected")
                    sendText("{\"type\":\"status\",\"source\":\"apk\",\"level\":\"info\",\"msg\":\"Video socket connected\"}")
                    val ins = client.inputStream
                    val readBuf = ByteArray(64 * 1024)
                    var stash = ByteArray(0)
                    StatusRepository.setScrcpyStatus("running")
                    var totalRead = 0L
                    while (scope.isActive) {
                        val n = ins.read(readBuf)
                        if (n <= 0) break
                        totalRead += n
                        if (totalRead % (1024 * 1024) < n) {
                             sendText("{\"type\":\"status\",\"source\":\"apk\",\"level\":\"debug\",\"msg\":\"Video read " + n + " bytes, total " + totalRead + "\"}")
                        }
                        stash = concat(stash, readBuf.copyOf(n))
                        var idx = findStartCode(stash, 0)
                        while (idx >= 0) {
                            val next = findStartCode(stash, idx + 4)
                            val nal = if (next >= 0) stash.copyOfRange(idx + 4, next) else break
                            processNal(nal)
                            stash = if (next >= 0) stash.copyOfRange(next, stash.size) else ByteArray(0)
                            idx = findStartCode(stash, 0)
                        }
                        if (findStartCode(stash, 0) < 0) {
                            var pos = 0
                            while (pos + 4 <= stash.size) {
                                val len = ((stash[pos].toInt() and 0xFF) shl 24) or ((stash[pos+1].toInt() and 0xFF) shl 16) or ((stash[pos+2].toInt() and 0xFF) shl 8) or (stash[pos+3].toInt() and 0xFF)
                                if (len <= 0 || pos + 4 + len > stash.size) break
                                val nal = stash.copyOfRange(pos + 4, pos + 4 + len)
                                processNal(nal)
                                pos += 4 + len
                            }
                            stash = if (pos < stash.size) stash.copyOfRange(pos, stash.size) else ByteArray(0)
                        }
                    }
                } catch (e: Exception) {
                    sendText("{\"type\":\"status\",\"source\":\"apk\",\"level\":\"error\",\"msg\":\"Video Connect: " + e.message + "\"}")
                    StatusRepository.appendOutput("\nConnect Error: " + e.message)
                    Thread.sleep(1000) // Retry delay
                } finally {
                    try { client?.close() } catch (_: Exception) {}
                    StatusRepository.setListenerVideoStatus("connecting")
                }
            }
        } catch (_: Exception) {
            sendText("{\"type\":\"status\",\"source\":\"apk\",\"level\":\"error\",\"msg\":\"video client failed\"}")
            StatusRepository.setListenerVideoStatus("error")
        }
    }

    private fun processNal(nal: ByteArray) {
        if (nal.isEmpty()) return
        val type = nal[0].toInt() and 0x1F
        when (type) {
            7 -> {
                sps = nal
                sendText("{\"type\":\"status\",\"source\":\"apk\",\"level\":\"info\",\"msg\":\"Got SPS size " + nal.size + "\"}")
            }
            8 -> {
                pps = nal
                sendText("{\"type\":\"status\",\"source\":\"apk\",\"level\":\"info\",\"msg\":\"Got PPS size " + nal.size + "\"}")
            }
            5 -> {
                sendText("{\"type\":\"status\",\"source\":\"apk\",\"level\":\"info\",\"msg\":\"Got IDR size " + nal.size + "\"}")
                val parts = mutableListOf<ByteArray>()
                if (sps != null) { parts.add(startCode()); parts.add(sps!!) }
                if (pps != null) { parts.add(startCode()); parts.add(pps!!) }
                parts.add(startCode()); parts.add(nal)
                val pkt = concatMultiple(*parts.toTypedArray())
                val data = envelope(0, pkt)
                sendToBackend(ByteString.of(*data))
                StatusRepository.addVideo(pkt.size)
            }
            else -> {
                val pkt = concat(startCode(), nal)
                val data = envelope(0, pkt)
                sendToBackend(ByteString.of(*data))
                StatusRepository.addVideo(pkt.size)
            }
        }
    }

    private fun startCode(): ByteArray = byteArrayOf(0,0,0,1)
    private fun findStartCode(buf: ByteArray, from: Int): Int {
        var i = from
        while (i + 3 < buf.size) {
            if (buf[i]==0.toByte() && buf[i+1]==0.toByte() && buf[i+2]==0.toByte() && buf[i+3]==1.toByte()) return i
            i++
        }
        return -1
    }
    private fun concat(a: ByteArray, b: ByteArray): ByteArray {
        val out = ByteArray(a.size + b.size)
        System.arraycopy(a,0,out,0,a.size)
        System.arraycopy(b,0,out,a.size,b.size)
        return out
    }
    private fun concatMultiple(vararg arrays: ByteArray): ByteArray {
        var total = 0
        for (arr in arrays) total += arr.size
        val out = ByteArray(total)
        var pos = 0
        for (arr in arrays) {
            System.arraycopy(arr,0,out,pos,arr.size)
            pos += arr.size
        }
        return out
    }
}

