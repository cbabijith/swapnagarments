import 'package:flutter/material.dart';
import 'theme.dart';

class WorkerNavigation extends StatelessWidget {
  const WorkerNavigation({
    super.key,
    required this.index,
    required this.onSelect,
  });
  final int index;
  final ValueChanged<int> onSelect;
  @override
  Widget build(BuildContext context) => Container(
    decoration: const BoxDecoration(
      color: Colors.white,
      border: Border(top: BorderSide(color: AppColors.line)),
    ),
    child: SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 8, 8, 6),
        child: Row(
          children: [
            for (final (i, label, icon) in [
              (0, 'My work', Icons.checklist_outlined),
              (1, 'Calendar', Icons.calendar_month_outlined),
              (2, 'Scan piece', Icons.qr_code_scanner),
              (3, 'History', Icons.history),
              (4, 'Profile', Icons.person_outline),
            ])
              Expanded(
                child: Semantics(
                  selected: index == i,
                  button: true,
                  label: label,
                  child: InkWell(
                    onTap: () => onSelect(i),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      constraints: const BoxConstraints(minHeight: 58),
                      decoration: BoxDecoration(
                        color: index == i && i != 2
                            ? AppColors.pale
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (i == 2)
                            Container(
                              width: 44,
                              height: 38,
                              decoration: BoxDecoration(
                                color: index == 2
                                    ? AppColors.dark
                                    : AppColors.green,
                                borderRadius: BorderRadius.circular(11),
                              ),
                              child: const Icon(
                                Icons.qr_code_scanner,
                                size: 23,
                                color: Colors.white,
                              ),
                            )
                          else
                            Icon(
                              icon,
                              size: i == 2 ? 25 : 21,
                              color: index == i || i == 2
                                  ? AppColors.green
                                  : AppColors.muted,
                            ),
                          const SizedBox(height: 5),
                          Text(
                            label,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: index == i
                                  ? FontWeight.w600
                                  : FontWeight.normal,
                              color: index == i
                                  ? AppColors.green
                                  : AppColors.muted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    ),
  );
}
