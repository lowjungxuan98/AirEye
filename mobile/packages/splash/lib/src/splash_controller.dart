import 'package:core/core.dart';
import 'package:role/role.dart';
import 'splash_state.dart';

class SplashController extends BaseController<SplashState> {
  @override
  SplashState build() => const SplashInitial();

  @override
  bool get isLoading => state is SplashLoading;

  @override
  void setLoading() => state = const SplashLoading();

  @override
  void setError(String message) => state = SplashError(message);

  Future<void> initialize() => run(() async {
    final report = await GrimEndpoints.health();
    if (!report.ok) {
      state = const SplashError('Backend health check failed');
      return;
    }
    state = const SplashNavigateToRole();
  });

  void navigateToRole(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const SelectRoleView()));
    });
  }
}

final splashControllerProvider = BaseNotifierProvider<SplashController, SplashState>(SplashController.new);
