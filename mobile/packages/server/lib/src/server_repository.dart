import 'dart:convert';

import 'package:core/core.dart';

class ServerRepository {
  static const _key = 'grim_servers';

  Future<List<ServerConfig>> loadAll() async {
    final raw = await grimSecureStorage.read(key: _key);
    if (raw == null) return [];

    final list = jsonDecode(raw) as List;
    return list
        .map((e) => ServerConfig.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> saveAll(List<ServerConfig> servers) async {
    final raw = jsonEncode(servers.map((s) => s.toJson()).toList());
    await grimSecureStorage.write(key: _key, value: raw);
  }
}
