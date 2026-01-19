"""
Map Poster Themes

17 pre-defined color themes for map generation.
Based on the maptoposter project themes.
"""

THEMES = {
    'default': {
        'name': 'Default',
        'background': '#1a1a2e',
        'streets': '#edf2f4',
        'water': '#0077b6',
        'parks': '#2d6a4f',
        'buildings': '#463f3a'
    },
    'midnight': {
        'name': 'Midnight',
        'background': '#0d1b2a',
        'streets': '#778da9',
        'water': '#1b4965',
        'parks': '#1d3557',
        'buildings': '#415a77'
    },
    'sunset': {
        'name': 'Sunset',
        'background': '#2b2d42',
        'streets': '#edf2f4',
        'water': '#8d99ae',
        'parks': '#ef233c',
        'buildings': '#d90429'
    },
    'forest': {
        'name': 'Forest',
        'background': '#081c15',
        'streets': '#d8f3dc',
        'water': '#40916c',
        'parks': '#52b788',
        'buildings': '#2d6a4f'
    },
    'ocean': {
        'name': 'Ocean',
        'background': '#03045e',
        'streets': '#caf0f8',
        'water': '#0077b6',
        'parks': '#00b4d8',
        'buildings': '#0096c7'
    },
    'monochrome': {
        'name': 'Monochrome',
        'background': '#000000',
        'streets': '#ffffff',
        'water': '#333333',
        'parks': '#666666',
        'buildings': '#999999'
    },
    'paper': {
        'name': 'Paper',
        'background': '#fefae0',
        'streets': '#283618',
        'water': '#606c38',
        'parks': '#dda15e',
        'buildings': '#bc6c25'
    },
    'nordic': {
        'name': 'Nordic',
        'background': '#2e3440',
        'streets': '#eceff4',
        'water': '#5e81ac',
        'parks': '#a3be8c',
        'buildings': '#4c566a'
    },
    'candy': {
        'name': 'Candy',
        'background': '#ffc8dd',
        'streets': '#ffafcc',
        'water': '#bde0fe',
        'parks': '#a2d2ff',
        'buildings': '#cdb4db'
    },
    'desert': {
        'name': 'Desert',
        'background': '#e9c46a',
        'streets': '#f4a261',
        'water': '#2a9d8f',
        'parks': '#264653',
        'buildings': '#e76f51'
    },
    'vintage': {
        'name': 'Vintage',
        'background': '#f5ebe0',
        'streets': '#d5bdaf',
        'water': '#a68a64',
        'parks': '#936639',
        'buildings': '#7f5539'
    },
    'neon': {
        'name': 'Neon',
        'background': '#0a0a0a',
        'streets': '#39ff14',
        'water': '#ff00ff',
        'parks': '#00ffff',
        'buildings': '#ffff00'
    },
    'arctic': {
        'name': 'Arctic',
        'background': '#e0fbfc',
        'streets': '#98c1d9',
        'water': '#3d5a80',
        'parks': '#293241',
        'buildings': '#ee6c4d'
    },
    'lavender': {
        'name': 'Lavender',
        'background': '#e0aaff',
        'streets': '#c77dff',
        'water': '#9d4edd',
        'parks': '#7b2cbf',
        'buildings': '#5a189a'
    },
    'autumn': {
        'name': 'Autumn',
        'background': '#fdf0d5',
        'streets': '#c1121f',
        'water': '#780000',
        'parks': '#669bbc',
        'buildings': '#003049'
    },
    'matrix': {
        'name': 'Matrix',
        'background': '#000000',
        'streets': '#00ff00',
        'water': '#003300',
        'parks': '#006600',
        'buildings': '#001100'
    },
    'mycosoft': {
        'name': 'Mycosoft',
        'background': '#0f0f23',
        'streets': '#00ff88',
        'water': '#0066ff',
        'parks': '#00aa44',
        'buildings': '#333355'
    }
}


def get_theme(name: str) -> dict:
    """Get theme by name, defaults to 'default' if not found."""
    return THEMES.get(name.lower(), THEMES['default'])


def list_themes() -> list:
    """List all available theme names."""
    return [
        {'id': key, 'name': value['name']}
        for key, value in THEMES.items()
    ]
