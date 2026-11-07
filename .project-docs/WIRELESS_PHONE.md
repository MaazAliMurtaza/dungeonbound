# Wireless phone preview

Configured on 2026-11-07 after the user confirmed this is their home network.

- Home Wi-Fi is marked **Private**.
- Firewall rule `Dungeonbound-Phone-WiFi-4000-8082`: inbound TCP 4000/8082, Node only, Private profile, Wi-Fi interface, remote LocalSubnet, edge traversal blocked. The firewall remains enabled.
- API binds the active Wi-Fi address. Expo advertises that address and bundles the corresponding API URL.
- Current preview: `exp://192.168.1.7:8082`.
- Current API health: `http://192.168.1.7:4000/health`.
- QR: `phone-qr-wifi.png` in the project root.

Connect the phone to the same home Wi-Fi, open SDK 58-compatible Expo Go, and scan the wireless QR. USB forwarding is not required. If connection fails, first open the health URL in the phone browser; guest/client isolation or a VPN can prevent device-to-PC connections even on a working Wi-Fi network.

To restart after the PC or Wi-Fi address changes, start Docker Desktop and the existing database, then run `scripts/start-wireless.ps1` from an Administrator PowerShell. It detects the current Wi-Fi address, restarts the project services, and regenerates the QR. It refuses Public profiles. No `.env` secrets are changed or included in the QR.

This is a home-LAN development preview, not a hosted deployment. Verification from the PC confirms API health, Expo status, LAN bundle address and the bundled LAN API URL. A successful scan and login on the physical phone must still be confirmed on that phone.
