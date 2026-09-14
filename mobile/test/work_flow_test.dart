import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:swapna_garments/core/events/app_events.dart';
import 'package:swapna_garments/core/network/api_failure.dart';
import 'package:swapna_garments/core/providers.dart';
import 'package:swapna_garments/features/auth/application/session_controller.dart';
import 'package:swapna_garments/features/work/application/work_commands.dart';
import 'package:swapna_garments/features/work/application/work_controller.dart';
import 'package:swapna_garments/features/work/domain/work_piece.dart';
import 'package:swapna_garments/features/scan/domain/work_code.dart';
import 'package:swapna_garments/features/scan/application/scan_controller.dart';
import 'support/fake_api.dart';
import 'support/fixtures.dart';

void main() {
  late FakeApi fake;
  late ProviderContainer container;
  setUp(() {
    fake = FakeApi();
    container = ProviderContainer(
      overrides: [
        apiProvider.overrideWithValue(fake.api),
        eventsProvider.overrideWithValue(fake.events),
      ],
      retry: (_, _) => null,
    );
  });
  tearDown(() {
    container.dispose();
    fake.dispose();
  });
  Future<void> settle() =>
      Future<void>.delayed(const Duration(milliseconds: 30));
  Future<void> waitForQueue(WorkFilter filter) async {
    final ready = Completer<void>();
    final subscription = container.listen(workProvider(filter), (_, next) {
      if (!next.loading && !ready.isCompleted) ready.complete();
    }, fireImmediately: true);
    await ready.future.timeout(const Duration(seconds: 5));
    subscription.close();
  }

  test(
    'queue loads bounded pages, deduplicates and reloads on events',
    () async {
      fake.workCount = 25;
      final provider = workProvider(allWork);
      container.listen(provider, (_, _) {});
      await waitForQueue(allWork);
      expect(container.read(provider).items.length, 20);
      await container.read(provider.notifier).loadMore();
      expect(container.read(provider).items.length, 25);
      expect(fake.requests.last.queryParameters['page'], 2);
      fake.workCount = 1;
      fake.events.emit(const WorkChanged('piece-000000', 'complete'));
      await settle();
      expect(container.read(provider).items.length, 1);
      expect(container.read(provider).page, 1);
    },
  );
  test('filter parameters are sent to the server', () async {
    final provider = workProvider((
      status: 'blocked',
      station: '3',
      code: 'SG-2100',
    ));
    container.listen(provider, (_, _) {});
    await settle();
    expect(fake.requests.single.queryParameters, {
      'status': 'blocked',
      'station': '3',
      'code': 'SG-2100',
      'page': 1,
      'pageSize': 20,
    });
  });
  test('commands carry version guards and publish only on success', () async {
    container.listen(workCommandsProvider, (_, _) {});
    final controller = container.read(workCommandsProvider.notifier);
    final events = <AppEvent>[];
    final sub = fake.events.stream.listen(events.add);
    await controller.update(
      WorkPiece.fromJson(piece()),
      'block',
      reason: 'Waiting for cloth',
    );
    await settle();
    expect(fake.commands.single['action'], {
      'type': 'work.update',
      'orderId': 'order-1',
      'pieceId': 'piece-000001',
      'expectedStation': 0,
      'expectedVersion': 2,
      'operation': 'block',
      'reason': 'Waiting for cloth',
    });
    expect(
      fake.commands.single['mutationId'],
      matches(RegExp(r'^[0-9a-f-]{36}$')),
    );
    expect(events.single, isA<WorkChanged>());
    await sub.cancel();
  });
  test(
    'transport retries reuse mutation identity and double taps are ignored',
    () async {
      container.listen(workCommandsProvider, (_, _) {});
      final controller = container.read(workCommandsProvider.notifier),
          item = WorkPiece.fromJson(piece());
      fake.failCommand = true;
      await expectLater(
        controller.update(item, 'complete'),
        throwsA(isA<ApiFailure>()),
      );
      final firstId = (fake.requests.last.data as Map)['mutationId'];
      fake.failCommand = false;
      fake.delay = const Duration(milliseconds: 10);
      await Future.wait([
        controller.update(item, 'complete'),
        controller.update(item, 'complete'),
      ]);
      expect(fake.commands, hasLength(1));
      expect(fake.commands.single['mutationId'], firstId);
    },
  );
  test(
    'measurements pending and short block reasons never reach the API',
    () async {
      container.listen(workCommandsProvider, (_, _) {});
      final controller = container.read(workCommandsProvider.notifier);
      await expectLater(
        controller.update(WorkPiece.fromJson(piece(confirmed: false)), 'start'),
        throwsA(isA<ApiFailure>()),
      );
      await expectLater(
        controller.update(WorkPiece.fromJson(piece()), 'block', reason: 'x'),
        throwsA(isA<ApiFailure>()),
      );
      expect(fake.requests, isEmpty);
    },
  );
  test(
    'scanner only resolves assigned unfinished work and never changes it',
    () async {
      container.listen(scanProvider, (_, _) {});
      final scanner = container.read(scanProvider.notifier);
      expect(await scanner.resolve(' SG-2100 '), 'SG-2100');
      await expectLater(scanner.resolve('SG-9999'), throwsA(isA<ApiFailure>()));
      expect(fake.requests.every((request) => request.method == 'GET'), isTrue);
    },
  );
  test('custom workflow names and next stage use snapshot position', () {
    final data = piece();
    (data['item'] as Map)['workflow'] = {
      'position': 1,
      'steps': [
        {'name': 'Cutting'},
        {'name': 'Alteration'},
        {'name': 'Final check'},
      ],
    };
    final item = WorkPiece.fromJson(data);
    expect(item.stepName, 'Alteration');
    expect(item.nextStep, 'Final check');
  });
  test('worker app rejects an owner session and revokes its cookie', () async {
    fake.owner = true;
    await expectLater(
      container.read(sessionProvider.future),
      throwsA(isA<ApiFailure>()),
    );
    expect(fake.store.value, isNull);
  });
  test('QR parsing matches web identifier rules', () {
    for (final code in ['SG-1041', 'swapna:order-1:piece-1', ' order_1 ']) {
      expect(validWorkCode(code), isTrue);
    }
    for (final code in [
      '',
      'https://studio.test',
      'swapna:a:',
      'swapna:a:b:c',
      'swapna:a:b?x',
      'a b',
    ]) {
      expect(validWorkCode(code), isFalse);
    }
  });
}
