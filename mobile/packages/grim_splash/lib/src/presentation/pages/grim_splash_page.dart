import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';
import 'package:grim_role_select/grim_role_select.dart';

class GrimSplashPage extends StatefulWidget {
  const GrimSplashPage({super.key, this.healthClient});

  final GrimHealthClient? healthClient;

  @override
  State<GrimSplashPage> createState() => _GrimSplashPageState();
}

enum _GrimSplashStatus { checking, ready, failed }

class _GrimSplashPageState extends State<GrimSplashPage> {
  static const Duration _delay = Duration(milliseconds: 900);

  late final GrimHealthClient _healthClient = widget.healthClient ?? GrimHealthClient();

  _GrimSplashStatus _status = _GrimSplashStatus.checking;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _runHealthCheck();
  }

  Future<void> _runHealthCheck() async {
    if (_status != _GrimSplashStatus.checking || _errorMessage != null) {
      setState(() {
        _status = _GrimSplashStatus.checking;
        _errorMessage = null;
      });
    }

    try {
      final startedAt = DateTime.now();
      final report = await _healthClient.check();
      final remainingDelay = _delay - DateTime.now().difference(startedAt);
      if (remainingDelay > Duration.zero) {
        await Future<void>.delayed(remainingDelay);
      }
      if (!mounted) return;
      if (!report.ok) {
        setState(() {
          _status = _GrimSplashStatus.failed;
          _errorMessage = report.failureSummary;
        });
        return;
      }
      _completeSplash();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _status = _GrimSplashStatus.failed;
        _errorMessage = error.toString();
      });
    }
  }

  void _completeSplash() {
    if (!mounted) return;
    setState(() => _status = _GrimSplashStatus.ready);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => const GrimRoleSelectPage()));
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: GrimColors.scaffold,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const GrimBrandLockup(
                  titleSize: 44,
                  titleLetterSpacing: 1.4,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  textAlign: TextAlign.center,
                  spacing: 12,
                ),
                const SizedBox(height: 40),
                _buildStatus(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatus() {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 180),
      child: switch (_status) {
        _GrimSplashStatus.checking => const SizedBox(
          key: ValueKey<String>('checking'),
          width: 120,
          height: 3,
          child: LinearProgressIndicator(backgroundColor: GrimColors.surfaceHigh, color: GrimColors.accent),
        ),
        _GrimSplashStatus.ready => const Icon(
          Icons.check_circle_outline,
          key: ValueKey<String>('ready'),
          color: GrimColors.accent,
          size: 32,
        ),
        _GrimSplashStatus.failed => Column(
          key: const ValueKey<String>('failed'),
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_outlined, color: GrimColors.muted, size: 34),
            const SizedBox(height: 14),
            const Text(
              'API unavailable',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70, fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage ?? 'Health check failed',
              textAlign: TextAlign.center,
              style: const TextStyle(color: GrimColors.muted, fontSize: 12, height: 1.3),
            ),
            const SizedBox(height: 18),
            FilledButton(onPressed: _runHealthCheck, child: const Text('Retry')),
          ],
        ),
      },
    );
  }
}
