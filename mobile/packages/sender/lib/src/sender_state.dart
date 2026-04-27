import 'package:core/core.dart';

sealed class SenderState extends BaseState {
  const SenderState();
}

class SenderInitial extends SenderState {
  const SenderInitial();
}

class SenderLoading extends SenderState {
  const SenderLoading();
}

class SenderReady extends SenderState {
  const SenderReady();
}

class SenderCapturing extends SenderState {
  const SenderCapturing();
}

class SenderError extends SenderState {
  const SenderError(this.message);
  final String message;
}
