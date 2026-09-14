import 'package:flutter/material.dart';
import '../../../app/theme.dart';
import '../../../core/data/json.dart';
import '../../../shared/formatters.dart';
import '../../../shared/widgets/panel.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../piece_details/presentation/piece_details.dart';
import '../domain/work_piece.dart';
import 'work_actions.dart';

class WorkCard extends StatelessWidget {
  const WorkCard(
    this.piece, {
    super.key,
    required this.today,
    this.refreshing = false,
  });
  final WorkPiece piece;
  final String today;
  final bool refreshing;
  @override
  Widget build(BuildContext context) {
    final overdue = piece.dueDate.compareTo(today) < 0;
    return Panel(
      borderColor: piece.status == 'blocked'
          ? const Color(0xffedc5b3)
          : piece.status == 'in_progress'
          ? const Color(0xffb7d3bd)
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: PriorityLabel(piece.priority)),
              StatusBadge(piece.status),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            '${piece.number} · Piece ${shortId(piece.id)}',
            style: const TextStyle(color: AppColors.muted, fontSize: 11),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: Text(
                  piece.garment,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    piece.stepName,
                    textAlign: TextAlign.end,
                    style: const TextStyle(
                      color: AppColors.green,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            piece.material.isEmpty ? 'No material notes' : piece.material,
            style: const TextStyle(color: AppColors.muted),
          ),
          const Divider(),
          Row(
            children: [
              Icon(
                Icons.calendar_today_outlined,
                size: 14,
                color: overdue ? AppColors.danger : AppColors.ink,
              ),
              const SizedBox(width: 6),
              Text(
                '${overdue ? 'Overdue · ' : 'Due '}${piece.dueDate == today ? 'today' : shortDate(piece.dueDate)}',
                style: TextStyle(
                  color: overdue ? AppColors.danger : AppColors.ink,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          if (piece.blockedReason.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                'Blocked: ${piece.blockedReason}',
                style: const TextStyle(color: AppColors.danger),
              ),
            ),
          if (object(piece.item['measurement'])['confirmed'] == false)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: Text(
                'Measurements need confirmation. Ask the owner before starting.',
              ),
            ),
          const Divider(),
          PieceDetails(
            snapshot: piece.item,
            workCode: piece.code,
            pieceId: piece.id,
          ),
          const SizedBox(height: 12),
          WorkActions(piece, refreshing: refreshing),
        ],
      ),
    );
  }
}
