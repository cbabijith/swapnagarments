import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'config/app_config.dart';
import 'events/app_events.dart';
import 'network/api_client.dart';
import 'network/session_store.dart';

final configProvider = Provider((ref) => AppConfig.environment());
final eventsProvider = Provider((ref) {
  final events = AppEvents();
  ref.onDispose(events.dispose);
  return events;
});
final apiProvider = Provider((ref) {
  final config = ref.watch(configProvider);
  final api = ApiClient(
    config,
    SecureSessionStore(config.baseUrl.origin),
    ref.watch(eventsProvider),
  );
  ref.onDispose(api.dispose);
  return api;
});
void refreshOnEvents(Ref ref) {
  final subscription = ref.watch(eventsProvider).stream.listen((event) {
    if (event is WorkChanged || event is RefreshRequested) ref.invalidateSelf();
  });
  ref.onDispose(subscription.cancel);
}
