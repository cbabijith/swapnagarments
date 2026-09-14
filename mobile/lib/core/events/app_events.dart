import 'dart:async';

sealed class AppEvent {
  const AppEvent();
}

class WorkChanged extends AppEvent {
  const WorkChanged(this.pieceId, this.operation);
  final String pieceId, operation;
}

class RefreshRequested extends AppEvent {
  const RefreshRequested();
}

class SessionExpired extends AppEvent {
  const SessionExpired();
}

/// Notifications are dispatched after server acknowledgement.
class AppEvents {
  final _stream = StreamController<AppEvent>.broadcast();
  Stream<AppEvent> get stream => _stream.stream;
  void emit(AppEvent event) {
    if (!_stream.isClosed) _stream.add(event);
  }

  void dispose() => _stream.close();
}
