import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/user.dart';
import '../models/chat_message.dart';

class AuthApiService {
  static const String baseUrl = 'https://ipc.alfredopjonas.workers.dev';

  // ─── Auth ──────────────────────────────────────────────────────────────────

  static Future<AuthUser?> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        return AuthUser.fromJson(json);
      }
    } catch (_) {}
    return null;
  }

  static Future<AuthUser?> register(String name, String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'name': name, 'email': email, 'password': password}),
      );
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        return AuthUser.fromJson(json);
      }
    } catch (_) {}
    return null;
  }

  static Future<bool> logout(String token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/logout'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // ─── Conversas ────────────────────────────────────────────────────────────

  static Future<List<Conversation>> listConversations(String token, {bool archived = false}) async {
    try {
      final uri = Uri.parse('$baseUrl/conversations${archived ? "?archived=true" : ""}');
      final response = await http.get(
        uri,
        headers: {'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final list = json['conversations'] as List<dynamic>;
        return list.map((e) => Conversation.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  static Future<String?> createConversation(String token, String title, List<ChatMessage> messages) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/conversations'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'title': title,
          'messages': messages.map((m) => {'role': m.role, 'content': m.content}).toList(),
        }),
      );
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        return json['id'];
      }
    } catch (_) {}
    return null;
  }

  static Future<bool> updateConversation(String token, String id, String title, List<ChatMessage> messages) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/conversations/$id'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'title': title,
          'messages': messages.map((m) => {'role': m.role, 'content': m.content}).toList(),
        }),
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> deleteConversation(String token, String id) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/conversations/$id'),
        headers: {'Authorization': 'Bearer $token'},
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> deleteAllConversations(String token) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/conversations/all'),
        headers: {'Authorization': 'Bearer $token'},
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> pinConversation(String token, String id, bool pinned) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/conversations/$id/pin'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'pinned': pinned}),
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> archiveConversation(String token, String id, bool archived) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/conversations/$id/archive'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'archived': archived}),
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static Future<List<Conversation>> searchConversations(String token, String query) async {
    try {
      final encoded = Uri.encodeComponent(query);
      final response = await http.get(
        Uri.parse('$baseUrl/conversations/search?q=$encoded'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final list = json['conversations'] as List<dynamic>;
        return list.map((e) => Conversation.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  static Future<String?> summarizeConversation(String token, List<ChatMessage> messages, {String language = 'pt'}) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/ai/summarize'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'messages': messages.map((m) => {'role': m.role, 'content': m.content}).toList(),
          'language': language,
        }),
      );
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        return json['summary'];
      }
    } catch (_) {}
    return null;
  }
}