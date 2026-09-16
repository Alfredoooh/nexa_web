package com.exemplo.myapp

import android.app.Application

class MyApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        // Inicializações globais da app entram aqui
    }
}
