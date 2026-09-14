import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/providers.dart';
import '../data/history_repository.dart';
import '../domain/completed_work.dart';

final historyProvider = NotifierProvider.autoDispose
    .family<HistoryController, PageState<CompletedWork>, HistoryFilter>(
      HistoryController.new,
    );

class HistoryController extends PagedController<CompletedWork> {
  HistoryController(this.filter);
  final HistoryFilter filter;
  @override
  Future<PageResult<CompletedWork>> fetch(int page, CancelToken cancel) =>
      ref.read(historyRepositoryProvider).read(filter, page, cancel);
  @override
  String itemId(CompletedWork item) => item.id;
}

final historyDetailProvider = FutureProvider.autoDispose
    .family<CompletedWork, String>((ref, id) {
      refreshOnEvents(ref);
      final cancel = CancelToken();
      ref.onDispose(cancel.cancel);
      return ref.read(historyRepositoryProvider).detail(id, cancel);
    });
