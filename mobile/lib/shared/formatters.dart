import 'package:intl/intl.dart';

const stations = ['Cutting', 'Sizing', 'Handloom', 'Stitching', 'Ironing'];
String stationName(int index) =>
    index >= 0 && index < stations.length ? stations[index] : 'Ready';
DateTime shopNow() =>
    DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30));
String dateKey(DateTime date) => DateFormat('yyyy-MM-dd').format(date);
String shortDate(String value) {
  final date = DateTime.tryParse(value);
  return date == null ? value : DateFormat('dd MMM').format(date);
}

String completedDate(String value) {
  final date = DateTime.tryParse(value);
  return date == null
      ? value
      : '${DateFormat('dd MMM yyyy, h:mm a').format(date.toUtc().add(const Duration(hours: 5, minutes: 30)))} IST';
}

String shortId(String value) =>
    value.length > 6 ? value.substring(value.length - 6) : value;
String statusLabel(String status) => switch (status) {
  'in_progress' => 'In progress',
  'blocked' => 'Blocked',
  'completed' => 'Completed',
  _ => 'Pending',
};
