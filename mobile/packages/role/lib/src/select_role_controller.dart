import 'package:core/core.dart';
import 'package:receiver/receiver.dart';
import 'package:sender/sender.dart';
import 'select_role_state.dart';

class SelectRoleController extends BaseController<SelectRoleState> {
  @override
  SelectRoleState build() {
    _loadProvider();
    return const SelectRoleLoading();
  }

  @override
  bool get isLoading => state is SelectRoleLoading;

  @override
  void setLoading() => state = const SelectRoleLoading();

  @override
  void setError(String message) => state = SelectRoleError(message);

  Future<void> _loadProvider() async {
    try {
      final provider = await GrimEndpoints.getProvider();
      state = SelectRoleReady(provider: provider);
    } catch (e) {
      setError(e.toString());
    }
  }

  Future<void> updateProvider(LlmProvider provider) async {
    final current = state;
    if (current is! SelectRoleReady) return;

    state = SelectRoleReady(provider: current.provider, isUpdatingProvider: true);
    try {
      final response = await GrimEndpoints.updateProvider(
        request: UpdateProviderRequest(provider: provider),
      );
      state = SelectRoleReady(provider: response);
    } catch (e) {
      setError(e.toString());
    }
  }

  void navigateToSender(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SenderView()));
    });
  }

  void navigateToReceiver(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ReceiverView()));
    });
  }
}

final selectRoleControllerProvider = BaseNotifierProvider<SelectRoleController, SelectRoleState>(
  SelectRoleController.new,
);
