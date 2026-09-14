import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:swapna_garments/core/config/app_config.dart';
import 'package:swapna_garments/core/data/json.dart';
import 'package:swapna_garments/core/events/app_events.dart';
import 'package:swapna_garments/core/network/api_client.dart';
import 'package:swapna_garments/core/network/session_store.dart';
import 'package:swapna_garments/shared/formatters.dart';
import 'fixtures.dart';

class MemorySessionStore implements SessionStore {
  String? value = 'swapna_session=test';
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String raw) async =>
      value = object(jsonDecode(raw))['cookie'] as String;
  @override
  Future<void> clear() async => value = null;
}

class FakeApi implements HttpClientAdapter {
  final requests = <RequestOptions>[];
  final events = AppEvents();
  final store = MemorySessionStore();
  late final ApiClient api = ApiClient(
    AppConfig('https://studio.test'),
    store,
    events,
    dio: Dio()..httpClientAdapter = this,
  );
  bool signedIn = true, owner = false, failCommand = false;
  int workCount = 3;
  int? errorStatus;
  Duration delay = Duration.zero;
  Future<ResponseBody> Function(RequestOptions)? custom;
  final commands = <Json>[];
  final ids = <String>{};
  int version = 2;
  String status = 'in_progress';
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    if (delay != Duration.zero) await Future<void>.delayed(delay);
    if (custom != null) return custom!(options);
    if (options.path == '/api/auth') {
      if (options.method == 'DELETE') {
        signedIn = false;
        return respond({'success': true});
      }
      signedIn = true;
      return respond(
        {'success': true},
        headers: {
          'set-cookie': [
            'swapna_session=new-session; Max-Age=604800; Path=/; HttpOnly',
          ],
        },
      );
    }
    if (!signedIn) return respond({'error': 'Please sign in.'}, status: 401);
    if (errorStatus != null) {
      return respond({'error': 'Test server failure'}, status: errorStatus!);
    }
    if (options.path == '/api/session') {
      return respond({
        'owner': {
          'name': 'Anjali',
          'email': 'anjali@example.test',
          'staffId': 'worker-1',
          'role': owner ? 'owner' : 'worker',
        },
      });
    }
    if (options.path == '/api/work' && options.method == 'POST') {
      if (failCommand) {
        throw DioException(
          requestOptions: options,
          type: DioExceptionType.connectionError,
        );
      }
      final body = object(options.data),
          action = object(object(options.data)['action']);
      commands.add(body);
      if (ids.add(string(body['mutationId']))) {
        version++;
        status = action['operation'] == 'block' ? 'blocked' : 'in_progress';
        if (action['operation'] == 'complete') workCount = 0;
      }
      return respond({'revision': version});
    }
    final size = int.tryParse('${options.queryParameters['pageSize']}') ?? 20;
    final page = int.tryParse('${options.queryParameters['page']}') ?? 1;
    if (options.path == '/api/work') {
      var rows = List.generate(
        workCount,
        (i) => piece(
          id: 'piece-00000$i',
          status: i == 0
              ? status
              : i == 1
              ? 'blocked'
              : 'pending',
          version: version,
        ),
      );
      final filter = options.queryParameters['status'];
      if (filter != null && filter != 'all') {
        rows = rows
            .where(
              (row) => object(object(row['item'])['work'])['status'] == filter,
            )
            .toList();
      }
      final code = options.queryParameters['code'];
      if (code != null && code != 'SG-2100') {
        rows = rows
            .where(
              (row) => code == 'swapna:order-1:${object(row['item'])['id']}',
            )
            .toList();
      }
      return respond({
        'pieces': rows.skip((page - 1) * size).take(size).toList(),
        'revision': version,
        'today': dateKey(shopNow()),
        'page': pageInfo(page, rows.length, size),
        'summary': {
          'total': workCount,
          'inProgress': 1,
          'blocked': 1,
          'overdue': 0,
        },
      });
    }
    if (options.path == '/api/work/profile') {
      return respond({
        'revision': version,
        'profile': {
          'id': 'worker-1',
          'name': 'Anjali',
          'email': 'anjali@example.test',
          'role': 'Tailor',
          'color': '#235b48',
          'skills': [0, 3],
          'available': true,
          'capacityMinutes': 480,
        },
      });
    }
    if (options.path == '/api/work/history') {
      return respond({
        'revision': version,
        'entries': [completion],
        'page': pageInfo(page, 1, size),
      });
    }
    if (options.path.startsWith('/api/work/history/')) {
      return respond({'revision': version, 'entry': completion});
    }
    if (options.path == '/api/work/calendar') {
      return respond({
        'revision': version,
        'today': dateKey(shopNow()),
        'month': options.queryParameters['month'],
        'days': {dateKey(shopNow()): calendarSummary()},
        'summary': calendarSummary(),
      });
    }
    if (options.path == '/api/work/calendar/day') {
      return respond({
        'revision': version,
        'date': options.queryParameters['date'],
        'summary': calendarSummary(),
        'page': pageInfo(page, 2, size),
        'entries': [
          {
            'id': 'due:piece-000000',
            'kind': 'due',
            'orderId': 'order-1',
            'orderNumber': 'SG-2100',
            'pieceId': 'piece-000000',
            'garment': 'Blouse',
            'stepName': 'Cutting',
            'status': 'in_progress',
          },
          {
            'id': 'completion-1',
            'kind': 'completed',
            'orderId': 'order-1',
            'orderNumber': 'SG-2099',
            'pieceId': 'piece-000099',
            'garment': 'Silk blouse',
            'stepName': 'Stitching',
            'status': 'completed',
          },
        ],
      });
    }
    return respond({'error': 'Not found'}, status: 404);
  }

  static ResponseBody respond(
    Json data, {
    int status = 200,
    Map<String, List<String>>? headers,
  }) => ResponseBody.fromString(
    jsonEncode(data),
    status,
    headers: {
      'content-type': ['application/json'],
      ...?headers,
    },
  );
  void dispose() {
    api.dispose();
    events.dispose();
  }

  @override
  void close({bool force = false}) {}
}
