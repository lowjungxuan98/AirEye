import '../json_map.dart';
import '../llm_provider.dart';

class UpdateProviderRequest {
  const UpdateProviderRequest({required this.provider});

  final LlmProvider provider;

  JsonMap toJson() => {'current_provider': provider.value};
}
