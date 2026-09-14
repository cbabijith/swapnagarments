import 'package:swapna_garments/core/data/json.dart';
import 'package:swapna_garments/shared/formatters.dart';

Json piece({
  String id = 'piece-000001',
  String status = 'in_progress',
  int version = 2,
  bool confirmed = true,
}) => {
  'order': {
    'id': 'order-1',
    'number': 'SG-2100',
    'priority': 'urgent',
    'dueDate': dateKey(shopNow()),
  },
  'item': {
    'id': id,
    'garment': 'Blouse',
    'material': 'Cotton with matching lining',
    'station': 0,
    'work': {
      'assigneeId': 'worker-1',
      'status': status,
      'version': version,
      if (status == 'blocked') 'blockedReason': 'Waiting for lining cloth',
    },
    'measurement': {
      'unit': 'in',
      'confirmed': confirmed,
      'fields': [
        {'id': 'bust', 'label': 'Bust'},
        {'id': 'waist', 'label': 'Waist'},
      ],
      'values': {'bust': '36', 'waist': '30'},
    },
    'design': {
      'notes': 'Round neckline, matching thread',
      'choices': [],
      'garmentReferences': [],
      'references': [],
    },
  },
};

Json get completion => {
  'id': 'completion-1',
  'orderNumber': 'SG-2099',
  'pieceId': 'piece-000099',
  'garment': 'Silk blouse',
  'station': 3,
  'stepName': 'Stitching',
  'completedAt': '2026-09-14T04:30:00Z',
  'customer': {'name': 'Sample Customer', 'phone': '9999999999'},
  'snapshot': {
    ...object(piece()['item']),
    'dueDate': dateKey(shopNow()),
    'priority': 'high',
  },
};
Json pageInfo(int page, int total, int size) => {
  'page': page,
  'pageSize': size,
  'total': total,
  'pageCount': (total / size).ceil(),
};
Json calendarSummary([int due = 1, int done = 1]) => {
  'counts': {'due': due, 'completed': done},
  'total': due + done,
  'overdue': 0,
  'inProgress': due,
};
