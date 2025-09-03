"""
Configuration Loader Utility
Provides functionality for loading and managing configuration files
"""

import os
import json
import logging

logger = logging.getLogger(__name__)


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