class ServerFormResult {
  const ServerFormResult({
    required this.host,
    required this.port,
    required this.username,
    required this.credential,
    required this.useKey,
  });

  final String host;
  final int port;
  final String username;
  final String credential;
  final bool useKey;
}
