import 'package:flutter/material.dart';
import '../../../app/theme.dart';
import '../../../core/data/json.dart';
import '../domain/piece_snapshot.dart';

class MeasurementGrid extends StatelessWidget {
  const MeasurementGrid(this.snapshot, {super.key});
  final PieceSnapshot snapshot;
  @override
  Widget build(BuildContext context) {
    if (snapshot.measurement.isEmpty) {
      return const Text(
        'No measurement snapshot saved for this older piece. Confirm sizes with the owner before starting.',
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${snapshot.measurement['confirmed'] == true ? 'Confirmed measurements' : 'Measurements pending'}'
          ' · ${string(snapshot.measurement['unit'])}',
          style: const TextStyle(color: AppColors.muted),
        ),
        const SizedBox(height: 12),
        if (snapshot.fields.isEmpty) const Text('No measurements recorded.'),
        for (final field in snapshot.fields)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppColors.line)),
            ),
            child: Row(
              children: [
                Expanded(child: Text(field.label)),
                const SizedBox(width: 16),
                Flexible(
                  child: Text(
                    field.value,
                    textAlign: TextAlign.end,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
