import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/data/json.dart';
import '../../../core/events/app_events.dart';
import '../../../core/network/api_failure.dart';
import '../../../core/providers.dart';
import '../domain/worker_session.dart';

final sessionProvider =
    AsyncNotifierProvider<SessionController, WorkerSession?>(
      SessionController.new,
    );

class SessionController extends AsyncNotifier<WorkerSession?> {
  @override
  Future<WorkerSession?> build() async {
    final subscription = ref.read(eventsProvider).stream.listen((event) {
      if (event is SessionExpired) state = const AsyncData(null);
    });
    ref.onDispose(subscription.cancel);
    try {
      return await _session();
    } on ApiFailure catch (error) {
      if (error.status == 401) return null;
      rethrow;
    }
  }

  Future<WorkerSession> _session() async {
    final api = ref.read(apiProvider);
    final owner = object((await api.get('/api/session'))['owner']);
    if (owner['role'] != 'worker' || string(owner['staffId']).isEmpty) {
      await api.signOut();
      throw const ApiFailure(
        'Sign in with your worker account. The owner portal is on the website.',
      );
    }
    return WorkerSession.fromJson(owner);
  }

  Future<void> signIn(String email, String password) async {
    await ref.read(apiProvider).signIn(email, password);
    final user = await _session();
    if (ref.mounted) state = AsyncData(user);
  }

  Future<void> signOut() async {
    await ref.read(apiProvider).signOut();
    if (ref.mounted) state = const AsyncData(null);
  }
}
