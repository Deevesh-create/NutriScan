package com.nutriscan.app

import android.os.Build
import android.view.HapticFeedbackConstants
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Short vibrations through Android's own haptic patterns: a light tick for small actions, a crisp
 * confirm for success, a sharp reject for errors. They follow the phone's "touch feedback" setting
 * and need no vibration permission.
 */
class HapticsModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "Haptics"

  @ReactMethod
  fun play(kind: String) {
    val view = reactApplicationContext.currentActivity?.window?.decorView ?: return
    val modern = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R // CONFIRM and REJECT need Android 11
    val pattern = when (kind) {
      "success" -> if (modern) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.VIRTUAL_KEY
      "error" -> if (modern) HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS
      else -> HapticFeedbackConstants.CLOCK_TICK
    }
    view.post { view.performHapticFeedback(pattern) }
  }
}
