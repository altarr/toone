import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _newPasswordCtrl = TextEditingController();
  final _confirmPasswordCtrl = TextEditingController();

  bool _loading = false;
  String _error = '';
  bool _mustChangePassword = false;

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    _newPasswordCtrl.dispose();
    _confirmPasswordCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    setState(() { _error = ''; _loading = true; });

    try {
      final auth = ref.read(authServiceProvider);
      final user = await auth.login(
        _usernameCtrl.text.trim(),
        _passwordCtrl.text,
      );

      if (!mounted) return;

      if (user != null && user['must_change_password'] == true) {
        setState(() { _mustChangePassword = true; _loading = false; });
        return;
      }

      context.go('/broadcast');
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ?? 'Login failed';
      setState(() => _error = msg.toString());
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted && !_mustChangePassword) setState(() => _loading = false);
    }
  }

  Future<void> _handleChangePassword() async {
    if (_newPasswordCtrl.text.length < 6) {
      setState(() => _error = 'Password must be at least 6 characters');
      return;
    }
    if (_newPasswordCtrl.text != _confirmPasswordCtrl.text) {
      setState(() => _error = 'Passwords do not match');
      return;
    }

    setState(() { _error = ''; _loading = true; });

    try {
      final auth = ref.read(authServiceProvider);
      await auth.changePassword(_newPasswordCtrl.text);

      if (!mounted) return;
      context.go('/broadcast');
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ?? 'Failed to change password';
      setState(() => _error = msg.toString());
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset('assets/images/logo_white.png', height: 36),
                const SizedBox(height: 32),

                if (!_mustChangePassword) ...[
                  const Text(
                    'ADMIN LOGIN',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 2.0,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Sign in with your admin credentials to broadcast.',
                    style: TextStyle(color: Color(0xFF888888), fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  TextFormField(
                    controller: _usernameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'USERNAME',
                      hintText: 'admin',
                      hintStyle: TextStyle(color: Color(0xFF444444)),
                    ),
                    style: const TextStyle(color: Colors.white),
                    autocorrect: false,
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordCtrl,
                    decoration: const InputDecoration(
                      labelText: 'PASSWORD',
                      hintStyle: TextStyle(color: Color(0xFF444444)),
                    ),
                    style: const TextStyle(color: Colors.white),
                    obscureText: true,
                    textInputAction: TextInputAction.done,
                    onFieldSubmitted: (_) => _handleLogin(),
                  ),
                  const SizedBox(height: 24),
                  if (_error.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Text(_error,
                          style: const TextStyle(color: Color(0xFFFF6B6F), fontSize: 13)),
                    ),
                  ElevatedButton(
                    onPressed: _loading ? null : _handleLogin,
                    child: Text(_loading ? 'LOGGING IN...' : 'LOG IN'),
                  ),
                ] else ...[
                  const Text(
                    'CHANGE PASSWORD',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 2.0,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'You must change your password before continuing.',
                    style: TextStyle(color: Color(0xFF888888), fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  TextFormField(
                    controller: _newPasswordCtrl,
                    decoration: const InputDecoration(
                      labelText: 'NEW PASSWORD',
                      hintText: 'Min 6 characters',
                      hintStyle: TextStyle(color: Color(0xFF444444)),
                    ),
                    style: const TextStyle(color: Colors.white),
                    obscureText: true,
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _confirmPasswordCtrl,
                    decoration: const InputDecoration(
                      labelText: 'CONFIRM PASSWORD',
                      hintStyle: TextStyle(color: Color(0xFF444444)),
                    ),
                    style: const TextStyle(color: Colors.white),
                    obscureText: true,
                    textInputAction: TextInputAction.done,
                    onFieldSubmitted: (_) => _handleChangePassword(),
                  ),
                  const SizedBox(height: 24),
                  if (_error.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Text(_error,
                          style: const TextStyle(color: Color(0xFFFF6B6F), fontSize: 13)),
                    ),
                  ElevatedButton(
                    onPressed: _loading ? null : _handleChangePassword,
                    child: Text(_loading ? 'SAVING...' : 'SET PASSWORD'),
                  ),
                ],

                const SizedBox(height: 24),
                TextButton(
                  onPressed: () => context.go('/scan'),
                  child: const Text(
                    'Change server',
                    style: TextStyle(color: Color(0xFF888888), fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
