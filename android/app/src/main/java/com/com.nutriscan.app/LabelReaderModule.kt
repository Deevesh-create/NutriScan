package com.nutriscan.app

import android.graphics.BitmapFactory
import android.media.ExifInterface
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.File

/**
 * Reads the text in a photo with Google ML Kit, on the phone (no internet, nothing uploaded), then
 * deletes the photo. Used by the Scan label screen; src/lib/nutritionLabel.ts makes sense of the text.
 */
class LabelReaderModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val recognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }

  override fun getName() = "LabelReader"

  /** Resolves with every line of text found: { text, x, y, w, h }, in pixels of the upright photo. */
  @ReactMethod
  fun read(path: String, promise: Promise) {
    val image = try {
      // The camera saves photos unrotated with an EXIF rotation flag; ML Kit needs it to read upright text.
      val rotation = when (ExifInterface(path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90
        ExifInterface.ORIENTATION_ROTATE_180 -> 180
        ExifInterface.ORIENTATION_ROTATE_270 -> 270
        else -> 0
      }
      val bitmap = BitmapFactory.decodeFile(path) ?: throw IllegalArgumentException("Not an image")
      InputImage.fromBitmap(bitmap, rotation)
    } catch (e: Exception) {
      return promise.reject("label_read", e)
    } finally {
      File(path).delete() // the photo is only needed for this one read
    }

    recognizer.process(image)
      .addOnSuccessListener { text ->
        val lines = Arguments.createArray()
        for (block in text.textBlocks) for (line in block.lines) {
          val box = line.boundingBox ?: continue
          lines.pushMap(Arguments.createMap().apply {
            putString("text", line.text)
            putInt("x", box.left)
            putInt("y", box.top)
            putInt("w", box.width())
            putInt("h", box.height())
          })
        }
        promise.resolve(lines)
      }
      .addOnFailureListener { promise.reject("label_read", it) }
  }
}

/** The app's own native modules (registered in MainApplication.kt). */
class NutriScanPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(
      LabelReaderModule(reactContext),
      HapticsModule(reactContext),
      StepCounterModule(reactContext),
      TimePickerModule(reactContext),
    )

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
