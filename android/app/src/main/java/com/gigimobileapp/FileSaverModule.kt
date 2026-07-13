package com.gigimobileapp

import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream

class FileSaverModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "FileSaver"
    }

    @ReactMethod
    fun saveBase64Image(base64Str: String, filename: String, promise: Promise) {
        try {
            val decodedString = Base64.decode(base64Str, Base64.DEFAULT)
            val file = File(reactApplicationContext.cacheDir, filename)
            val fos = FileOutputStream(file)
            fos.write(decodedString)
            fos.close()
            promise.resolve("file://" + file.absolutePath)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
