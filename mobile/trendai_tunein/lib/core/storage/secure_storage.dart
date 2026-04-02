import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const _keyToken = 'tat_token';
  static const _keyUsername = 'tat_username';

  static Future<void> saveToken(String token) =>
      _storage.write(key: _keyToken, value: token);

  static Future<String?> getToken() => _storage.read(key: _keyToken);

  static Future<void> deleteToken() => _storage.delete(key: _keyToken);

  static Future<void> saveUsername(String username) =>
      _storage.write(key: _keyUsername, value: username);

  static Future<String?> getUsername() => _storage.read(key: _keyUsername);

  static Future<void> clearAll() => _storage.deleteAll();
}
