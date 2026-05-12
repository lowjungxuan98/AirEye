import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:xterm/xterm.dart';

import '../ssh/grim_ssh_client.dart';

class GrimTerminal extends StatefulWidget {
  const GrimTerminal({super.key, required this.client});

  final GrimSshClient client;

  @override
  State<GrimTerminal> createState() => _GrimTerminalState();
}

class _GrimTerminalState extends State<GrimTerminal> {
  late final Terminal _terminal;
  StreamSubscription<Uint8List>? _stdoutSub;

  static const _theme = TerminalTheme(
    cursor: Color(0xFFD2FF3A),
    selection: Color(0x33D2FF3A),
    foreground: Color(0xFFE8EEF2),
    background: Color(0xFF080A0C),
    black: Color(0xFF000000),
    red: Color(0xFFCD3131),
    green: Color(0xFF0DBC79),
    yellow: Color(0xFFE5E510),
    blue: Color(0xFF2472C8),
    magenta: Color(0xFFBC3FBC),
    cyan: Color(0xFF11A8CD),
    white: Color(0xFFE5E5E5),
    brightBlack: Color(0xFF666666),
    brightRed: Color(0xFFF14C4C),
    brightGreen: Color(0xFF23D18B),
    brightYellow: Color(0xFFF5F543),
    brightBlue: Color(0xFF3B8EEA),
    brightMagenta: Color(0xFFD670D6),
    brightCyan: Color(0xFF29B8DB),
    brightWhite: Color(0xFFFFFFFF),
    searchHitBackground: Color(0xFFFFFF2B),
    searchHitBackgroundCurrent: Color(0xFF31FF26),
    searchHitForeground: Color(0xFF000000),
  );

  @override
  void initState() {
    super.initState();

    _terminal = Terminal(
      onOutput: widget.client.write,
      onResize: (width, height, _, _) => widget.client.resize(width, height),
    );

    _stdoutSub = widget.client.stdout.listen(
      (bytes) => _terminal.write(utf8.decode(bytes)),
      onError: (_) {},
      cancelOnError: false,
    );
  }

  @override
  void dispose() {
    _stdoutSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TerminalView(_terminal, autofocus: true, theme: _theme);
  }
}
