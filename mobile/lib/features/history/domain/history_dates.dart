import 'package:intl/intl.dart';
import '../../../shared/formatters.dart';

String historyDay(String timestamp) {
  final date = DateTime.tryParse(timestamp);
  return date == null
      ? timestamp
      : dateKey(date.toUtc().add(const Duration(hours: 5, minutes: 30)));
}

String historyDayLabel(String timestamp, {DateTime? now}) {
  final today = now ?? shopNow();
  final day = historyDay(timestamp);
  if (day == dateKey(today)) return 'Today';
  if (day == dateKey(today.subtract(const Duration(days: 1)))) {
    return 'Yesterday';
  }
  final date = DateTime.tryParse(day);
  return date == null ? day : DateFormat('d MMM yyyy').format(date);
}
