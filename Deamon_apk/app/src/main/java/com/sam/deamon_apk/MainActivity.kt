package com.sam.deamon_apk

import android.app.Activity
import android.os.Bundle
import android.widget.Toast

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WebSocketService.start(this)
        Toast.makeText(this, "Daemon started in background", Toast.LENGTH_SHORT).show()
        finish()
    }
}
