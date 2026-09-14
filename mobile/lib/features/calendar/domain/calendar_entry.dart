import '../../../core/data/json.dart';

class CalendarEntry {
  CalendarEntry.fromJson(Json data) : data = Map.unmodifiable(data);
  final Json data;
  String get id => string(data['id']);
  String get kind => string(data['kind']);
  String get garment => string(data['garment']);
  String get number => string(data['orderNumber']);
  String get stepName => string(data['stepName']);
  String get status => string(data['status']);
  String get code => 'swapna:${data['orderId']}:${data['pieceId']}';
  String get historyId => id.startsWith('completed:') ? id.substring(10) : id;
}

typedef DayFilter = ({String date, String kind});
