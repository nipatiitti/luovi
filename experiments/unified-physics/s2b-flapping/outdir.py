"""Imported first by every script here: they read and write their pickles, frame folders and GIFs in the
working directory, so this moves it to the git-ignored out/ folder beside the scripts."""
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
os.makedirs(OUT, exist_ok=True)
os.chdir(OUT)
