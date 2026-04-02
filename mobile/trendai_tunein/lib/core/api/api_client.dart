import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../storage/secure_storage.dart';

class ApiClient {
  static ApiClient? _instance;
  late final Dio _dio;
  final String baseUrl;

  ApiClient._internal(this.baseUrl) {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'X-Client': 'mobile-broadcaster',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SecureStorage.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  static Future<ApiClient> getInstance() async {
    if (_instance != null) return _instance!;
    final prefs = await SharedPreferences.getInstance();
    final baseUrl = prefs.getString('server_url') ?? 'http://localhost:3001';
    _instance = ApiClient._internal(baseUrl);
    return _instance!;
  }

  static Future<void> configure(String serverUrl) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', serverUrl);
    _instance = ApiClient._internal(serverUrl);
  }

  static void reset() => _instance = null;

  Dio get dio => _dio;
}
