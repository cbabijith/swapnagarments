import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../../core/data/json.dart';
import '../../../core/events/app_events.dart';
import '../../../core/network/api_failure.dart';
import '../../../core/providers.dart';
import '../domain/work_piece.dart';

final workCommandsProvider =
    NotifierProvider.autoDispose<WorkCommands, Set<String>>(WorkCommands.new);

class WorkCommands extends Notifier<Set<String>> {
  final _retryIds = <String, String>{};
  @override
  Set<String> build() => const {};
  Future<void> update(
    WorkPiece piece,
    String operation, {
    String? reason,
  }) async {
    if (state.contains(piece.id)) return;
    if (!piece.canUpdate) {
      throw const ApiFailure('Refresh this piece before changing its work.');
    }
    if (operation == 'block' &&
        (reason == null ||
            reason.trim().length < 3 ||
            reason.trim().length > 500)) {
      throw const ApiFailure('Add a reason between 3 and 500 characters.');
    }
    final Json action = piece.command(operation, reason: reason);
    final key = jsonEncode(action);
    // A transport retry of the same action keeps its original server identity.
    final mutationId = _retryIds.putIfAbsent(key, () => const Uuid().v4());
    state = {...state, piece.id};
    try {
      await ref.read(apiProvider).command({
        'mutationId': mutationId,
        'action': action,
      });
      _retryIds.remove(key);
      if (ref.mounted) {
        ref.read(eventsProvider).emit(WorkChanged(piece.id, operation));
      }
    } on ApiFailure catch (error) {
      if (!error.uncertain) _retryIds.remove(key);
      if (error.status == 409 && ref.mounted) {
        ref.read(eventsProvider).emit(const RefreshRequested());
      }
      rethrow;
    } finally {
      if (ref.mounted) state = {...state}..remove(piece.id);
    }
  }
}
