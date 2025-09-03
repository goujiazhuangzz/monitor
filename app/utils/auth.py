import hashlib
import json
import os


class AuthManager:
    def __init__(self, app):
        self.app = app
        self.auth_config_file = os.path.join(app.config['BASE_DIR'], 'auth_config.json')
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

    def update_password(self, username, new_password):
        """Update user password"""
        if 'users' not in self.auth_config:
            self.auth_config['users'] = {}

        self.auth_config['users'][username] = self._hash_password(new_password)
        self._save_config()

    def get_users(self):
        """Get list of usernames"""
        if 'users' not in self.auth_config:
            return []
        return list(self.auth_config['users'].keys())