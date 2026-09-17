package com.looply.social.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface CreationDao {

    @Query("SELECT * FROM creations ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<Creation>>

    @Query("SELECT * FROM creations WHERE id = :id")
    suspend fun getById(id: Long): Creation?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(creation: Creation): Long

    @Delete
    suspend fun delete(creation: Creation)

    @Query("SELECT COUNT(*) FROM creations")
    suspend fun count(): Int
}