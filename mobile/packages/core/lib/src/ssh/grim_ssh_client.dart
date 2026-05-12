import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dartssh2/dartssh2.dart';

class GrimSshClient {
  GrimSshClient._({
    required this.session,
    required this.stdin,
    required this.stdout,
    required SSHClient client,
  }) : _client = client;

  final SSHSession session;
  final StreamSink<Uint8List> stdin;
  final Stream<Uint8List> stdout;
  final SSHClient _client;

  static Future<GrimSshClient> connect({
    required String host,
    required int port,
    required String username,
    required String credential,
    bool useKey = false,
  }) async {
    final socket = await SSHSocket.connect(
      host,
      port,
      timeout: const Duration(seconds: 10),
    );

    SSHClient client;

    if (useKey) {
      final keys = SSHKeyPair.fromPem(credential);
      client = SSHClient(
        socket,
        username: username,
        identities: keys,
        disableHostkeyVerification: true,
      );
    } else {
      client = SSHClient(
        socket,
        username: username,
        onPasswordRequest: () => credential,
        disableHostkeyVerification: true,
      );
    }

    await client.authenticated;

    final session = await client.shell(
      pty: const SSHPtyConfig(type: 'xterm-256color', width: 80, height: 24),
    );

    return GrimSshClient._(
      session: session,
      stdin: session.stdin,
      stdout: session.stdout,
      client: client,
    );
  }

  Future<String> execute(String command) async {
    final session = await _client.execute(command);
    final bytes = <int>[];
    await for (final chunk in session.stdout) {
      bytes.addAll(chunk);
    }
    return utf8.decode(bytes);
  }

  void resize(int width, int height) {
    session.resizeTerminal(width, height);
  }

  void write(String data) {
    stdin.add(Uint8List.fromList(data.codeUnits));
  }

  void close() {
    session.close();
  }
}
