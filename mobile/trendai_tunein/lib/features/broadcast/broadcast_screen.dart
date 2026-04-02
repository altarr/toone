import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

import '../../app.dart';
import '../../core/storage/secure_storage.dart';

class BroadcastScreen extends ConsumerStatefulWidget {
  const BroadcastScreen({super.key});

  @override
  ConsumerState<BroadcastScreen> createState() => _BroadcastScreenState();
}

class _BroadcastScreenState extends ConsumerState<BroadcastScreen> {
  IO.Socket? _socket;
  MediaStream? _localStream;
  RTCPeerConnection? _peerConnection;

  bool _isBroadcasting = false;
  bool _isConnecting = false;
  bool _isLive = false;
  int _listenerCount = 0;
  String? _error;
  String _username = '';

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final username = await SecureStorage.getUsername();
    setState(() => _username = username ?? 'admin');
    _connectSocket();
  }

  Future<void> _connectSocket() async {
    final prefs = await SharedPreferences.getInstance();
    final serverUrl = prefs.getString('server_url') ?? '';

    _socket = IO.io(serverUrl, <String, dynamic>{
      'transports': ['websocket', 'polling'],
      'autoConnect': true,
    });

    _socket!.on('connect', (_) {
      debugPrint('Socket connected');
    });

    _socket!.on('streamState', (data) {
      if (mounted) {
        setState(() {
          _isLive = data['live'] == true;
          _listenerCount = data['listenerCount'] ?? 0;
        });
      }
    });

    _socket!.on('disconnect', (_) {
      debugPrint('Socket disconnected');
    });
  }

  Future<void> _startBroadcast() async {
    setState(() { _isConnecting = true; _error = null; });

    // Request microphone permission
    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      setState(() {
        _error = 'Microphone permission is required to broadcast';
        _isConnecting = false;
      });
      return;
    }

    try {
      // Start the stream on the server
      final token = await SecureStorage.getToken();

      // Tell server to start stream
      _socket!.emitWithAck('createProducerTransport', {'token': token}).then(
        (response) async {
          if (response['error'] != null) {
            setState(() {
              _error = response['error'];
              _isConnecting = false;
            });
            return;
          }

          final params = response['params'];

          // Get local audio stream
          _localStream = await navigator.mediaDevices.getUserMedia({
            'audio': {
              'echoCancellation': true,
              'noiseSuppression': true,
              'autoGainControl': true,
            },
            'video': false,
          });

          // Create peer connection
          final config = {
            'iceServers': [
              {'urls': 'stun:stun.l.google.com:19302'},
            ],
          };

          _peerConnection = await createPeerConnection(config);

          // Add audio track
          final audioTrack = _localStream!.getAudioTracks().first;
          await _peerConnection!.addTrack(audioTrack, _localStream!);

          // Connect transport
          _socket!.emitWithAck('connectProducerTransport', {
            'dtlsParameters': params['dtlsParameters'],
          }).then((res) {
            if (res['error'] != null) {
              setState(() {
                _error = res['error'];
                _isConnecting = false;
              });
              return;
            }

            // Produce audio
            _socket!.emitWithAck('produce', {
              'kind': 'audio',
              'rtpParameters': params['iceCandidates'], // simplified
            }).then((produceRes) {
              if (produceRes['error'] != null) {
                setState(() {
                  _error = produceRes['error'];
                  _isConnecting = false;
                });
                return;
              }

              setState(() {
                _isBroadcasting = true;
                _isConnecting = false;
              });
            });
          });
        },
      );
    } catch (e) {
      setState(() {
        _error = 'Failed to start broadcast: $e';
        _isConnecting = false;
      });
    }
  }

  Future<void> _stopBroadcast() async {
    _localStream?.getTracks().forEach((track) => track.stop());
    _localStream?.dispose();
    _localStream = null;

    _peerConnection?.close();
    _peerConnection = null;

    // Tell server to stop
    final token = await SecureStorage.getToken();
    _socket?.emit('stopBroadcast', {'token': token});

    setState(() {
      _isBroadcasting = false;
    });
  }

  Future<void> _logout() async {
    await _stopBroadcast();
    _socket?.dispose();
    final auth = ref.read(authServiceProvider);
    await auth.signOut();
    if (mounted) context.go('/login');
  }

  @override
  void dispose() {
    _localStream?.dispose();
    _peerConnection?.close();
    _socket?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Image.asset('assets/images/logo_white.png', height: 28),
                  Row(
                    children: [
                      Text(
                        _username,
                        style: const TextStyle(color: Color(0xFF888888), fontSize: 13),
                      ),
                      const SizedBox(width: 12),
                      GestureDetector(
                        onTap: _logout,
                        child: const Text(
                          'LOGOUT',
                          style: TextStyle(
                            color: Color(0xFF888888),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const Spacer(),

              // Status
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _isLive ? const Color(0xFFD71920) : const Color(0xFF666666),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _isLive ? 'LIVE' : 'OFFLINE',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 2.0,
                      color: _isLive ? const Color(0xFFD71920) : const Color(0xFF888888),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Listener count
              if (_isLive)
                Text(
                  '$_listenerCount listener${_listenerCount != 1 ? 's' : ''}',
                  style: const TextStyle(color: Color(0xFF888888), fontSize: 13),
                ),

              const SizedBox(height: 48),

              // Big broadcast button
              GestureDetector(
                onTap: _isConnecting
                    ? null
                    : (_isBroadcasting ? _stopBroadcast : _startBroadcast),
                child: Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _isBroadcasting
                        ? const Color(0xFFD71920)
                        : const Color(0xFF1A1A1A),
                    border: Border.all(
                      color: _isBroadcasting
                          ? const Color(0xFFD71920)
                          : const Color(0xFF333333),
                      width: 3,
                    ),
                    boxShadow: _isBroadcasting
                        ? [
                            BoxShadow(
                              color: const Color(0xFFD71920).withOpacity(0.3),
                              blurRadius: 40,
                              spreadRadius: 10,
                            ),
                          ]
                        : null,
                  ),
                  child: Center(
                    child: _isConnecting
                        ? const SizedBox(
                            width: 32,
                            height: 32,
                            child: CircularProgressIndicator(
                              color: Color(0xFFD71920),
                              strokeWidth: 3,
                            ),
                          )
                        : Icon(
                            _isBroadcasting ? Icons.stop : Icons.mic,
                            size: 56,
                            color: _isBroadcasting
                                ? Colors.white
                                : const Color(0xFF888888),
                          ),
                  ),
                ),
              ),

              const SizedBox(height: 24),

              Text(
                _isConnecting
                    ? 'Connecting...'
                    : (_isBroadcasting ? 'Tap to stop' : 'Tap to broadcast'),
                style: const TextStyle(
                  color: Color(0xFF888888),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),

              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(
                  _error!,
                  style: const TextStyle(color: Color(0xFFFF6B6F), fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ],

              const Spacer(),

              // Audio visualizer placeholder
              if (_isBroadcasting)
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    12,
                    (i) => Container(
                      margin: const EdgeInsets.symmetric(horizontal: 2),
                      width: 4,
                      height: 12 + (i % 5) * 8.0,
                      decoration: BoxDecoration(
                        color: const Color(0xFFD71920),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
