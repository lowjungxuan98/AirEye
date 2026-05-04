import '../json_map.dart';
import '../llm_provider.dart';

class ProviderResponse {
  const ProviderResponse({required this.currentProvider, required this.availableProviders});

  final LlmProvider currentProvider;
  final List<LlmProvider> availableProviders;

  factory ProviderResponse.fromJson(JsonMap json) => ProviderResponse(
    currentProvider: LlmProvider.fromValue(json['current_provide'] as String),
    availableProviders: (json['available_providers'] as List<dynamic>)
        .map((e) => LlmProvider.fromValue(e as String))
        .toList(),
  );

  JsonMap toJson() => {
    'current_provide': currentProvider.value,
    'available_providers': availableProviders.map((e) => e.value).toList(),
  };
}
