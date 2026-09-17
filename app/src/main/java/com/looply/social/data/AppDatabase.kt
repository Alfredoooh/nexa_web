package com.looply.social.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [Creation::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {

    abstract fun creationDao(): CreationDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "looply.db"
                ).build().also { INSTANCE = it }
            }
        }
    }
}