import 'package:flutter/material.dart';
import '../../../app/theme.dart';
import '../../../core/data/json.dart';
import '../../../shared/widgets/panel.dart';

class WorkSummary extends StatelessWidget {
  const WorkSummary(this.summary, {super.key});
  final Json summary;
  @override
  Widget build(BuildContext context) => Panel(
    padding: 14,
    child: Row(
      children: [
        for (final entry in {
          'total': 'Unfinished',
          'inProgress': 'In progress',
          'blocked': 'Blocked',
          'overdue': 'Overdue',
        }.entries)
          Expanded(
            child: Column(
              children: [
                Text(
                  '${summary[entry.key] ?? '—'}',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 4),
                Text(
                  entry.value,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.muted, fontSize: 10),
                ),
              ],
            ),
          ),
      ],
    ),
  );
}
