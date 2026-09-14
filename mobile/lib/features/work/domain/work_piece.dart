import '../../../core/data/json.dart';
import '../../../shared/formatters.dart';

class WorkPiece {
  WorkPiece.fromJson(Json data)
    : order = Map.unmodifiable(object(data['order'])),
      item = Map.unmodifiable(object(data['item']));
  final Json order, item;
  String get id => string(item['id']);
  String get orderId => string(order['id']);
  String get number => string(order['number']);
  String get garment => string(item['garment']);
  String get material => string(item['material'], 'No material notes');
  String get priority => string(order['priority'], 'normal');
  String get dueDate => string(order['dueDate']);
  int get station => integer(item['station']);
  Json get work => object(item['work']);
  int get version => integer(work['version']);
  String get status => string(work['status'], 'pending');
  String get blockedReason => string(work['blockedReason']);
  bool get canUpdate =>
      string(work['assigneeId']).isNotEmpty &&
      object(item['measurement'])['confirmed'] != false;
  String get code => 'swapna:$orderId:$id';
  String get stepName => _step(0) ?? 'Ready';
  String? get nextStep => _step(1);
  String? _step(int offset) {
    final workflow = object(item['workflow']);
    final position =
        (workflow.isEmpty ? station : integer(workflow['position'])) + offset;
    if (workflow.isEmpty) {
      return position < stations.length ? stationName(position) : null;
    }
    final steps = objects(workflow['steps']);
    return position >= 0 && position < steps.length
        ? string(steps[position]['name'])
        : null;
  }

  Json command(String operation, {String? reason}) => {
    'type': 'work.update',
    'orderId': orderId,
    'pieceId': id,
    'expectedStation': station,
    'expectedVersion': version,
    'operation': operation,
    if (reason != null) 'reason': reason.trim(),
  };
}

typedef WorkFilter = ({String status, String station, String code});
const allWork = (status: 'all', station: 'all', code: '');
