package com.nutriscan.app

import android.os.Build
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Short vibrations: a light tick for small actions, a click for success, a double click for errors.
 * Drives the vibration motor directly: View.performHapticFeedback() was silently dropped on the
 * Galaxy A51 (no haptic engine). Follows the phone's "touch interactions" vibration setting, like
 * the system's own touch feedback.
 */
class HapticsModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "Haptics"

  @ReactMethod
  fun play(kind: String) {
    val context = reactApplicationContext
    if (Settings.System.getInt(context.contentResolver, Settings.System.HAPTIC_FEEDBACK_ENABLED, 1) == 0) return
    val vibrator =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) context.getSystemService(VibratorManager::class.java).defaultVibrator
      else context.getSystemService(Vibrator::class.java)
    if (vibrator == null || !vibrator.hasVibrator()) return
    // Predefined effects (Android 10+) fall back to a short buzz on phones without a haptic engine.
    val effect =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        VibrationEffect.createPredefined(
          when (kind) {
            "success" -> VibrationEffect.EFFECT_CLICK
            "error" -> VibrationEffect.EFFECT_DOUBLE_CLICK
            else -> VibrationEffect.EFFECT_TICK
          },
        )
      } else {
        VibrationEffect.createOneShot(if (kind == "error") 60 else 20, VibrationEffect.DEFAULT_AMPLITUDE)
      }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_TOUCH))
    } else {
      vibrator.vibrate(effect)
    }
  }
}
