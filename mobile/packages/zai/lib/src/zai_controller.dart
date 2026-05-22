import 'package:core/core.dart';

import 'zai_state.dart';

class ZaiController extends BaseController<ZaiState> {
  static const initialUrl = 'https://chat.z.ai/';

  @override
  ZaiState build() => const ZaiInitial();

  @override
  bool get isLoading => state is ZaiLoading;

  @override
  void setLoading() => state = const ZaiLoading(currentUrl: initialUrl);

  @override
  void setError(String message) => state = ZaiError(message, currentUrl: state.currentUrl.isEmpty ? initialUrl : state.currentUrl, progress: state.progress);

  void startPage(String url) {
    state = ZaiLoading(currentUrl: url, progress: 0);
  }

  void updateProgress(int progress) {
    final currentUrl = state.currentUrl.isEmpty ? initialUrl : state.currentUrl;

    state = progress >= 100 ? ZaiReady(currentUrl: currentUrl, errorMessage: state.errorMessage) : ZaiLoading(currentUrl: currentUrl, progress: progress, errorMessage: state.errorMessage);
  }

  void updateUrl(String url) {
    state = switch (state) {
      ZaiReady(:final errorMessage) => ZaiReady(currentUrl: url, errorMessage: errorMessage),
      ZaiError(:final message, :final progress) => ZaiError(message, currentUrl: url, progress: progress),
      _ => ZaiLoading(currentUrl: url, progress: state.progress, errorMessage: state.errorMessage),
    };
  }

  void finishPage(String url) {
    state = ZaiReady(currentUrl: url, errorMessage: state.errorMessage);
  }

  void setReady() => state = ZaiReady(currentUrl: state.currentUrl.isEmpty ? initialUrl : state.currentUrl, errorMessage: state.errorMessage);

  void clearError() {
    final currentUrl = state.currentUrl.isEmpty ? initialUrl : state.currentUrl;
    state = switch (state) {
      ZaiReady() => ZaiReady(currentUrl: currentUrl),
      ZaiLoading(:final progress) => ZaiLoading(currentUrl: currentUrl, progress: progress),
      _ => ZaiReady(currentUrl: currentUrl),
    };
  }
}

final zaiControllerProvider = BaseNotifierProvider<ZaiController, ZaiState>(ZaiController.new);
