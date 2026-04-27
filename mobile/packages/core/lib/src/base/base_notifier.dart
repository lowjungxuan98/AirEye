import 'package:flutter_riverpod/flutter_riverpod.dart';

abstract class BaseAsyncNotifier<T> extends AsyncNotifier<T> {
  Future<void> run(Future<T> Function() fn) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(fn);
  }
}
