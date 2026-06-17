import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/chat_message.dart';

sealed class StreamChunk {}
class ThinkToken extends StreamChunk { final String text; ThinkToken(this.text); }
class Token extends StreamChunk { final String text; Token(this.text); }
class Done extends StreamChunk { final String fullText; Done(this.fullText); }
class StreamError extends StreamChunk { final String message; StreamError(this.message); }

class GeminiApiService {
  static const String baseUrl = 'https://ipc.alfredopjonas.workers.dev';

  static String buildSystemPrompt(String lang, bool sheetsEnabled) {
    final tick = '```';
    final base = (lang == 'en')
        ? "You are a helpful AI assistant integrated in the IPC app. Always respond in English. Be concise and direct. When the user asks for a table, use markdown table format. When providing code, always wrap it in fenced code blocks with the language identifier."
        : "És um assistente de IA integrado na app IPC. Responde sempre em português europeu. Sê conciso e direto. Quando o utilizador pedir uma tabela, usa formato de tabela markdown. Quando deres código, coloca-o sempre em blocos com o identificador de linguagem.";

    final sheets = sheetsEnabled
        ? ((lang == 'en')
            ? """

When the user asks for a bar chart, respond with a JSON block tagged as widget_bar like this:
$tick widget_bar
{"title":"Chart Title","items":[{"label":"Jan","value":35},{"label":"Feb","value":60}]}
$tick
When the user asks for a pie chart, respond with a JSON block tagged as widget_pie like this:
$tick widget_pie
{"title":"Chart Title","slices":[{"label":"A","value":40},{"label":"B","value":30}]}
$tick
When the user asks for a data table, respond with a JSON block tagged as widget_table like this:
$tick widget_table
{"headers":["Col1","Col2"],"rows":[["A","B"],["C","D"]]}
$tick
When the user asks for mathematical workings, respond with a JSON block tagged as widget_sheet like this:
$tick widget_sheet
{"lines":[{"text":"Resolution","title":true},{"text":"Step 1: x = 5"},{"text":"Step 2: y = 10"}]}
$tick
Always place explanatory text outside the JSON block. Only the structured data goes inside."""
            : """

Quando o utilizador pedir um gráfico de barras, responde com um bloco JSON com a tag widget_bar assim:
$tick widget_bar
{"title":"Título do Gráfico","items":[{"label":"Jan","value":35},{"label":"Fev","value":60}]}
$tick
Quando o utilizador pedir um gráfico de pizza, responde com um bloco JSON com a tag widget_pie assim:
$tick widget_pie
{"title":"Título do Gráfico","slices":[{"label":"A","value":40},{"label":"B","value":30}]}
$tick
Quando o utilizador pedir uma tabela de dados, responde com um bloco JSON com a tag widget_table assim:
$tick widget_table
{"headers":["Col1","Col2"],"rows":[["A","B"],["C","D"]]}
$tick
Quando o utilizador pedir resolução matemática, responde com um bloco JSON com a tag widget_sheet assim:
$tick widget_sheet
{"lines":[{"text":"Resolução","title":true},{"text":"Passo 1: x = 5"},{"text":"Passo 2: y = 10"}]}
$tick
Coloca sempre o texto explicativo fora do bloco JSON. Só os dados estruturados vão dentro.""")
        : "";

    return base + sheets;
  }

  static Stream<StreamChunk> streamChat({
    required List<ChatMessage> messages,
    required String systemPrompt,
    required String token,
    required bool think,
  }) async* {
    final client = http.Client();
    try {
      final request = http.Request('POST', Uri.parse('$baseUrl/ai/chat'))
        ..headers.addAll({
          'Authorization': 'Bearer $token',
          'Accept': 'text/event-stream',
          'Content-Type': 'application/json',
        })
        ..body = jsonEncode({
          'messages': messages.map((m) => {'role': m.role, 'content': m.content}).toList(),
          'stream': true,
          'systemPrompt': systemPrompt,
          'language': systemPrompt.contains('English') ? 'en' : 'pt',
          'think': think,
        });

      final response = await client.send(request);
      if (response.statusCode != 200) {
        yield StreamError('Erro ${response.statusCode}');
        return;
      }

      final lines = response.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter());

      final buffer = StringBuffer();
      bool done = false;

      await for (final line in lines) {
        if (!line.startsWith('data: ')) continue;
        final data = line.substring(6).trim();
        if (data == '[DONE]') {
          if (!done) {
            done = true;
            yield Done(buffer.toString());
          }
          break;
        }
        try {
          final json = jsonDecode(data);
          final candidates = json['candidates'] as List<dynamic>?;
          if (candidates == null || candidates.isEmpty) continue;
          final candidate = candidates[0];
          final content = candidate['content'];
          final parts = content['parts'] as List<dynamic>? ?? [];
          for (final part in parts) {
            final text = part['text'] as String? ?? '';
            if (text.isEmpty) continue;
            if (part['thought'] == true) {
              yield ThinkToken(text);
            } else {
              buffer.write(text);
              yield Token(text);
            }
          }
          final finishReason = candidate['finishReason'] as String?;
          if ((finishReason == 'STOP' || finishReason == 'MAX_TOKENS') && !done) {
            done = true;
            yield Done(buffer.toString());
          }
        } catch (_) {}
      }
      if (!done) yield Done(buffer.toString());
    } catch (e) {
      yield StreamError('Erro de rede: $e');
    } finally {
      client.close();
    }
  }

  static Future<String> generateTitle(String firstUserMessage, String token, {String language = 'pt'}) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/ai/title'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'message': firstUserMessage,
          'language': language,
        }),
      );
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        return json['title'] ?? firstUserMessage.trim().split(RegExp(r'\s+')).take(4).join(' ').substring(0, 40);
      }
    } catch (_) {}
    return firstUserMessage.trim().split(RegExp(r'\s+')).take(4).join(' ').substring(0, 40);
  }
}