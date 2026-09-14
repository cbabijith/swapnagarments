import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/theme.dart';
import '../../../shared/widgets/brand.dart';
import '../../../shared/widgets/panel.dart';
import '../../../shared/widgets/query_feedback.dart';
import '../application/session_controller.dart';

class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key, this.connectionError});
  final Object? connectionError;
  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController(), _password = TextEditingController();
  bool _busy = false, _visible = false;
  Object? _error;
  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy || !_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(sessionProvider.notifier)
          .signIn(_email.text, _password.text);
    } catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Brand(),
                const SizedBox(height: 44),
                const Icon(Icons.lock_outline, color: AppColors.green),
                const SizedBox(height: 18),
                const PageHeading(
                  eyebrow: 'YOUR EVERYDAY WORKSPACE',
                  title: 'Lovely to see you again.',
                  description: 'Sign in and pick up where you left off.',
                ),
                if (widget.connectionError != null)
                  QueryError(
                    widget.connectionError!,
                    retry: () => ref.invalidate(sessionProvider),
                  ),
                Form(
                  key: _form,
                  child: AutofillGroup(
                    child: Column(
                      children: [
                        TextFormField(
                          controller: _email,
                          enabled: !_busy,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [AutofillHints.username],
                          autocorrect: false,
                          decoration: const InputDecoration(
                            labelText: 'Email address',
                          ),
                          validator: (value) =>
                              value != null &&
                                  RegExp(
                                    r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                                  ).hasMatch(value.trim())
                              ? null
                              : 'Enter your email address.',
                        ),
                        const SizedBox(height: 20),
                        TextFormField(
                          controller: _password,
                          enabled: !_busy,
                          obscureText: !_visible,
                          autocorrect: false,
                          enableSuggestions: false,
                          maxLength: 128,
                          autofillHints: const [AutofillHints.password],
                          onFieldSubmitted: (_) => _submit(),
                          decoration: InputDecoration(
                            labelText: 'Password',
                            counterText: '',
                            suffixIcon: IconButton(
                              tooltip: _visible
                                  ? 'Hide password'
                                  : 'Show password',
                              onPressed: () =>
                                  setState(() => _visible = !_visible),
                              icon: Icon(
                                _visible
                                    ? Icons.visibility_off_outlined
                                    : Icons.visibility_outlined,
                              ),
                            ),
                          ),
                          validator: (value) => (value?.length ?? 0) >= 12
                              ? null
                              : 'Use at least 12 characters.',
                        ),
                        if (_error != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 16),
                            child: Semantics(
                              liveRegion: true,
                              child: Text(
                                '$_error',
                                style: const TextStyle(color: AppColors.danger),
                              ),
                            ),
                          ),
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            onPressed: _busy ? null : _submit,
                            icon: const Icon(Icons.arrow_forward, size: 17),
                            label: Text(
                              _busy ? 'Opening your workspace…' : 'Sign in',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Your shop’s details stay private.',
                  style: TextStyle(color: AppColors.muted),
                ),
                const SizedBox(height: 36),
                const Text(
                  'Made with care, for every stitch.',
                  style: TextStyle(color: AppColors.muted, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
