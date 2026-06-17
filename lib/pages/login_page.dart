import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../main.dart';
import '../services/auth_api_service.dart';
import 'chat_page.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    final emailCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    return Scaffold(
      backgroundColor: const Color(0xFFF2F2F7),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image.asset('assets/icons/png/logo.png', width: 72),
              const SizedBox(height: 24),
              const Text('IPC', style: TextStyle(fontFamily: 'TimesNewRoman', fontSize: 32, fontWeight: FontWeight.bold)),
              const SizedBox(height: 40),
              TextField(
                controller: emailCtrl,
                decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: passCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () async {
                  final user = await AuthApiService.login(emailCtrl.text, passCtrl.text);
                  if (user != null) {
                    context.read<AuthState>().setUser(user);
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(builder: (_) => const ChatPage()),
                    );
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Erro ao iniciar sessão')),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: IPCApp.primary,
                  minimumSize: const Size(double.infinity, 48),
                ),
                child: const Text('Entrar', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}