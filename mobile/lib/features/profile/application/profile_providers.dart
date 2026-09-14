import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/providers.dart';
import '../../history/data/history_repository.dart';
import '../../history/domain/completed_work.dart';
import '../../work/data/work_repository.dart';
import '../../work/domain/work_piece.dart';
import '../data/profile_repository.dart';
import '../domain/worker_profile.dart';

CancelToken _token(Ref ref) {
  refreshOnEvents(ref);
  final cancel = CancelToken();
  ref.onDispose(cancel.cancel);
  return cancel;
}

final profileProvider = FutureProvider.autoDispose<WorkerProfile?>(
  (ref) => ref.read(profileRepositoryProvider).read(_token(ref)),
);
final profileWorkProvider = FutureProvider.autoDispose<PageResult<WorkPiece>>(
  (ref) => ref
      .read(workRepositoryProvider)
      .read(allWork, 1, _token(ref), pageSize: 3),
);
final profileHistoryProvider =
    FutureProvider.autoDispose<PageResult<CompletedWork>>(
      (ref) => ref
          .read(historyRepositoryProvider)
          .read(allHistory, 1, _token(ref), pageSize: 3),
    );
