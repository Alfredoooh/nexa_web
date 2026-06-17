class GeminiApiService {
  static String buildSystemPrompt(String lang, bool sheets) {
    return "System prompt...";
  }

  // Simula stream de tokens
  static Stream<String> streamChat(
      List<dynamic> history, String prompt, String token, bool isThinking) async* {
    yield "Olá, isto é uma resposta simulada.";
    await Future.delayed(const Duration(seconds: 1));
    yield " com mais texto.";
  }
}