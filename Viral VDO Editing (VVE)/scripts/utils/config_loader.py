import os
import sys
from pathlib import Path

def load_channel_config(channel_name=None):
    """Loads channel YAML config. Uses pyyaml if available."""
    if not channel_name:
        channel_name = os.environ.get("VVE_CHANNEL", "doctorbank")

    script_dir = Path(__file__).parent
    vve_root = script_dir.parent
    config_path = vve_root / "channels" / f"{channel_name}.yaml"
    
    if not config_path.exists():
        print(f"Warning: Channel config {config_path} not found.")
        return {}
        
    try:
        import yaml
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    except ImportError:
        print("Error: pyyaml is required. Please run: pip install pyyaml")
        # Return a fallback with just the transition pool so it doesn't crash
        return {
            "transition_pool": ["Zoom Shake", "Zoom Shake 2", "Rotate & Change", "Get Closer", "Zoom Swipe", "Pull Out"]
        }
    except Exception as e:
        print(f"Error loading config {config_path}: {e}")
        return {}

def get_style(config, section, key, default=None):
    """Get nested style value: get_style(config, 'subtitle', 'font_size', 14.0)"""
    return config.get('style', {}).get(section, {}).get(key, default)

def get_audio(config, section, key, default=None):
    """Get nested audio value: get_audio(config, 'sfx', 'library', '...')"""
    return config.get('audio', {}).get(section, {}).get(key, default)

def load_preset(preset_name):
    """Load a JSON preset from the presets/ folder."""
    if not preset_name:
        return {}
        
    script_dir = Path(__file__).parent
    vve_root = script_dir.parent
    preset_path = vve_root / "presets" / f"{preset_name}.json"
    
    if not preset_path.exists():
        print(f"Warning: Preset {preset_path} not found.")
        return {}
        
    try:
        import json
        with open(preset_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading preset {preset_path}: {e}")
        return {}
