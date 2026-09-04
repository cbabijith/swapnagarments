import 'package:flutter/material.dart';

void main() {
  runApp(const SwapnaApp());
}

/// Swapna Garments mobile app — placeholder shell.
///
/// Planned: station QR scanning (each cloth piece carries a QR tag),
/// per-station work queues, and staff views over the Hono backend
/// (http://localhost:3001 in development). Built after the domain
/// workshop — see docs/DOMAIN-DISCUSSION.md in the repo root.
class SwapnaApp extends StatelessWidget {
  const SwapnaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Swapna Garments',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF0F766E),
        brightness: Brightness.light,
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorSchemeSeed: const Color(0xFF0F766E),
        brightness: Brightness.dark,
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  static const _modules = [
    ('Station scanning', 'Scan the QR tag on each cloth piece to check it in and out of cutting, sizing, handloom, stitching and ironing.'),
    ('Work queues', 'See and progress the items assigned to your station, with correction loops.'),
    ('Staff sign-in', 'Better Auth accounts shared with the backend API.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleTextStyle: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
        title: const Text('Swapna Garments'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 16),
            child: Center(
              child: Text('setup phase', style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic)),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Station & staff companion app',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            'This app talks to the Hono backend (/backend in the monorepo). '
            'Features are built after the domain workshop.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          for (final (title, detail) in _modules)
            Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                title: Text(title),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(detail),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
