"""
Configuration Loader Utility
Provides functionality for loading and managing configuration files
"""

import os
import json
import logging

logger = logging.getLogger(__name__)

# SSH配置文件路径
SSH_CONFIG_FILE = 'ssh_config.json'

def load_monitor_config(app):
    """Load monitor configuration from file"""
    try:
        with open(app.config['MONITOR_CONFIG_FILE'], 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading monitor config: {e}")
        # Return default config
        return {
            "monitor_paths": ["."],
            "exclude_patterns": ["monitor.py"]
        }

def load_ssh_config():
    """Load SSH configuration from file"""
    try:
        if os.path.exists(SSH_CONFIG_FILE):
            with open(SSH_CONFIG_FILE, 'r') as f:
                return json.load(f)
        else:
            # Return default config
            return {
                "connections": []
            }
    except Exception as e:
        logger.error(f"Error loading SSH config: {e}")
        # Return default config
        return {
            "connections": []
        }

def save_ssh_config(config):
    """Save SSH configuration to file"""
    try:
        with open(SSH_CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving SSH config: {e}")
        return False