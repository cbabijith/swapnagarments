import 'package:flutter_test/flutter_test.dart';
import 'package:swapna_garments/core/events/app_events.dart';
import 'package:swapna_garments/core/network/api_failure.dart';
import 'support/fake_api.dart';

void main() {
  late FakeApi fake;
  setUp(() => fake = FakeApi());
  tearDown(() => fake.dispose());
  test(
    'sign-in, persistent cookie, Origin and logout match website contract',
    () async {
      await fake.api.signIn('  WORKER@example.test ', 'example password');
      final request = fake.requests.single;
      expect(request.path, '/api/auth');
      expect(request.method, 'POST');
      expect(request.headers['Origin'], 'https://studio.test');
      expect(request.data, {
        'action': 'signin',
        'email': 'worker@example.test',
        'password': 'example password',
      });
      await fake.api.get('/api/session');
      expect(
        fake.requests.last.headers['Cookie'],
        'swapna_session=new-session',
      );
      await fake.api.signOut();
      expect(fake.requests.last.method, 'DELETE');
      expect(fake.store.value, isNull);
    },
  );
  test('401 expires local session and emits an event', () async {
    fake.signedIn = false;
    final event = fake.events.stream.first;
    await expectLater(
      fake.api.get('/api/work'),
      throwsA(isA<ApiFailure>().having((e) => e.status, 'status', 401)),
    );
    expect(await event, isA<SessionExpired>());
    expect(fake.store.value, isNull);
  });
  test('read-only forbidden errors preserve the session', () async {
    fake.errorStatus = 403;
    await expectLater(
      fake.api.get('/api/work/profile'),
      throwsA(isA<ApiFailure>()),
    );
    expect(fake.store.value, isNotNull);
  });
  test(
    'credentials cannot be sent to an absolute or protocol relative path',
    () async {
      for (final path in [
        'https://elsewhere.test/api',
        '//elsewhere.test/api',
      ]) {
        await expectLater(fake.api.get(path), throwsArgumentError);
      }
      expect(fake.requests, isEmpty);
    },
  );
}
