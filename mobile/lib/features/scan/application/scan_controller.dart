import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_failure.dart';
import '../../work/data/work_repository.dart';
import '../domain/work_code.dart';

final scanProvider = NotifierProvider.autoDispose<ScanController, bool>(
  ScanController.new,
);

class ScanController extends Notifier<bool> {
  CancelToken? _cancel;
  @override
  bool build() {
    ref.onDispose(() => _cancel?.cancel());
    return false;
  }

  Future<String?> resolve(String code) async {
    if (state) return null;
    final cleaned = code.trim();
    if (!validWorkCode(cleaned)) {
      throw const ApiFailure(
        'Scan a Swapna garment label or enter its printed order number.',
      );
    }
    state = true;
    try {
      final result = await ref
          .read(workRepositoryProvider)
          .read(
            (status: 'all', station: 'all', code: cleaned),
            1,
            _cancel = CancelToken(),
            pageSize: 1,
          );
      if (result.items.isEmpty) {
        throw const ApiFailure(
          'No unfinished work for this label is assigned to you. The piece may be completed or assigned to another worker.',
        );
      }
      return cleaned;
    } finally {
      if (ref.mounted) state = false;
    }
  }
}
