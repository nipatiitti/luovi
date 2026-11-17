"""Folders beside these scripts, so they run from any working directory: out/ for everything they write (git-ignored),
dl/ for the downloaded Delft data (git-ignored, see NOTES.txt)."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out') + os.sep
DL = os.path.join(HERE, 'dl') + os.sep
os.makedirs(OUT, exist_ok=True)
