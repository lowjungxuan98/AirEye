import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'base_state.dart';

abstract class BaseController<S extends BaseState> extends Notifier<S> {
  bool get isLoading;

  void setLoading();

  void setError(String message);

  Future<void> run(Future<void> Function() fn) async {
    try {
      setLoading();
      await fn();
    } catch (e) {
      setError(e.toString());
    }
  }
}
