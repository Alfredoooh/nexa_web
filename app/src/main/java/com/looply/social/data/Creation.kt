package com.looply.social.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "creations")
data class Creation(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val title: String,
    val thumbnailPath: String,
    val canvasStateJson: String,
    val canvasWidth: Int,
    val canvasHeight: Int,
    val createdAt: Long,
    val updatedAt: Long
)