import 'package:core/core.dart';
import 'package:receiver/receiver.dart';
import 'package:sender/sender.dart';
import 'select_role_state.dart';

class SelectRoleController extends BaseController<SelectRoleState> {
  @override
  SelectRoleState build() => const SelectRoleReady();

  @override
  bool get isLoading => state is SelectRoleLoading;

  @override
  void setLoading() => state = const SelectRoleLoading();

  @override
  void setError(String message) => state = SelectRoleError(message);

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
