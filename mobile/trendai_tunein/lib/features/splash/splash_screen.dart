import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _spinController;

  @override
  void initState() {
    super.initState();
    _spinController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
    _checkAuth();
  }

  @override
  void dispose() {
    _spinController.dispose();
    super.dispose();
  }

  Future<void> _checkAuth() async {
    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;

    final auth = ref.read(authServiceProvider);
    final serverUrl = await auth.getServerUrl();

    if (!mounted) return;

    // No server URL stored — need to scan QR
    if (serverUrl == null || serverUrl.isEmpty) {
      context.go('/scan');
      return;
    }

    final hasToken = await auth.hasStoredToken();
    if (!mounted) return;

    if (!hasToken) {
      context.go('/login');
      return;
    }

    // Validate token
    final user = await auth.validateToken();
    if (!mounted) return;

    if (user == null) {
      await auth.signOut();
      if (mounted) context.go('/login');
      return;
    }

    if (user['must_change_password'] == true) {
      context.go('/login');
      return;
    }

    context.go('/broadcast');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            RotationTransition(
              turns: _spinController,
              child: Image.asset(
                'assets/images/logo_icon.png',
                width: 80,
                height: 80,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'TUNE IN',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                letterSpacing: 2.0,
                color: Color(0xFF888888),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
