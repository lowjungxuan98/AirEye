import 'package:core/core.dart';

import 'session_list_model.dart';

sealed class SessionListState extends BaseState {
  const SessionListState();
}

class SessionListLoading extends SessionListState {
  const SessionListLoading();
}

class SessionListReady extends SessionListState {
  const SessionListReady(this.sessions);

  final List<ClaudeSession> sessions;
}

class SessionListError extends SessionListState {
  const SessionListError(this.message);

  final String message;
}
