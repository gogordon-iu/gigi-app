package com.gigimobileapp

import android.bluetooth.BluetoothDevice
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class PairingRequestReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d("PairingReceiver", "Received intent action: $action")
        
        if ("android.bluetooth.device.action.PAIRING_REQUEST" == action) {
            val device = intent.getParcelableExtra<BluetoothDevice>(BluetoothDevice.EXTRA_DEVICE)
            val pairingVariant = intent.getIntExtra("android.bluetooth.device.extra.PAIRING_VARIANT", -1)
            
            val deviceName = device?.name?.lowercase() ?: ""
            Log.d("PairingReceiver", "Incoming pairing request from device: $deviceName, address: ${device?.address}, variant: $pairingVariant")
            
            // Check if device matches target robot criteria
            if (deviceName.contains("gigi") || deviceName.contains("orangepi") || deviceName.contains("opi") || deviceName.contains("robot")) {
                try {
                    // Set secure PIN "198420"
                    val pin = "198420".toByteArray()
                    Log.d("PairingReceiver", "Setting PIN '198420' for auto-pairing...")
                    device?.setPin(pin)
                    
                    // Approve pairing confirmation (numeric comparison or passkey confirmation)
                    // Method setPairingConfirmation(boolean) is public since API level 19
                    device?.setPairingConfirmation(true)
                    
                    // Stop other apps/system from receiving this pairing broadcast to bypass the OS dialog
                    abortBroadcast()
                    Log.d("PairingReceiver", "Auto-paired successfully. Broadcast aborted.")
                } catch (e: Exception) {
                    Log.e("PairingReceiver", "Error in auto-pairing: ${e.message}", e)
                }
            }
        }
    }
}
