import '../../../core/data/json.dart';
import '../../../shared/formatters.dart';

class CompletedWork {
  CompletedWork.fromJson(Json data) : data = Map.unmodifiable(data);
  final Json data;
  String get id => string(data['id']);
  String get number => string(data['orderNumber']);
  String get pieceId => string(data['pieceId']);
  String get garment => string(data['garment']);
  String get stepName =>
      string(data['stepName'], stationName(integer(data['station'])));
  String get completedAt => string(data['completedAt']);
  Json get snapshot => object(data['snapshot']);
  Json get customer => object(data['customer']);
}

typedef HistoryFilter = ({String query, String station});
const allHistory = (query: '', station: 'all');
