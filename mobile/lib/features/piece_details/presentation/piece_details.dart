import 'package:flutter/material.dart';
import '../../../core/data/json.dart';
import '../domain/piece_snapshot.dart';
import 'design_gallery.dart';
import 'measurement_grid.dart';

class PieceDetails extends StatefulWidget {
  const PieceDetails({
    super.key,
    required this.snapshot,
    required this.workCode,
    required this.pieceId,
  });
  final Json snapshot;
  final String workCode, pieceId;
  @override
  State<PieceDetails> createState() => _PieceDetailsState();
}

class _PieceDetailsState extends State<PieceDetails> {
  bool _expanded = false;
  @override
  Widget build(BuildContext context) {
    final snapshot = PieceSnapshot(widget.snapshot);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: () => setState(() => _expanded = !_expanded),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 44),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Piece details & measurements',
                    style: TextStyle(fontSize: 12),
                  ),
                ),
                Icon(
                  _expanded ? Icons.expand_less : Icons.expand_more,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
        if (_expanded) ...[
          Text(
            'Piece code: ${widget.pieceId}',
            style: const TextStyle(fontSize: 11),
          ),
          const SizedBox(height: 12),
          MeasurementGrid(snapshot),
          const SizedBox(height: 16),
          if (string(snapshot.design['notes']).isNotEmpty) ...[
            Text(string(snapshot.design['notes'])),
            const SizedBox(height: 12),
          ],
          DesignGallery(snapshot.assets, workCode: widget.workCode),
        ],
      ],
    );
  }
}
