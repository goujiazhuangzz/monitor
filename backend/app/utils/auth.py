import hashlib
import json
import os


class AuthManager:
    def __init__(self, config_file='auth_config.json'):
        self.auth_config_file = config_file
        self.default_username = 'admin'
        self.default_password = '123456'
        self.load_or_create_config()

    def load_or_create_config(self):
        """Load existing auth config or create default one"""
        if os.path.exists(self.auth_config_file):
            with open(self.auth_config_file, 'r') as f:
                self.auth_config = json.load(f)
        else:
            # Create default config
            self.auth_config = {
                'users': {
                    self.default_username: self._hash_password(self.default_password)
                }
            }
            self._save_config()

    def _save_config(self):
        """Save auth config to file"""
        with open(self.auth_config_file, 'w') as f:
            json.dump(self.auth_config, f, indent=2)

    def _hash_password(self, password):
        """Hash password using SHA256"""
        return hashlib.sha256(password.encode('utf-8')).hexdigest()

    def authenticate(self, username, password):
        """Authenticate user"""
        if 'users' not in self.auth_config:
            return False

        hashed_password = self._hash_password(password)
        return (username in self.auth_config['users'] and
                self.auth_config['users'][username] == hashed_password)

    def change_password(self, username, new_password):
        """Update user password"""
        if 'users' not in self.auth_config:
            self.auth_config['users'] = {}

        self.auth_config['users'][username] = self._hash_password(new_password)
        self._save_config()
        return True

    def add_user(self, username, password):
        """Add new user"""
        if 'users' not in self.auth_config:
            self.auth_config['users'] = {}

        if username in self.auth_config['users']:
            return False

        self.auth_config['users'][username] = self._hash_password(password)
        self._save_config()
        return True

    def delete_user(self, username):
        """Delete user"""
        if 'users' not in self.auth_config:
            return False

        if username not in self.auth_config['users']:
            return False

        del self.auth_config['users'][username]
        self._save_config()
        return True

    def get_users(self):
        """Get all users (without passwords)"""
        if 'users' not in self.auth_config:
            return []

        return [{'username': username} for username in self.auth_config['users']]