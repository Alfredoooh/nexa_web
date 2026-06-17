import 'chat_message.dart';

class AuthUser {
  final String id;
  final String name;
  final String email;
  final String token;
  final Map<String, String> preferences;

  AuthUser({
    required this.id,
    required this.name,
    required this.email,
    required this.token,
    this.preferences = const {},
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    final prefsObj = json['preferences'] as Map<String, dynamic>?;
    final prefs = prefsObj?.map((k, v) => MapEntry(k, v.toString())) ?? {};
    return AuthUser(
      id: json['id'],
      name: json['name'],
      email: json['email'],
      token: json['token'],
      preferences: prefs,
    );
  }
}

class Conversation {
  final String id;
  final String title;
  final List<ChatMessage> messages;
  final int updatedAt;
  final bool pinned;
  final bool archived;
  final List<String> tags;
  final String model;

  Conversation({
    required this.id,
    required this.title,
    required this.messages,
    required this.updatedAt,
    this.pinned = false,
    this.archived = false,
    this.tags = const [],
    this.model = 'gemini-2.5-flash',
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    final msgs = (json['messages'] as List<dynamic>?)
        ?.map((m) => ChatMessage(role: m['role'], content: m['content']))
        .toList() ?? [];
    final tags = (json['tags'] as List<dynamic>?)
        ?.map((t) => t.toString())
        .toList() ?? [];
    return Conversation(
      id: json['id'],
      title: json['title'],
      messages: msgs,
      updatedAt: json['updatedAt'],
      pinned: json['pinned'] ?? false,
      archived: json['archived'] ?? false,
      tags: tags,
      model: json['model'] ?? 'gemini-2.5-flash',
    );
  }
}