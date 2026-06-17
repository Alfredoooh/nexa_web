import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../models/chat_message.dart';
import '../widgets/thinking_skeleton.dart';
import '../widgets/native_widgets.dart';

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
        color: const Color(0xFF6F5AF6),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Text(
        message.content,
        style: const TextStyle(color: Colors.white, fontSize: 16, height: 1.4),
      ),
    );
  }

  Widget _buildAssistantBubble(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (message.thinkingContent.isNotEmpty || message.isThinking)
          GestureDetector(
            onTap: onThinkTap,
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 7, height: 7,
                    decoration: const BoxDecoration(
                      color: Color(0xFFFF3B30),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 7),
                  Text(
                    message.isThinking && message.isStreaming ? 'A pensar…' : 'Ver pensamento',
                    style: const TextStyle(fontSize: 12.5, color: Colors.grey),
                  ),
                ],
              ),
            ),
          ),
        if (message.isStreaming && message.isThinking)
          const ThinkingSkeleton(),
        if (!message.isStreaming || message.content.isNotEmpty)
          _buildMessageContent(context),
        if (message.isStreaming)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: SizedBox(
              width: 24, height: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        if (!message.isStreaming && message.content.isNotEmpty)
          _buildActionRow(),
      ],
    );
  }

  Widget _buildMessageContent(BuildContext context) {
    return NativeContentRenderer(content: message.content);
  }

  Widget _buildActionRow() {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          _actionButton('assets/icons/copy.svg', 'Copiar'),
          _actionButton('assets/icons/thumbs_up.svg', 'Like'),
          _actionButton('assets/icons/thumbs_down.svg', 'Dislike'),
          _actionButton('assets/icons/share.svg', 'Partilhar'),
          _actionButton('assets/icons/regenerate.svg', 'Regenerar'),
        ],
      ),
    );
  }

  Widget _actionButton(String icon, String action) {
    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: InkWell(
        onTap: () => onAction?.call(action),
        child: Container(
          width: 36, height: 36,
          alignment: Alignment.center,
          child: SvgPicture.asset(
            icon,
            width: 16, height: 16,
            colorFilter: ColorFilter.mode(Colors.grey[600]!, BlendMode.srcIn),
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
    final widgetRegExp = RegExp(
      r'<(widget_\w+)>(.*?)</\1>',
      dotAll: true,
    );

    final List<Widget> widgets = [];
    int lastEnd = 0;

    for (final match in widgetRegExp.allMatches(content)) {
      if (match.start > lastEnd) {
        final textBefore = content.substring(lastEnd, match.start);
        widgets.add(_buildMarkdownText(textBefore));
      }

      final widgetType = match.group(1)!;
      final jsonData = match.group(2)!;
      widgets.add(buildNativeWidget(widgetType, jsonData));

      lastEnd = match.end;
    }

    if (lastEnd < content.length) {
      widgets.add(_buildMarkdownText(content.substring(lastEnd)));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: widgets,
    );
  }

  Widget _buildMarkdownText(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Text.rich(
        _parseMarkdown(text),
        style: const TextStyle(fontSize: 16, height: 1.5),
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