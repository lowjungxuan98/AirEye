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
      final provider = await AirEyeEndpoints.getProvider();
      state = SelectRoleReady(provider: provider);
    } catch (e) {
      setError(e.toString());
    }
  }

  Future<void> updateProvider(LlmProvider provider) async {
    final current = state;
    if (current is! SelectRoleReady) return;

    state = SelectRoleReady(provider: current.provider, autoAnalyseEnabled: current.autoAnalyseEnabled, isUpdatingProvider: true);
    try {
      final response = await AirEyeEndpoints.updateProvider(request: UpdateProviderRequest(provider: provider));
      state = SelectRoleReady(provider: response, autoAnalyseEnabled: current.autoAnalyseEnabled);
    } catch (e) {
      setError(e.toString());
    }
  }

  Future<void> updateAutoAnalyse(bool autoAnalyse) async {
    final current = state;
    if (current is! SelectRoleReady) return;

    state = SelectRoleReady(provider: current.provider, autoAnalyseEnabled: autoAnalyse, isUpdatingAutoAnalyse: true);
    try {
      final response = await AirEyeEndpoints.updateAutoAnalyse(request: UpdateAutoAnalyseRequest(autoAnalyse: autoAnalyse));
      state = SelectRoleReady(provider: current.provider, autoAnalyseEnabled: response.autoAnalyse);
    } catch (e) {
      state = current;
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

final selectRoleControllerProvider = BaseNotifierProvider<SelectRoleController, SelectRoleState>(SelectRoleController.new);
