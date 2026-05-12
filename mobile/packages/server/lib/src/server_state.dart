import 'package:core/core.dart';

sealed class ServerState extends BaseState {
  const ServerState();
}

class ServerInitial extends ServerState {
  const ServerInitial();
}

class ServerLoading extends ServerState {
  const ServerLoading();
}

class ServerReady extends ServerState {
  const ServerReady(this.servers);
  final List<ServerConfig> servers;
}

class ServerError extends ServerState {
  const ServerError(this.message);
  final String message;
}
