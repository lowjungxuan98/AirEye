import 'package:flutter/foundation.dart';

@immutable
class ServerConfig {
  const ServerConfig({
    required this.id,
    required this.host,
    required this.port,
    required this.username,
    required this.credential,
    this.useKey = false,
  });

  final String id;
  final String host;
  final int port;
  final String username;
  final String credential;
  final bool useKey;

  Map<String, dynamic> toJson() => {
    'id': id,
    'host': host,
    'port': port,
    'username': username,
    'credential': credential,
    'useKey': useKey,
  };

  factory ServerConfig.fromJson(Map<String, dynamic> json) => ServerConfig(
    id: json['id'] as String,
    host: json['host'] as String,
    port: json['port'] as int,
    username: json['username'] as String,
    credential: json['credential'] as String,
    useKey: json['useKey'] as bool? ?? false,
  );
}
