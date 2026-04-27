import 'package:core/core.dart';
import 'splash_controller.dart';
import 'splash_state.dart';

class SplashScreen extends BasePage {
  const SplashScreen({super.key});

  @override
  Widget buildPage(context, ref) {
    final state = ref.watch(splashControllerProvider);

    ref.listen(splashControllerProvider, (_, next) {
      if (next is SplashNavigateToRole) {
        ref.read(splashControllerProvider.notifier).navigateToRole(context);
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (state is SplashInitial) {
        ref.read(splashControllerProvider.notifier).initialize();
      }
    });

    return Scaffold(
      body: Center(
        child: switch (state) {
          SplashLoading() => const CircularProgressIndicator(),
          SplashError(:final message) => Text(message, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          _ => const FlutterLogo(size: 80),
        },
      ),
    );
  }
}
