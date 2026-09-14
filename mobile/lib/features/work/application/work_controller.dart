import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/data/paged_controller.dart';
import '../data/work_repository.dart';
import '../domain/work_piece.dart';

final workProvider = NotifierProvider.autoDispose
    .family<WorkController, PageState<WorkPiece>, WorkFilter>(
      WorkController.new,
    );

class WorkController extends PagedController<WorkPiece> {
  WorkController(this.filter);
  final WorkFilter filter;
  @override
  Future<PageResult<WorkPiece>> fetch(int page, CancelToken cancel) =>
      ref.read(workRepositoryProvider).read(filter, page, cancel);
  @override
  String itemId(WorkPiece item) => item.id;
}
