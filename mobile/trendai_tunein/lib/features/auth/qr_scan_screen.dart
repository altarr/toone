import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/api/api_client.dart';

class QrScanScreen extends StatefulWidget {
  const QrScanScreen({super.key});

  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _processed = false;
  bool _showManualEntry = false;
  final _serverUrlCtrl = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    _serverUrlCtrl.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_processed) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode?.rawValue == null) return;
    _processUrl(barcode!.rawValue!);
  }

  Future<void> _processUrl(String raw) async {
    if (_processed) return;

    Uri? uri;
    try {
      uri = Uri.parse(raw);
    } catch (_) {
      return;
    }

    if (!uri.hasScheme || !uri.scheme.startsWith('http')) return;

    setState(() => _processed = true);
    _controller.stop();

    final serverUrl =
        '${uri.scheme}://${uri.host}${uri.port != 80 && uri.port != 443 && uri.port != -1 ? ':${uri.port}' : ''}';

    await ApiClient.configure(serverUrl);

    if (!mounted) return;
    context.go('/login');
  }

  Future<void> _submitManualEntry() async {
    final serverUrl = _serverUrlCtrl.text.trim();
    if (serverUrl.isEmpty) return;

    await ApiClient.configure(serverUrl);

    if (!mounted) return;
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    if (_showManualEntry) {
      return Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          title: const Text('Enter Server URL'),
          backgroundColor: Colors.black,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => setState(() => _showManualEntry = false),
          ),
        ),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Image.asset('assets/images/logo_white.png', height: 36),
                const SizedBox(height: 32),
                const Text(
                  'Connect to Server',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Enter the server URL shown on the admin dashboard.',
                  style: TextStyle(color: Colors.white54),
                ),
                const SizedBox(height: 32),
                TextFormField(
                  controller: _serverUrlCtrl,
                  decoration: const InputDecoration(
                    labelText: 'SERVER URL',
                    hintText: 'https://tune.example.com',
                    hintStyle: TextStyle(color: Color(0xFF444444)),
                  ),
                  style: const TextStyle(color: Colors.white),
                  keyboardType: TextInputType.url,
                  autocorrect: false,
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => _submitManualEntry(),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: _submitManualEntry,
                  child: const Text('CONNECT'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Link to Server'),
        backgroundColor: Colors.black,
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
          ),
          _ScanOverlay(),
          Align(
            alignment: Alignment.bottomCenter,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 40),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Scan the QR code on the\nadmin dashboard to connect.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                  const SizedBox(height: 20),
                  TextButton(
                    onPressed: () => setState(() => _showManualEntry = true),
                    child: const Text(
                      'Enter URL manually',
                      style: TextStyle(
                        color: Color(0xFFD71920),
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScanOverlay extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    const windowSize = 260.0;
    final left = (size.width - windowSize) / 2;
    final top = (size.height - windowSize) / 2 - 40;

    return Stack(
      children: [
        Positioned(top: 0, left: 0, right: 0, height: top,
            child: const ColoredBox(color: Color(0x99000000))),
        Positioned(top: top + windowSize, left: 0, right: 0, bottom: 0,
            child: const ColoredBox(color: Color(0x99000000))),
        Positioned(top: top, left: 0, width: left, height: windowSize,
            child: const ColoredBox(color: Color(0x99000000))),
        Positioned(top: top, left: left + windowSize, right: 0, height: windowSize,
            child: const ColoredBox(color: Color(0x99000000))),
        Positioned(
          left: left,
          top: top,
          child: _Corners(size: windowSize),
        ),
      ],
    );
  }
}

class _Corners extends StatelessWidget {
  final double size;
  const _Corners({required this.size});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _CornerPainter(),
      ),
    );
  }
}

class _CornerPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFD71920)
      ..strokeWidth = 4.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.square;

    final w = size.width;
    final h = size.height;
    const c = 28.0;

    canvas.drawLine(Offset(0, c), Offset.zero, paint);
    canvas.drawLine(Offset.zero, Offset(c, 0), paint);
    canvas.drawLine(Offset(w - c, 0), Offset(w, 0), paint);
    canvas.drawLine(Offset(w, 0), Offset(w, c), paint);
    canvas.drawLine(Offset(0, h - c), Offset(0, h), paint);
    canvas.drawLine(Offset(0, h), Offset(c, h), paint);
    canvas.drawLine(Offset(w - c, h), Offset(w, h), paint);
    canvas.drawLine(Offset(w, h - c), Offset(w, h), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
