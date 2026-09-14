import 'package:flutter/material.dart';
import '../../app/theme.dart';
import '../formatters.dart';

class StatusBadge extends StatelessWidget {
  const StatusBadge(this.status, {super.key});
  final String status;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: status == 'blocked' ? const Color(0xffffeee5) : AppColors.pale,
      borderRadius: BorderRadius.circular(20),
    ),
    child: Text(
      statusLabel(status),
      style: const TextStyle(fontSize: 11, color: AppColors.green),
    ),
  );
}

class PriorityLabel extends StatelessWidget {
  const PriorityLabel(this.priority, {super.key});
  final String priority;
  @override
  Widget build(BuildContext context) => Text(
    switch (priority) {
      'urgent' => '↑↑ Urgent',
      'high' => '↑ High',
      _ => 'Normal',
    },
    style: TextStyle(
      fontSize: 12,
      color: priority == 'urgent' ? AppColors.danger : AppColors.muted,
    ),
  );
}
