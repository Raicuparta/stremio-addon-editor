# Stremio Addon Editor

Simple node script for editing a Stremio user's installed addon list.

Features:
1. Edit the transport URL of any addon.
2. Reorder the addon list by moving an addon to the top.

Number 2 is useful for installing addons hosted in your local network via http (without https). Stremio clients block this because your locally-hosted addons will fail in Stremio web, but it otherwise works fine.

So you can install the addon via localhost, then use this script to replace localhost with your local network IP, making the addon accessible to all devices in your network without having to set up certificate stuff.
