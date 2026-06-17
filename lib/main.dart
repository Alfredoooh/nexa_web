import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'models/user.dart';
import 'pages/login_page.dart';
import 'pages/chat_page.dart';

class AuthState extends ChangeNotifier {
  AuthUser? _user;
  AuthUser? get user => _user;

  Future<void> loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    if (token != null) {
      final name = prefs.getString('auth_user_name') ?? '';
      final email = prefs.getString('auth_user_email') ?? '';
      final id = prefs.getString('auth_user_id') ?? '';
      _user = AuthUser(id: id, name: name, email: email, token: token);
      notifyListeners();
    }
  }

  void setUser(AuthUser user) async {
    _user = user;
    final prefs = await SharedPreferences.getInstance();
    prefs.setString('auth_token', user.token);
    prefs.setString('auth_user_name', user.name);
    prefs.setString('auth_user_email', user.email);
    prefs.setString('auth_user_id', user.id);
    notifyListeners();
  }

  void clear() async {
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    notifyListeners();
  }
}

class IPCApp extends StatelessWidget {
  const IPCApp({super.key});

  static const Color primary = Color(0xFF2F7BF6);

  static const Map<String, Color> lightColors = {
    'background': Color(0xFFFFFFFF),
    'appbarSolid': Color(0xFFFFFFFF),
    'bottomBarSolid': Color(0xFFFFFFFF),
    'textPrimary': Color(0xFF000000),
    'textSecondary': Color(0xFF888888),
    'textHint': Color(0xFFAAAAAA),
    'drawerBackground': Color(0xFFF2F2F7),
    'drawerText': Color(0xFF000000),
    'cardBackground': Color(0xFFF2F2F7),
    'dialogBackground': Color(0xFFF2F2F7),
    'divider': Color(0xFFE5E5EA),
    'iconTint': Color(0xFF000000),
    'iconTintSecondary': Color(0xFF888888),
    'sendBtnColor': Color(0xFF2F7BF6),
    'sendIconColor': Color(0xFFFFFFFF),
    'addCircleBg': Color(0xFFE8E8E8),
    'tabPreviewPillBg': Color(0xFFE0EBFE),
    'extrasCardActive': Color(0xFFEEF2FF),
    'extrasCardActiveText': Color(0xFF2F7BF6),
    'settings_section_label': Color(0xFF888888),
  };

  static const Map<String, Color> darkColors = {
    'background': Color(0xFF121212),
    'appbarSolid': Color(0xFF121212),
    'bottomBarSolid': Color(0xFF1F1F1F),
    'textPrimary': Color(0xFFF2F2F2),
    'textSecondary': Color(0xFF939393),
    'textHint': Color(0xFF6E6E6E),
    'drawerBackground': Color(0xFF1F1F1F),
    'drawerText': Color(0xFFF2F2F2),
    'cardBackground': Color(0xFF1F1F1F),
    'dialogBackground': Color(0xFF1F1F1F),
    'divider': Color(0xFF2A2A2A),
    'iconTint': Color(0xFFF2F2F2),
    'iconTintSecondary': Color(0xFF939393),
    'sendBtnColor': Color(0xFF2F7BF6),
    'sendIconColor': Color(0xFFFFFFFF),
    'addCircleBg': Color(0xFF2C2C2E),
    'tabPreviewPillBg': Color(0xFF1F2D4A),
    'extrasCardActive': Color(0xFF1E2D4F),
    'extrasCardActiveText': Color(0xFFA8C8FA),
    'settings_section_label': Color(0xFF939393),
  };

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'IPC',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.light,
        primaryColor: primary,
        scaffoldBackgroundColor: lightColors['background'],
        fontFamily: 'TimesNewRoman',
        colorScheme: ColorScheme.fromSeed(
          seedColor: primary,
          brightness: Brightness.light,
          surface: lightColors['cardBackground'],
          onSurface: lightColors['textPrimary'],
        ),
      ),
      darkTheme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: primary,
        scaffoldBackgroundColor: darkColors['background'],
        fontFamily: 'TimesNewRoman',
        colorScheme: ColorScheme.fromSeed(
          seedColor: primary,
          brightness: Brightness.dark,
          surface: darkColors['cardBackground'],
          onSurface: darkColors['textPrimary'],
        ),
      ),
      home: const ChatPage(),
    );
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final authState = AuthState();
  await authState.loadUser();
  runApp(
    ChangeNotifierProvider.value(
      value: authState,
      child: const IPCApp(),
    ),
  );
}