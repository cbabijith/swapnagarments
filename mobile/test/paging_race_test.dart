import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:swapna_garments/core/data/paged_controller.dart';
import 'package:swapna_garments/core/providers.dart';
import 'package:swapna_garments/features/work/application/work_controller.dart';
import 'package:swapna_garments/features/work/domain/work_piece.dart';
import 'support/fake_api.dart';
import 'support/fixtures.dart';

void main() {
  test('a superseded refresh cannot overwrite newer queue results', () async {
    final fake = FakeApi(), calls = <Completer<void>>[];
    fake.custom = (request) async {
      final index = calls.length;
      final completion = Completer<void>();
      calls.add(completion);
      await completion.future;
      return FakeApi.respond({
        'pieces': [piece(id: 'request-$index')],
        'page': pageInfo(1, 1, 20),
      });
    };
    final container = ProviderContainer(
      overrides: [
        apiProvider.overrideWithValue(fake.api),
        eventsProvider.overrideWithValue(fake.events),
      ],
    );
    container.listen(workProvider(allWork), (_, _) {});
    await Future<void>.delayed(const Duration(milliseconds: 20));
    final second = container.read(workProvider(allWork).notifier).refresh();
    await Future<void>.delayed(const Duration(milliseconds: 20));
    calls.last.complete();
    await second;
    calls.first.complete();
    await Future<void>.delayed(const Duration(milliseconds: 20));
    expect(container.read(workProvider(allWork)).items.single.id, 'request-1');
    container.dispose();
    fake.dispose();
  });
  test('a refresh error retains rows and exposes a refresh retry', () async {
    final fake = FakeApi();
    final container = ProviderContainer(
      overrides: [
        apiProvider.overrideWithValue(fake.api),
        eventsProvider.overrideWithValue(fake.events),
      ],
    );
    final ready = Completer<void>();
    container.listen(workProvider(allWork), (_, PageState<WorkPiece> next) {
      if (!next.loading && !ready.isCompleted) ready.complete();
    });
    await ready.future;
    fake.errorStatus = 503;
    await container.read(workProvider(allWork).notifier).refresh();
    final failed = container.read(workProvider(allWork));
    expect(failed.items, isNotEmpty);
    expect(failed.error, isNotNull);
    expect(failed.appendError, isFalse);
    fake.errorStatus = null;
    await container.read(workProvider(allWork).notifier).refresh();
    expect(container.read(workProvider(allWork)).error, isNull);
    container.dispose();
    fake.dispose();
  });
}
