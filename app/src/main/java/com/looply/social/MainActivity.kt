package com.looply.social

import android.os.Bundle
import com.looply.social.base.BaseActivity
import com.looply.social.databinding.ActivityMainBinding

class MainActivity : BaseActivity() {

    private lateinit var binding: ActivityMainBinding

    private val greetings = listOf(
        "Olá!",
        "Bem-vindo ao Looply!",
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
