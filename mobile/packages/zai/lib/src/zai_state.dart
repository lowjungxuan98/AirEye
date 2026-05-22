import 'package:core/core.dart';

sealed class ZaiState extends BaseState {
  const ZaiState({required this.progress, required this.currentUrl, this.errorMessage});

  final int progress;
  final String currentUrl;
  final String? errorMessage;
}

class ZaiInitial extends ZaiState {
  const ZaiInitial() : super(progress: 0, currentUrl: '');
}

class ZaiLoading extends ZaiState {
  const ZaiLoading({super.progress = 0, required super.currentUrl, super.errorMessage});
}

class ZaiReady extends ZaiState {
  const ZaiReady({required super.currentUrl, super.errorMessage}) : super(progress: 100);
}

class ZaiError extends ZaiState {
  const ZaiError(this.message, {required super.currentUrl, super.progress = 100}) : super(errorMessage: message);

  final String message;
}
