import 'package:core/core.dart';

sealed class SplashState extends BaseState {
  const SplashState();
}

class SplashInitial extends SplashState {
  const SplashInitial();
}

class SplashLoading extends SplashState {
  const SplashLoading();
}

class SplashReady extends SplashState {
  const SplashReady();
}

class SplashNavigateToRole extends SplashState {
  const SplashNavigateToRole();
}

class SplashError extends SplashState {
  const SplashError(this.message);
  final String message;
}
