package com.looply.social

import android.app.Application
import com.looply.social.data.AppDatabase

class LooplyApp : Application() {

    lateinit var database: AppDatabase
        private set

    override fun onCreate() {
        super.onCreate()
        database = AppDatabase.getInstance(this)
    }
}