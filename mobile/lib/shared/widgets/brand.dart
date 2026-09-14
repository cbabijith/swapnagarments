import 'package:flutter/material.dart';
import '../../app/theme.dart';

class Brand extends StatelessWidget {
  const Brand({super.key});
  @override
  Widget build(BuildContext context) => const Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(Icons.content_cut, size: 25, color: AppColors.ink),
      SizedBox(width: 10),
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'swapna',
            style: TextStyle(
              fontFamily: 'StudioSerif',
              fontWeight: FontWeight.w600,
              fontSize: 27,
              height: 1.1,
              color: AppColors.ink,
            ),
          ),
          Text(
            'GARMENTS',
            style: TextStyle(
              fontSize: 7,
              letterSpacing: 3.5,
              color: AppColors.ink,
            ),
          ),
        ],
      ),
    ],
  );
}
