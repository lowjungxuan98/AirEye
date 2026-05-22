package com.lowjx.grim.mobile

import android.content.Context
import android.media.AudioManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val cameraSoundChannel = "grim/camera_sound"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, cameraSoundChannel)
            .setMethodCallHandler { call, result ->
                val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
                when (call.method) {
                    "muteSystemSound" -> {
                        audioManager.adjustStreamVolume(
                            AudioManager.STREAM_SYSTEM,
                            AudioManager.ADJUST_MUTE,
                            0
                        )
                        result.success(null)
                    }
                    "unmuteSystemSound" -> {
                        audioManager.adjustStreamVolume(
                            AudioManager.STREAM_SYSTEM,
                            AudioManager.ADJUST_UNMUTE,
                            0
                        )
                        result.success(null)
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
