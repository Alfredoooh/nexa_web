import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'pages/chat_page.dart';
import 'models/chat_message.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => ChatState(),
      child: const IPCApp(),
    ),
  );
}

class IPCApp extends StatelessWidget {
  const IPCApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'IPC',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6F5AF6), // cor primária
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF2F2F7), // fundo iOS
      ),
      home: const ChatPage(),
    );
  }
}