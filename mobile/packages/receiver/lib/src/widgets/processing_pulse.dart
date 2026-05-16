import 'package:core/core.dart';

class ProcessingPulse extends StatelessWidget {
  const ProcessingPulse({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 20,
      height: 20,
      child: Pulsator(
        style: const PulseStyle(color: GrimColors.accent),
        count: 3,
        duration: const Duration(seconds: 2),
        repeat: 0,
      ),
    );
  }
}
