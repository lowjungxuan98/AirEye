import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'grim_ssh_client.dart';

class GrimSshNotifier extends Notifier<Map<String, GrimSshClient>> {
  @override
  Map<String, GrimSshClient> build() => {};

  Future<GrimSshClient> connect({
    required String id,
    required String host,
    required int port,
    required String username,
    required String credential,
    bool useKey = false,
  }) async {
    state[id]?.close();

    final client = await GrimSshClient.connect(
      host: host,
      port: port,
      username: username,
      credential: credential,
      useKey: useKey,
    );

    state = {...state, id: client};
    return client;
  }

  void disconnect(String id) {
    state[id]?.close();
    state = {...state}..remove(id);
  }

  GrimSshClient? operator [](String id) => state[id];
  bool isConnected(String id) => state.containsKey(id);
}

final grimSshProvider =
    NotifierProvider<GrimSshNotifier, Map<String, GrimSshClient>>(
      GrimSshNotifier.new,
    );
