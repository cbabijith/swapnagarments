import 'package:flutter/material.dart';
import '../../../app/theme.dart';
import '../../../shared/formatters.dart';
import '../../../shared/widgets/panel.dart';
import '../domain/completed_work.dart';

class HistoryTile extends StatelessWidget {
  const HistoryTile(this.entry, {super.key, required this.onTap});
  final CompletedWork entry;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(16),
    child: Panel(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CircleAvatar(
            radius: 17,
            backgroundColor: AppColors.pale,
            child: Icon(Icons.check, color: AppColors.green, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${entry.number} · Piece ${shortId(entry.pieceId)}',
                  style: const TextStyle(fontSize: 11, color: AppColors.muted),
                ),
                const SizedBox(height: 5),
                Text(
                  entry.garment,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  '${entry.stepName} completed',
                  style: const TextStyle(color: AppColors.green),
                ),
                const SizedBox(height: 6),
                Text(
                  completedDate(entry.completedAt),
                  style: const TextStyle(fontSize: 11, color: AppColors.muted),
                ),
                const SizedBox(height: 8),
                const Text(
                  'View details →',
                  style: TextStyle(
                    color: AppColors.green,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
