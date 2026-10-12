package com.nutriscan.app

import android.app.TimePickerDialog
import android.text.format.DateFormat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

/**
 * Android's own clock picker, for the meal reminder times. pick() resolves { hour, minute }, or null
 * when the user cancels. It shows 12- or 24-hour time, as the phone is set.
 */
class TimePickerModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "TimePicker"

  @ReactMethod
  fun pick(hour: Double, minute: Double, promise: Promise) {
    val activity = reactApplicationContext.currentActivity ?: return promise.resolve(null)
    UiThreadUtil.runOnUiThread {
      var picked = false
      val dialog = TimePickerDialog(
        activity,
        { _, h, m ->
          picked = true
          promise.resolve(Arguments.createMap().apply {
            putInt("hour", h)
            putInt("minute", m)
          })
        },
        hour.toInt(),
        minute.toInt(),
        DateFormat.is24HourFormat(activity),
      )
      // OK calls the listener above, then closes the dialog; Cancel, Back or a tap outside only close it.
      dialog.setOnDismissListener { if (!picked) promise.resolve(null) }
      dialog.show()
    }
  }
}
