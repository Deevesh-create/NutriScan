package com.nutriscan.app

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * The phone's hardware step counter (Sensor.TYPE_STEP_COUNTER): the number of steps since the
 * phone was switched on. read() listens just long enough for one reading, then stops, so the
 * sensor is never left running. Resolves null when the phone has no step counter or it stays quiet.
 * Needs the ACTIVITY_RECOGNITION permission (asked for in src/lib/steps.ts).
 */
class StepCounterModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "StepCounter"

  @ReactMethod
  fun read(promise: Promise) {
    val sensors = reactApplicationContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    val counter = sensors.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) ?: return promise.resolve(null)
    val handler = Handler(Looper.getMainLooper())
    var done = false

    val listener = object : SensorEventListener {
      override fun onSensorChanged(event: SensorEvent) = finish(event.values[0].toDouble())
      override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

      fun finish(steps: Double?) {
        if (done) return
        done = true
        sensors.unregisterListener(this)
        promise.resolve(steps)
      }
    }
    sensors.registerListener(listener, counter, SensorManager.SENSOR_DELAY_NORMAL, handler)
    handler.postDelayed({ listener.finish(null) }, 3000)
  }
}
