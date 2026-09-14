import 'package:flutter/material.dart';

abstract final class AppColors {
  static const green = Color(0xff235b48), dark = Color(0xff174633);
  static const background = Color(0xfff7f8f5), ink = Color(0xff26362f);
  static const muted = Color(0xff687464), line = Color(0xffe6e9e1);
  static const pale = Color(0xffeaf1e9), danger = Color(0xffa64d3d);
}

ThemeData appTheme() {
  final scheme = ColorScheme.fromSeed(seedColor: AppColors.green).copyWith(
    primary: AppColors.green,
    surface: Colors.white,
    onSurface: AppColors.ink,
    outlineVariant: AppColors.line,
    error: AppColors.danger,
  );
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: AppColors.background,
    fontFamily: 'Geist',
  );
  final border = OutlineInputBorder(
    borderRadius: BorderRadius.circular(11),
    borderSide: const BorderSide(color: AppColors.line),
  );
  return base.copyWith(
    textTheme: base.textTheme.copyWith(
      headlineLarge: const TextStyle(
        fontFamily: 'StudioSerif',
        fontSize: 32,
        fontWeight: FontWeight.w400,
        color: AppColors.ink,
      ),
      headlineSmall: const TextStyle(
        fontFamily: 'StudioSerif',
        fontSize: 27,
        fontWeight: FontWeight.w400,
        color: AppColors.ink,
      ),
      bodyMedium: const TextStyle(
        fontFamily: 'Geist',
        fontSize: 13,
        height: 1.5,
        color: AppColors.ink,
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.background,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
    ),
    dividerTheme: const DividerThemeData(color: AppColors.line, space: 24),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: border,
      enabledBorder: border,
      contentPadding: const EdgeInsets.all(14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(48, 48),
        textStyle: const TextStyle(
          fontFamily: 'Geist',
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 48),
        side: const BorderSide(color: AppColors.line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
  );
}
