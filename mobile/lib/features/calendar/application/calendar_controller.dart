import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/data/json.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/providers.dart';
import '../data/calendar_repository.dart';
import '../domain/calendar_entry.dart';

final calendarMonthProvider = FutureProvider.autoDispose.family<Json, String>((
  ref,
  month,
) {
  refreshOnEvents(ref);
  final cancel = CancelToken();
  ref.onDispose(cancel.cancel);
  return ref.read(calendarRepositoryProvider).month(month, cancel);
});
final calendarDayProvider = NotifierProvider.autoDispose
    .family<CalendarDayController, PageState<CalendarEntry>, DayFilter>(
      CalendarDayController.new,
    );

class CalendarDayController extends PagedController<CalendarEntry> {
  CalendarDayController(this.filter);
  final DayFilter filter;
  @override
  Future<PageResult<CalendarEntry>> fetch(int page, CancelToken cancel) =>
      ref.read(calendarRepositoryProvider).day(filter, page, cancel);
  @override
  String itemId(CalendarEntry item) => item.id;
}
