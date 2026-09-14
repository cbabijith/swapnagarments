import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../app/theme.dart';
import '../../../core/data/json.dart';
import '../../../shared/formatters.dart';
import '../../../shared/widgets/filters.dart';
import '../../../shared/widgets/panel.dart';
import '../../../shared/widgets/query_feedback.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../piece_details/domain/piece_snapshot.dart';
import '../../piece_details/presentation/design_gallery.dart';
import '../../piece_details/presentation/measurement_grid.dart';
import '../application/history_controller.dart';
import '../domain/completed_work.dart';

class HistoryDetailScreen extends ConsumerStatefulWidget {
  const HistoryDetailScreen(this.id, {super.key});
  final String id;
  @override
  ConsumerState<HistoryDetailScreen> createState() =>
      _HistoryDetailScreenState();
}

class _HistoryDetailScreenState extends ConsumerState<HistoryDetailScreen> {
  String _tab = 'overview';
  @override
  Widget build(BuildContext context) {
    final provider = historyDetailProvider(widget.id);
    return Scaffold(
      appBar: AppBar(title: const Text('Work details')),
      body: ref
          .watch(provider)
          .when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => Padding(
              padding: const EdgeInsets.all(20),
              child: QueryError(error, retry: () => ref.invalidate(provider)),
            ),
            data: (entry) {
              final snapshot = PieceSnapshot(entry.snapshot);
              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Panel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${entry.number} · Piece ${shortId(entry.pieceId)}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.muted,
                                ),
                              ),
                            ),
                            const StatusBadge('completed'),
                          ],
                        ),
                        Text(
                          entry.garment,
                          style: Theme.of(context).textTheme.headlineLarge,
                        ),
                        Text(
                          '${entry.stepName} · ${completedDate(entry.completedAt)}',
                        ),
                        const Divider(),
                        if (entry.customer.isEmpty)
                          const Text(
                            'Customer details are no longer available for this order.',
                          )
                        else ...[
                          Text(
                            string(entry.customer['name']),
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          if (string(entry.customer['phone']).isNotEmpty)
                            TextButton.icon(
                              onPressed: () =>
                                  _call(string(entry.customer['phone'])),
                              icon: const Icon(Icons.phone_outlined, size: 16),
                              label: Text(string(entry.customer['phone'])),
                            ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  ChoiceTabs(
                    options: const {
                      'overview': 'Overview',
                      'measurements': 'Measurements',
                      'designs': 'Designs',
                    },
                    value: _tab,
                    onChanged: (value) => setState(() => _tab = value),
                  ),
                  const SizedBox(height: 16),
                  Panel(
                    child: switch (_tab) {
                      'measurements' => MeasurementGrid(snapshot),
                      'designs' => Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (string(snapshot.design['notes']).isNotEmpty) ...[
                            Text(string(snapshot.design['notes'])),
                            const SizedBox(height: 16),
                          ],
                          DesignGallery(
                            snapshot.assets,
                            workCode: 'history:${entry.id}',
                          ),
                        ],
                      ),
                      _ => _Overview(entry),
                    },
                  ),
                ],
              );
            },
          ),
    );
  }

  Future<void> _call(String phone) async {
    try {
      final opened = await launchUrl(
        Uri(scheme: 'tel', path: phone.replaceAll(RegExp(r'[^\d+]'), '')),
      );
      if (!opened) {
        throw const FormatException('Calling is unavailable on this device.');
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Calling is unavailable on this device.'),
          ),
        );
      }
    }
  }
}

class _Overview extends StatelessWidget {
  const _Overview(this.entry);
  final CompletedWork entry;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      for (final field in {
        'Workstation': stationName(integer(entry.data['station'])),
        'Stage': entry.stepName,
        if (entry.snapshot.isNotEmpty) ...{
          'Material': string(entry.snapshot['material'], 'No material notes'),
          'Priority': string(entry.snapshot['priority']),
          'Due date': shortDate(string(entry.snapshot['dueDate'])),
        },
      }.entries)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  field.key,
                  style: const TextStyle(color: AppColors.muted),
                ),
              ),
              Expanded(child: Text(field.value, textAlign: TextAlign.end)),
            ],
          ),
        ),
      if (entry.snapshot.isEmpty)
        const Text(
          'This older completion has no saved measurement or design snapshot.',
        ),
      ExpansionTile(
        tilePadding: EdgeInsets.zero,
        title: const Text('Full record'),
        children: [
          SelectableText(
            'Piece: ${entry.pieceId}\nCompleted: ${completedDate(entry.completedAt)}'
            '${entry.snapshot['assignedAt'] == null ? '' : '\nAssigned: ${completedDate(string(entry.snapshot['assignedAt']))}'}'
            '${entry.snapshot['startedAt'] == null ? '' : '\nStarted: ${completedDate(string(entry.snapshot['startedAt']))}'}',
          ),
        ],
      ),
    ],
  );
}
