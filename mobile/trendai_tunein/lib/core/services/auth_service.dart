import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../storage/secure_storage.dart';

class AuthService {
  Future<bool> hasStoredToken() async {
    final token = await SecureStorage.getToken();
    return token != null && token.isNotEmpty;
  }

  Future<String?> getServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('server_url');
  }

  Future<Map<String, dynamic>?> login(String username, String password) async {
    final api = await ApiClient.getInstance();
    final response = await api.dio.post('/api/auth/login', data: {
      'username': username,
      'password': password,
    });

    final data = response.data;
    final token = data['token'] as String?;
    if (token == null) throw Exception('No token received');

    await SecureStorage.saveToken(token);
    await SecureStorage.saveUsername(username);

    return data['user'] as Map<String, dynamic>?;
  }

  Future<Map<String, dynamic>?> changePassword(String newPassword) async {
    final api = await ApiClient.getInstance();
    final response = await api.dio.post('/api/auth/change-password', data: {
      'newPassword': newPassword,
    });

    final data = response.data;
    final token = data['token'] as String?;
    if (token != null) {
      await SecureStorage.saveToken(token);
    }
    return data;
  }

  Future<Map<String, dynamic>?> validateToken() async {
    try {
      final api = await ApiClient.getInstance();
      final response = await api.dio.get('/api/auth/me');
      return response.data['user'] as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  Future<void> signOut() async {
    await SecureStorage.clearAll();
    ApiClient.reset();
  }
}
