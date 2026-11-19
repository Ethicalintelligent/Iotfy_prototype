# Product folders

Generated from the product tree (Neon `core.nodes`, 19 Nov 2026). One folder per **app** product (Standalone, Base, Package). An **Edition** lives inside its base's folder. An **Add-on** has no folder of its own: its screens live in its parent's folder, shown only when the company bought it.

| ID | Kind | Product | Tree path | Folder |
|---|---|---|---|---|
| N051 | Package | ConstructSafe | Industry Solutions | `products/solutions/constructsafe/` |
| N052 | Package | HealthSafe | Industry Solutions | `products/solutions/healthsafe/` |
| N026 | Base | DG Monitoring | Remote Monitoring › Site & Equipment Monitoring | `products/remote-monitoring/site-equipment-monitoring/dg-monitoring/` |
| N027 | Base | Data Centre Environment Monitoring | Remote Monitoring › Site & Equipment Monitoring | `products/remote-monitoring/site-equipment-monitoring/data-centre-environment-monitoring/` |
| N028 | Base | Telecom Passive Infrastructure Monitoring | Remote Monitoring › Site & Equipment Monitoring | `products/remote-monitoring/site-equipment-monitoring/telecom-passive-infrastructure-monitoring/` |
| N047 | Base | ATM Monitoring | Remote Monitoring › Site & Equipment Monitoring | `products/remote-monitoring/site-equipment-monitoring/atm-monitoring/` |
| N030 | Base | Radar Tank Monitoring | Remote Monitoring › Tank & Fuel Monitoring | `products/remote-monitoring/tank-fuel-monitoring/radar-tank-monitoring/` |
| N031 | Base | Fuel Dispenser Monitoring | Remote Monitoring › Tank & Fuel Monitoring | `products/remote-monitoring/tank-fuel-monitoring/fuel-dispenser-monitoring/` |
| N033 | Base | AI Video Analytics | Remote Monitoring › Video Analytics | `products/remote-monitoring/video-analytics/ai-video-analytics/` |
| N019 | Base | GPS Asset Tracking | Tracking › Asset Tracking | `products/tracking/asset-tracking/gps-asset-tracking/` |
| N021 | Base | Indoor Asset Tracking | Tracking › Asset Tracking | `products/tracking/asset-tracking/indoor-asset-tracking/` |
| N020 | Edition | GPS ATM Tracking | Tracking › Asset Tracking › GPS Asset Tracking | `(inside its base) …/gps-atm-tracking/` |
| N003 | Standalone | Fleet Management | Tracking › Fleet & Transport | `products/tracking/fleet-transport/fleet-management/` |
| N004 | Base | GPS Vehicle Tracking | Tracking › Fleet & Transport | `products/tracking/fleet-transport/gps-vehicle-tracking/` |
| N008 | Base | GPS Dashcam | Tracking › Fleet & Transport | `products/tracking/fleet-transport/gps-dashcam/` |
| N010 | Base | GPS RFID Waste Monitoring | Tracking › Fleet & Transport | `products/tracking/fleet-transport/gps-rfid-waste-monitoring/` |
| N005 | Add-on | Fuel Monitoring | Tracking › Fleet & Transport › GPS Vehicle Tracking | `(inside parent GPS Vehicle Tracking)` |
| N006 | Add-on | Temperature Monitoring | Tracking › Fleet & Transport › GPS Vehicle Tracking | `(inside parent GPS Vehicle Tracking)` |
| N007 | Add-on | Weight Monitoring | Tracking › Fleet & Transport › GPS Vehicle Tracking | `(inside parent GPS Vehicle Tracking)` |
| N009 | Edition | GPS AIS 140 Solution (India) | Tracking › Fleet & Transport › GPS Vehicle Tracking | `(inside its base) …/gps-ais-140-solution-india/` |
| N044 | Add-on | AC Monitoring | Tracking › Fleet & Transport › GPS Vehicle Tracking | `(inside parent GPS Vehicle Tracking)` |
| N045 | Add-on | Seat Belt Monitoring | Tracking › Fleet & Transport › GPS Vehicle Tracking | `(inside parent GPS Vehicle Tracking)` |
| N011 | Base | GPS RFID School Bus | Tracking › Fleet & Transport › School Transport | `products/tracking/fleet-transport/school-transport/gps-rfid-school-bus/` |
| N017 | Base | SK MobiCop | Tracking › Fleet & Transport › School Transport | `products/tracking/fleet-transport/school-transport/sk-mobicop/` |
| N048 | Base | RFID Inventory Management | Tracking › Inventory & Gate Control (RFID) | `products/tracking/inventory-gate-control-rfid/rfid-inventory-management/` |
| N049 | Add-on | RFID Smart Gate | Tracking › Inventory & Gate Control (RFID) › RFID Inventory Management | `(inside parent RFID Inventory Management)` |
| N013 | Base | GPS Workforce Tracking | Tracking › People Tracking | `products/tracking/people-tracking/gps-workforce-tracking/` |
| N014 | Base | Indoor People Tracking | Tracking › People Tracking | `products/tracking/people-tracking/indoor-people-tracking/` |
| N016 | Base | MobiCop | Tracking › People Tracking | `products/tracking/people-tracking/mobicop/` |

Keep folder names in kebab-case. If the tree changes, update this table and move the folder in the same pull request.
