package com.exemplo.myapp

import android.os.Bundle
import com.exemplo.myapp.base.BaseActivity
import com.exemplo.myapp.databinding.ActivityMainBinding

class MainActivity : BaseActivity() {

    private lateinit var binding: ActivityMainBinding

    private val greetings = listOf(
        "Olá!",
        "Bem-vindo!",
        "Tudo bem?",
        "Que bom ter-te aqui!",
        "Vamos construir algo incrível!"
    )
    private var currentGreetingIndex = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.textGreeting.text = greetings[currentGreetingIndex]

        binding.buttonChangeGreeting.setOnClickListener {
            currentGreetingIndex = (currentGreetingIndex + 1) % greetings.size
            binding.textGreeting.text = greetings[currentGreetingIndex]
        }
    }
}
