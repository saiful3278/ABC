package com.sam.deamon_apk

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import com.sam.deamon_apk.ui.theme.Deamon_apkTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WebSocketService.start(this)
        enableEdgeToEdge()
        setContent {
            Deamon_apkTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    StatusPanel(modifier = Modifier.padding(innerPadding))
                }
            }
        }
    }
}

@Composable
fun StatusPanel(modifier: Modifier = Modifier) {
    val ws by StatusRepository.webSocketStatus.collectAsState(initial = "disconnected")
    val sc by StatusRepository.scrcpyStatus.collectAsState(initial = "stopped")
    val lVideo by StatusRepository.listenerVideoStatus.collectAsState(initial = "idle")
    val lControl by StatusRepository.listenerControlStatus.collectAsState(initial = "idle")
    val context = LocalContext.current
    val deviceId by StatusRepository.deviceId.collectAsState(initial = "")
    val lastError by StatusRepository.lastError.collectAsState(initial = "")
    val reconnects by StatusRepository.reconnects.collectAsState(initial = 0)
    val vPackets by StatusRepository.videoPackets.collectAsState(initial = 0)
    val vBytes by StatusRepository.videoBytes.collectAsState(initial = 0L)
    val cPackets by StatusRepository.controlPackets.collectAsState(initial = 0)
    val cBytes by StatusRepository.controlBytes.collectAsState(initial = 0L)
    val lastCmd by StatusRepository.lastCommand.collectAsState(initial = "")
    val scOutput by StatusRepository.scrcpyOutput.collectAsState(initial = "")

    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text(text = "Remote Control", fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))
        Text(text = "WebSocket: $ws")
        Text(text = "Scrcpy: $sc")
        Text(text = "Listener Video: $lVideo")
        Text(text = "Listener Control: $lControl")
        if (deviceId.isNotEmpty()) Text(text = "Device: $deviceId")
        if (reconnects > 0) Text(text = "Reconnects: $reconnects")
        Text(text = "Video: $vPackets pkts, ${vBytes}B")
        Text(text = "Control: $cPackets pkts, ${cBytes}B")
        if (lastError.isNotEmpty()) Text(text = "Last error: $lastError")
        Spacer(Modifier.height(16.dp))
        if (lastCmd.isNotEmpty()) Text(text = "CMD: $lastCmd", modifier = Modifier.padding(8.dp))
        if (scOutput.isNotEmpty()) Text(text = "OUT: $scOutput", modifier = Modifier.padding(8.dp))
        Spacer(Modifier.height(8.dp))
        Button(onClick = { WebSocketService.startScrcpy(context) }) { Text("Start scrcpy") }
        Spacer(Modifier.height(8.dp))
        Button(onClick = { WebSocketService.stopScrcpy(context) }) { Text("Stop scrcpy") }
    }
}

@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    Deamon_apkTheme {
        StatusPanel()
    }
}
