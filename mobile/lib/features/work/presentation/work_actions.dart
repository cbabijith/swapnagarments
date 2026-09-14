import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/theme.dart';
import '../application/work_commands.dart';
import '../domain/work_piece.dart';

class WorkActions extends ConsumerWidget {
  const WorkActions(this.piece, {super.key, this.refreshing = false});
  final WorkPiece piece;
  final bool refreshing;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final busy = ref.watch(
      workCommandsProvider.select((value) => value.contains(piece.id)),
    );
    final operation = switch (piece.status) {
      'in_progress' => 'complete',
      'blocked' => 'resume',
      _ => 'start',
    };
    final label = switch (operation) {
      'complete' => 'Complete stage',
      'resume' => 'Resume work',
      _ => 'Start work',
    };
    final disabled = busy || refreshing || !piece.canUpdate;
    return Row(
      children: [
        Expanded(
          child: FilledButton.icon(
            onPressed: disabled
                ? null
                : () => _perform(context, ref, operation),
            icon: Icon(
              operation == 'complete' ? Icons.check : Icons.play_arrow_outlined,
              size: 17,
            ),
            label: Text(busy ? 'Saving…' : label),
          ),
        ),
        if (piece.status != 'blocked') ...[
          const SizedBox(width: 10),
          OutlinedButton.icon(
            onPressed: disabled ? null : () => _perform(context, ref, 'block'),
            icon: const Icon(Icons.pause, size: 16),
            label: const Text('Block'),
          ),
        ],
      ],
    );
  }

  Future<void> _perform(
    BuildContext context,
    WidgetRef ref,
    String operation,
  ) async {
    if (operation == 'complete' || operation == 'block') {
      await showDialog<void>(
        context: context,
        builder: (_) => WorkConfirmation(piece, operation),
      );
      return;
    }
    try {
      await ref.read(workCommandsProvider.notifier).update(piece, operation);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              operation == 'start' ? 'Work started' : 'Work resumed',
            ),
          ),
        );
      }
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }
}

class WorkConfirmation extends ConsumerStatefulWidget {
  const WorkConfirmation(this.piece, this.operation, {super.key});
  final WorkPiece piece;
  final String operation;
  @override
  ConsumerState<WorkConfirmation> createState() => _WorkConfirmationState();
}

class _WorkConfirmationState extends ConsumerState<WorkConfirmation> {
  final _reason = TextEditingController();
  bool _busy = false;
  Object? _error;
  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(workCommandsProvider.notifier)
          .update(
            widget.piece,
            widget.operation,
            reason: widget.operation == 'block' ? _reason.text : null,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.operation == 'block'
                  ? 'Work blocked'
                  : '${widget.piece.stepName} completed',
            ),
          ),
        );
        Navigator.pop(context);
      }
    } catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final block = widget.operation == 'block';
    return PopScope(
      canPop: !_busy,
      child: AlertDialog(
        title: Text(
          block ? 'Block this work?' : 'Complete ${widget.piece.stepName}?',
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${widget.piece.number} · ${widget.piece.garment}'),
              const SizedBox(height: 12),
              Text(
                block
                    ? 'Tell the owner what is stopping this piece.'
                    : widget.piece.nextStep != null
                    ? 'This piece will move to ${widget.piece.nextStep}.'
                    : 'This piece will be ready for pickup.',
              ),
              if (block) ...[
                const SizedBox(height: 16),
                TextField(
                  controller: _reason,
                  enabled: !_busy,
                  minLines: 2,
                  maxLines: 4,
                  maxLength: 500,
                  decoration: const InputDecoration(
                    labelText: 'Reason (required)',
                  ),
                ),
              ],
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    '$_error',
                    style: const TextStyle(color: AppColors.danger),
                  ),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: _busy ? null : () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: Text(
              _busy
                  ? 'Saving…'
                  : block
                  ? 'Block work'
                  : 'Complete stage',
            ),
          ),
        ],
      ),
    );
  }
}
