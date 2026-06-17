import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../main.dart';
import '../models/chat_message.dart';
import 'thinking_skeleton.dart';
import 'native_widgets.dart';

class MessageBubble extends StatelessWidget {
  final DisplayMessage message;
  final VoidCallback? onThinkTap;
  final Function(String action)? onAction;

  const MessageBubble({
    super.key,
    required this.message,
    this.onThinkTap,
    this.onAction,
  });

  Map<String, Color> _colors(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? IPCApp.darkColors : IPCApp.lightColors;
  }

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == 'user';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Flexible(
            child: isUser ? _buildUserBubble(context) : _buildAssistantBubble(context),
          ),
        ],
      ),
    );
  }

  Widget _buildUserBubble(BuildContext context) {
    return Container(
      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
      margin: const EdgeInsets.only(left: 64),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
      decoration: BoxDecoration(
        color: IPCApp.primary, // Kotlin: R.color.colorPrimary (#2F7BF6), nunca #6F5AF6
        borderRadius: BorderRadius.circular(18),
      ),
      child: Text(
        message.content,
        style: const TextStyle(color: Colors.white, fontSize: 16, height: 1.4),
      ),
    );
  }

  Widget _buildAssistantBubble(BuildContext context) {
    final colors = _colors(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Kotlin: msg.thinkingContent.isNotEmpty() || (msg.isThinking && msg.isStreaming)
        if (message.thinkingContent.isNotEmpty || (message.isThinking && message.isStreaming))
          GestureDetector(
            onTap: onThinkTap,
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.fromLTRB(10, 7, 14, 7),
              decoration: BoxDecoration(
                color: colors['cardBackground'],
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 7, height: 7,
                    decoration: const BoxDecoration(
                      color: Color(0xFFFF3B30), // Kotlin: hardcoded, não depende do tema
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 7),
                  Text(
                    message.isThinking && message.isStreaming ? 'A pensar…' : 'Ver pensamento',
                    style: TextStyle(fontSize: 12.5, color: colors['textSecondary']),
                  ),
                ],
              ),
            ),
          ),

        // Replica exata do `when` do ChatFragment.kt (linhas 596-606)
        if (message.isStreaming && message.isThinking)
          const ThinkingSkeleton()
        else if (message.isStreaming && message.content.trim().isEmpty)
          const ChatLoader()
        else ...[
          _buildMessageContent(context),
          if (message.isStreaming)
            const ChatLoader()
          else if (message.content.isNotEmpty)
            _buildActionRow(colors),
        ],
      ],
    );
  }

  Widget _buildMessageContent(BuildContext context) {
    return NativeContentRenderer(content: message.content);
  }

  Widget _buildActionRow(Map<String, Color> colors) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 6, 4, 4),
      child: Row(
        children: [
          _actionButton('assets/icons/svg/copy.svg', 'Copiar', colors),
          _actionButton('assets/icons/svg/thumbs_up.svg', 'Like', colors),
          _actionButton('assets/icons/svg/thumbs_down.svg', 'Dislike', colors),
          _actionButton('assets/icons/svg/share.svg', 'Partilhar', colors),
          _actionButton('assets/icons/svg/regenerate.svg', 'Regenerar', colors),
        ],
      ),
    );
  }

  Widget _actionButton(String icon, String action, Map<String, Color> colors) {
    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: InkWell(
        onTap: () => onAction?.call(action),
        borderRadius: BorderRadius.circular(18),
        child: Container(
          width: 36, height: 36,
          alignment: Alignment.center,
          child: SvgPicture.asset(
            icon,
            width: 16, height: 16,
            // Kotlin: R.color.icon_tint_secondary (#888888 light / #939393 dark)
            colorFilter: ColorFilter.mode(colors['iconTintSecondary']!, BlendMode.srcIn),
          ),
        ),
      ),
    );
  }
}

class NativeContentRenderer extends StatelessWidget {
  final String content;
  const NativeContentRenderer({super.key, required this.content});

  @override
  Widget build(BuildContext context) {
    // O backend (Gemini, via system prompt em gemini_api_service.dart)
    // devolve os widgets como cercas de código markdown com a tag como
    // "linguagem", por exemplo:
    // ```widget_table
    // {"headers":[...],"rows":[...]}
    // ```
    // Nunca chegam como tags XML <widget_x>...</widget_x>, por isso o
    // regex tem de casar com as cercas reais. As três cercas (abertura,
    // newline, JSON, newline opcional, fecho) são todas tornadas
    // tolerantes a espaços porque o modelo às vezes varia o whitespace.
    final widgetRegExp = RegExp(
      r'```\s*(widget_\w+)\s*\n(.*?)\n?```',
      dotAll: true,
    );

    final List<Widget> widgets = [];
    int lastEnd = 0;

    for (final match in widgetRegExp.allMatches(content)) {
      if (match.start > lastEnd) {
        final textBefore = content.substring(lastEnd, match.start);
        if (textBefore.trim().isNotEmpty) {
          widgets.add(_buildMarkdownText(context, textBefore));
        }
      }

      final widgetType = match.group(1)!;
      final jsonData = match.group(2)!.trim();
      widgets.add(buildNativeWidget(widgetType, jsonData));

      lastEnd = match.end;
    }

    if (lastEnd < content.length) {
      final remaining = content.substring(lastEnd);
      if (remaining.trim().isNotEmpty) {
        widgets.add(_buildMarkdownText(context, remaining));
      }
    }

    if (widgets.isEmpty) {
      // Conteúdo sem nenhum bloco de widget: mantém o comportamento
      // original de mostrar tudo como markdown.
      widgets.add(_buildMarkdownText(context, content));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: widgets,
    );
  }

  Widget _buildMarkdownText(BuildContext context, String text) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? IPCApp.darkColors['textPrimary'] : IPCApp.lightColors['textPrimary'];
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Text.rich(
        _parseMarkdown(text),
        style: TextStyle(fontSize: 16, height: 1.5, color: textColor),
      ),
    );
  }

  TextSpan _parseMarkdown(String text) {
    final boldRegExp = RegExp(r'\*\*(.+?)\*\*');
    final italicRegExp = RegExp(r'\*(.+?)\*');

    final spans = <TextSpan>[];
    int lastEnd = 0;

    for (final match in boldRegExp.allMatches(text)) {
      if (match.start > lastEnd) {
        spans.add(TextSpan(text: text.substring(lastEnd, match.start)));
      }
      spans.add(TextSpan(
        text: match.group(1),
        style: const TextStyle(fontWeight: FontWeight.bold),
      ));
      lastEnd = match.end;
    }
    if (lastEnd < text.length) {
      final remaining = text.substring(lastEnd);
      for (final match in italicRegExp.allMatches(remaining)) {
        if (match.start > 0) {
          spans.add(TextSpan(text: remaining.substring(0, match.start)));
        }
        spans.add(TextSpan(
          text: match.group(1),
          style: const TextStyle(fontStyle: FontStyle.italic),
        ));
      }
      if (spans.isEmpty) {
        spans.add(TextSpan(text: remaining));
      }
    }

    return TextSpan(children: spans.isEmpty ? [TextSpan(text: text)] : spans);
  }
}