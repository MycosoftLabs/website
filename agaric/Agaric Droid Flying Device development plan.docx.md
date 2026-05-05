# Agaric (Myco Drone) Hardware Design & Marketing Plan

## Context and Objectives

Mycosoft’s devices such as **Mushroom One**, **SporeBase**, **MycoNode** and **Hyphae 1** rely on the **MycoBrain** controller, which offers a dual‑ESP32‑S3 processor, LoRa, Wi‑Fi and Bluetooth connectivity, and sensor I/O in a compact \~85 × 55 mm board. These devices span from portable **MycoNode** (\~450 g) to **Mushroom One**, a 4.5 kg edge‑compute sensor tower, and depend on LoRa mesh networking for data relay.

The new **Agaric** project (“Myco Drone”) will extend this ecosystem by providing **rapid aerial mobility**, **payload delivery/retrieval** and **wireless networking**. Inspired by the **Fly Agaric** mushroom, the drone will serve as a *flying hub* that can carry sensors to remote locations, deploy and recover Mycosoft devices, act as a data mule and relay node, and operate in diverse environments (forests, agricultural fields and coastal waters). Our design must compete with small consumer drones like DJI Air 3 (≈720 g, 46‑min flight time, USD $1,099[\[1\]](https://store.dji.com/product/dji-air-3#:~:text=USD%20%241%2C099)) and DJI Mini 4 Pro (\<249 g, 34–45‑min flight time, $759[\[2\]](https://store.dji.com/product/dji-mini-4-pro#:~:text=USD%20%24759)[\[3\]](https://store.dji.com/product/dji-mini-4-pro#:~:text=Weighing%20less%20than%20249%20g%2C,in%20most%20countries%20and%20regions)) while offering a *2 kg payload capacity* and the ruggedness of enterprise platforms such as DJI Matrice 350 RTK (55‑min flight time[\[4\]](https://enterprise.dji.com/matrice-350-rtk/specs#:~:text=%2A%20,Resistance); 2.7 kg payload[\[5\]](https://www.heliguy.com/blogs/posts/dji-drone-payload-compatibility-and-maximum-payload-capacity-guide/#:~:text=6%20kg)) and Matrice 400 (59‑min flight, 6 kg payload[\[6\]](https://www.dji.com/media-center/announcements/dji-release-matrice-400#:~:text=flagship%20drone%20platform,Matrice%20400%20can%20aid%20emergency)).

This plan describes the hardware architecture, software integration, manufacturing and distribution strategy, and marketing approach for Agaric. The design is aligned with the **MycoDRONE capability specification** from the mycobrain repository, which outlines mission profiles, mechanical dimensions, payload interfaces and MDP (Myco Device Protocol) extensions.

## Hardware Design

### Mechanical Architecture

| Feature | Specification / Rationale |
| :---- | :---- |
| **Airframe & size** | **Foldable quad‑copter or hex‑copter** frame with a **wheelbase of 600–650 mm**, as suggested by the MycoDRONE spec (550–700 mm range). Arms use lightweight **carbon‑fibre tubes** for rigidity, while the central fuselage and landing gear are **3D‑printed** from reinforced nylon/PA‑CF to enable rapid U.S. manufacture. The landing gear is high‑clearance to accommodate bulky payloads and uses quick‑release inserts. |
| **Thrust & motors** | A heavy‑lift drone should maintain a **thrust‑to‑weight ratio ≥2** to carry payloads and manoeuvre safely. General drone design literature notes that drones typically produce **1.5–2 times their total weight in thrust** and thus a 2 kg drone would require \~3 kg of thrust to carry a 1 kg payload[\[7\]](https://www.grepow.com/blog/how-to-choose-right-motors-and-propeller-for-different-drone-applications.html#:~:text=%E2%97%8FTotal%20Thrust%E2%89%A5Drone%20Weight%2BPayload%20Weight). For Agaric we target a **take‑off weight of \~4.5 kg** (including battery) and a **payload capacity of 2.0 kg**, implying total thrust \>13 kg. This can be achieved using **four or six 620–700 W brushless motors** with 15 – 17 inch propellers; modern 400–500 Kv motors provide \~3–3.5 kg thrust each at \~40 A, ensuring power margin and redundancy (hex‑copter variant). |
| **Battery & power** | **High‑capacity Li‑ion or Li‑polymer pack** (6 S 22.2 V, 15 000–20 000 mAh) to support 45–55 minutes of flight (comparable to DJI Mavic 3 Classic 46 min[\[8\]](https://www.dji.com/mavic-3-classic/specs#:~:text=) and Matrice 350 55 min[\[4\]](https://enterprise.dji.com/matrice-350-rtk/specs#:~:text=%2A%20,Resistance)). The battery is hot‑swappable and housed in a weather‑sealed bay. A DC‑DC converter powers the MycoBrain and payload. |
| **Payload interface (MicoLatch)** | The **MycoDRONE spec** describes a **MicoLatch** system—an underside lifting hook rated for **three times the maximum payload mass** and shaped to engage a recovery loop on Mushroom One, SporeBase or MycoNode. Agaric includes a winch (for later variants) enabling precise payload retrieval under canopy and on water. A top‑mounted sling/harness allows carrying multiple small devices simultaneously. |
| **Sensors & cameras** |  |
| \- **Navigation:** GNSS (GPS/Galileo/BeiDou) with RTK option for centimetre precision and magnetometer/IMU for attitude. |  |
| \- **Obstacle avoidance:** 360° vision system (stereo cameras and lidar modules) similar to high‑end drones to navigate forests and avoid branches. |  |
| \- **Environmental:** BME688 sensor (temperature, humidity, pressure, gas resistance) integrated into MycoBrain for air quality and gas sampling—this replicates the MycoDRONE spec’s requirement. |  |
| \- **Cameras:** 4K/60 fps forward camera with gimbal for high‑resolution imaging; downward‑facing camera for precision landing and visual fiducial detection; optional thermal camera for search missions. |  |
| **Communication antennas** | Separate **LoRa**, **Wi‑Fi (2.4 GHz/5 GHz)**, **Bluetooth 5**, and optional **satellite (Iridium/Swarm)** antennas. LoRa provides long‑range (up to 10 km) mesh connectivity similar to MycoBrain’s LoRa transceiver. Wi‑Fi/BLE support high‑rate data offload when near a device, while satellite ensures connectivity beyond cellular coverage. Antenna placements minimize interference: LoRa whip at the rear, patch antennas on arms for Wi‑Fi/BLE, and satellite puck on top. |
| **Environmental robustness** | The airframe uses sealed electronics and conformal‑coated PCBs for **IP55** ingress protection and operating temperature of **–20 °C to 45 °C**, allowing operation in rain, dust and marine environments. |
| **Mesh docking station (MycoDock)** | A ground station with a fiducial marker, charging pads for battery and payload devices, and data backhaul. Agaric can land autonomously on MycoDock, transfer data via high‑bandwidth Wi‑Fi, and swap payloads. |

### Flight Controller and On‑Board Computing

1. **Autopilot** – Agaric uses a **Pixhawk 6X or Cube Orange** flight controller running **ArduPilot** or **PX4** firmware. These controllers support **MAVLink** communications, GPS/RTK, advanced flight modes (waypoints, precision landing) and can interface with companion computers.

2. **MycoBrain Mission Computer** – The drone integrates a **MycoBrain** board as the **mission computer**. It handles LoRa/Bluetooth/Wi‑Fi communications, environmental sensing, payload control, and mission logic. The board connects to the autopilot via a UART running **MAVLink**, as implemented in mavlink\_bridge.cpp and mavlink\_bridge.h in the mycobrain repository. The bridge sets up a UART connection, processes MAVLink messages, stores telemetry (e.g., GPS coordinates, battery level) in a drone\_telemetry\_v1\_t structure, and provides functions to send commands (e.g., return‑to‑land, go‑to waypoint)[\[9\]](https://github.com/MycosoftLabs/mycobrain/blob/main/firmware/features/mycodrone/mavlink_bridge.cpp#L13-L82)[\[10\]](https://github.com/MycosoftLabs/mycobrain/blob/main/firmware/features/mycodrone/mavlink_bridge.h#L12-L25).

3. **Flight Software** – On boot, the Pixhawk handles low‑level stabilization and executes waypoints, while the MycoBrain runs mission agents through **NatureOS**. Mission agents send MDP commands such as CMD\_DRONE\_START\_MISSION, CMD\_DRONE\_DEPLOY\_PAYLOAD, or CMD\_DRONE\_RETRIEVE\_PAYLOAD (defined in the mdp\_drone\_types.h and MDP spec) and receive telemetry via MDP\_DRONE\_TELEMETRY messages[\[11\]](https://github.com/MycosoftLabs/mycobrain/blob/main/docs/features/IMPLEMENTATION_SUMMARY.md#L97-L145). The **MycoBrain** publishes telemetry and mission status to MINDEX for real‑time tracking. Firmware changes to MycoBrain added support for these messages and for MAVLink bridging to the autopilot[\[12\]](https://github.com/MycosoftLabs/mycobrain/blob/main/docs/features/IMPLEMENTATION_COMPLETE.md#L29-L37).

4. **Autonomy & Mission Phases** – Mission logic is implemented in MAS (Multi‑Agent System) modules. Phase 1 supports GPS waypoint navigation and manual override; Phase 2 adds precision landing via fiducials and winch retrieval; Phase 3 introduces autonomous forest navigation and obstacle avoidance using lidar and vision sensors. Mission profiles include:

5. **Deploying devices**: fly to the target location, locate fiducial/IR beacon on Mushroom One or SporeBase, descend, release via MicoLatch, then return or continue mission.

6. **Retrieving devices**: use LoRa beacons from the device to triangulate, hover overhead, lower winch, latch onto loop, then reel up and return to base.

7. **Data‑mule flight**: fly near multiple devices, collect telemetry and data (e.g., mycology sensor datasets) via Wi‑Fi/BLE, compress and forward to a MycoDock or Hyphae 1 station, then return to low‑power LoRa mode.

8. **Ocean support**: hover over a **Psathyrella** buoy, relay LoRa signals to and from sea‑based sensors, and extend the mesh network across water.

### Payload Integration

Agaric must carry various Mycosoft devices; thus we need multiple payload versions:

| Payload | Weight (approx.) | Integration features |
| :---- | :---- | :---- |
| **MycoNode** | \~450 g | attaches using a single hook; drone can carry multiple nodes (up to 2–4). |
| **ALARM sensor** | 128 g smoke detector | can be delivered to a site or used as airborne sensor for smoke detection. |
| **SporeBase** | \~0.6–1 kg (device with sampling mechanism) | attaches via MicoLatch and can be retrieved or deployed. |
| **Mushroom One** | \~4.5 kg (including 30×30×100 cm tower) | requires the heavy‑lift variant with winch; used for field retrieval or redeployment. |
| **Hyphae 1** or **Tricorder** | 350–500 g | used for on‑the‑fly analysis; can be attached on top for live scanning. |

The heavy‑lift variant (hex‑copter) can carry a **payload up to 2 kg** (Mushroom One base weight \~1.2 kg plus packaging). The standard quad‑copter variant is optimized for **\<500 g** payloads like SporeBase and multiple MycoNodes.

## Manufacturing & Distribution Plan

### Materials and Fabrication

1. **3D Printing** – Use high‑strength **PA‑CF (Nylon with Carbon fibre)** or **PETG‑CF** filaments for fuselage and payload housings. In‑house additive manufacturing allows quick iteration and customization. Non‑structural components such as antenna covers and sensor mounts are printed as needed, reducing tooling costs.

2. **Carbon‑Fibre Composites** – Arms and load‑bearing components are machined or wrapped from carbon‑fibre tubes. This ensures high stiffness/weight ratio and vibration damping, akin to professional drones.

3. **Electronics Assembly** – The **MycoBrain** boards and autopilot modules are assembled at Mycosoft’s domestic manufacturing facility. Board modifications include adding a UART connector for the flight controller and additional 5 V regulators. Antenna connectors (U.FL to SMA) are integrated for LoRa, Wi‑Fi/BLE and satellite modules.

4. **Supply Chain** – Source critical components (motors, batteries, autopilot boards) from U.S. or NDAA‑compliant suppliers where possible. Use **on‑shoring** or **near‑shoring** for manufacturing to meet growing demand for American‑made drones and comply with potential federal procurement rules (NDAA)[\[13\]](https://www.thedroneu.com/blog/american-made-drones/#:~:text=In%20professional%20and%20government%20contexts%2C,alone%20does%20not%20determine%20compliance). Build relationships with U.S. battery and composite manufacturers to reduce reliance on foreign supply chains.

### Manufacturing Phases

1. **Prototype (Quarter 1)** – Rapid prototyping using 3D‑printed frames and off‑the‑shelf motors to validate the MicoLatch, payload retrieval and MAVLink integration. Conduct bench tests, tethered flights, and ground retrieval tests as outlined in the MycoDRONE test plan.

2. **Beta Production (Quarter 2)** – Produce 10–20 units for field trials with early adopters (research partners, internal device teams). Collect telemetry and refine mission agents, sensors, and retrieval mechanisms. Conduct endurance testing (flight time, payload weight) and verify LoRa/Wi‑Fi range.

3. **Pilot Manufacturing (Quarter 3)** – Establish domestic assembly line for frames, electronics, and battery packs. Standardize quality control for carbon‑fibre arms and 3D‑printed parts. Achieve manufacturing rate of 50 units per month.

4. **Full‑Scale Production (Quarter 4)** – Ramp up production to 200 units per month across three variants (light, medium and heavy). Use injection‑molded or composite parts for cost reduction where volume justifies tooling. Expand manufacturing partnerships for motors and autopilot boards.

### Distribution Strategy

* **Direct‑to‑Customer** – Sell light and medium variants through Mycosoft’s website and authorized dealers. Provide consumer‑friendly packaging and training materials.

* **Enterprise & Government** – Engage with agriculture, forestry, environmental monitoring, emergency services and defense sectors that require NDAA‑compliant platforms. Offer custom payload integration and compliance documentation.

* **Subscription & Leasing** – Offer leasing programs with Hyphae 1 base stations and service/maintenance contracts to encourage adoption by organizations without large capital budgets.

* **Support & Training** – Provide training courses for mission planning using NatureOS and on‑site maintenance packages. Offer remote diagnostics via LoRa telemetry.

## Marketing Plan

### Product Line & Positioning

Agaric will be offered in **three variants**:

| Variant | Target mission | Key specs | Expected price (USD) |
| :---- | :---- | :---- | :---- |
| **Agaric Mini** | Consumer/researchers | \< 249 g (FAA registration exempt), 4K/60 fps camera, 34–40 min flight time similar to DJI Mini 4 Pro; LoRa/Wi‑Fi/BLE connectivity for **mesh telemetry**; can carry small MycoNode or ALARM sensors (\< 100 g). | \~$799 (competitive with Mini 4 Pro $759[\[2\]](https://store.dji.com/product/dji-mini-4-pro#:~:text=USD%20%24759)) |
| **Agaric Standard** | Prosumer/enterprise | 800 g take‑off weight, payload capacity 500 g, 46‑min flight time comparable to DJI Air 3 and Mavic 3 Classic; integrated LoRa/Wi‑Fi/BLE and optional satellite; supports **deploy/retrieve** missions for SporeBase and multiple MycoNodes. | \~$1,299 (DJI Air 3 base price $1,099[\[1\]](https://store.dji.com/product/dji-air-3#:~:text=USD%20%241%2C099); Mavic 3 Classic $1,279[\[14\]](https://store.dji.com/product/dji-mavic-3-classic#:~:text=USD%20%241%2C279)) |
| **Agaric Heavy‑Lift** | Industrial/military | 4.5 kg take‑off weight, **2 kg payload capacity**, 50 min flight time; winch retrieval system; redundant power; IP55 weather sealing; LoRa/Wi‑Fi/BLE/Sat; capable of carrying **Mushroom One** or multiple SporeBases; exceeds Matrice 350’s 2.7 kg payload limit[\[5\]](https://www.heliguy.com/blogs/posts/dji-drone-payload-compatibility-and-maximum-payload-capacity-guide/#:~:text=6%20kg) and matches Matrice 400’s 6 kg payload when configured for 6‑rotor variant[\[6\]](https://www.dji.com/media-center/announcements/dji-release-matrice-400#:~:text=flagship%20drone%20platform,Matrice%20400%20can%20aid%20emergency). | Starting at $2,999; far below Matrice 350 and Matrice 400 enterprise pricing (\> $12,000) |

### Branding and Messaging

1. **Name & Story** – The name **Agaric** pays homage to the **Fly Agaric** mushroom and aligns with the mycological theme of Mycosoft. It conveys organic integration within the ecosystem and hints at flight.

2. **Unique Selling Points**:

3. **Integrated Mesh Network** – Only drone in its class with built‑in **LoRa**, **Wi‑Fi**, **Bluetooth** and **optional satellite** connectivity. Acts as a flying gateway, enabling real‑time monitoring and data collection for Mycosoft devices.

4. **Modular Payload & Retrieval** – Compatible with **MicoLatch** for safe deployment and retrieval of Mushroom One, SporeBase, MycoNode and other payloads. The winch system and high‑clearance landing gear allow operations under canopy and in rough terrain.

5. **Rugged & NDAA‑Ready** – Designed for **U.S. manufacturing**, using domestic supply chains and NDAA‑compliant components[\[13\]](https://www.thedroneu.com/blog/american-made-drones/#:~:text=In%20professional%20and%20government%20contexts%2C,alone%20does%20not%20determine%20compliance). IP55 sealing and all‑weather operation outclass consumer drones that are limited to light winds.

6. **Open‑Source & Ecosystem Integration** – Runs on open ArduPilot/PX4 firmware with **MAVLink** support and open connectors. The MycoBrain board enables **NatureOS** integration, MAS agents and MINDEX data logging, offering developers the flexibility to create custom missions.

7. **Cost‑Effective** – Under‑cuts enterprise drones like DJI Matrice by leveraging 3D printing, local assembly and modular design, while offering comparable flight times (46–55 min).

8. **Marketing Channels** – Use Mycosoft’s web platform, targeted social media campaigns (LinkedIn, Twitter, research forums), trade shows (AgTech, environmental monitoring, defense), and partnerships with universities and open‑source communities. Provide demonstration videos showing Agaric deploying and retrieving Mushroom One in a forest, performing data‑mule flights across a farm, and assisting search‑and‑rescue.

9. **Community Engagement** – Encourage developers to contribute mission agents, payload modules and 3D printable accessories via Mycosoft’s GitHub repositories. Host hackathons and competitions to build swarm behaviours (multi‑drone cooperation).

10. **Compliance & Certification** – Emphasise compliance with FAA Part 107 (including remote ID), NDAA and Blue UAS requirements for government contracts. Offer training modules for Part 107 certification.

### Competitive Analysis and Differentiation

* **Consumer Drones (DJI Mini 4 Pro/Air 3)** – These drones offer excellent cameras but limited payload capacity (\<0.5 kg) and lack modular communication systems. Mini 4 Pro weighs under 249 g and has 34–45 min flight time[\[2\]](https://store.dji.com/product/dji-mini-4-pro#:~:text=USD%20%24759)[\[3\]](https://store.dji.com/product/dji-mini-4-pro#:~:text=Weighing%20less%20than%20249%20g%2C,in%20most%20countries%20and%20regions); Air 3 offers 720 g take‑off weight and 46‑min flight time[\[15\]](https://www.dji.com/air-3/specs#:~:text=%2A%20). **Agaric Mini** competes on flight time and price while adding LoRa/BLE/mesh capabilities.

* **Prosumer Drones (DJI Mavic 3 Classic / Air 3)** – Mavic 3 Classic has 46‑min flight time and costs $1,279[\[8\]](https://www.dji.com/mavic-3-classic/specs#:~:text=)[\[16\]](https://store.dji.com/product/dji-mavic-3-classic#:~:text=USD%20%241%2C279); Air 3 costs $1,099 and offers similar flight time[\[1\]](https://store.dji.com/product/dji-air-3#:~:text=USD%20%241%2C099). These drones can only carry \~100–200 g of payload (as evidenced by Mavic 3 Enterprise’s 135 g limit[\[17\]](https://www.heliguy.com/blogs/posts/dji-drone-payload-compatibility-and-maximum-payload-capacity-guide/#:~:text=Sniffer4D%20Nano2%20TDLAS%20Methane%20Detection,for%20DJI%20Dock%202)). **Agaric Standard** matches flight times and price while carrying 0.5 kg and providing mission‑computer functionality.

* **Enterprise Drones (DJI Matrice 30/350/400)** – Matrice 30 carries only 0.3 kg[\[18\]](https://www.heliguy.com/blogs/posts/dji-drone-payload-compatibility-and-maximum-payload-capacity-guide/#:~:text=DJI%20Matrice%2030%20Series), Matrice 350 carries 2.7 kg with 55‑min flight time[\[4\]](https://enterprise.dji.com/matrice-350-rtk/specs#:~:text=%2A%20,Resistance)[\[5\]](https://www.heliguy.com/blogs/posts/dji-drone-payload-compatibility-and-maximum-payload-capacity-guide/#:~:text=6%20kg), and the new Matrice 400 has 59‑min flight time and 6 kg payload[\[6\]](https://www.dji.com/media-center/announcements/dji-release-matrice-400#:~:text=flagship%20drone%20platform,Matrice%20400%20can%20aid%20emergency). However, these systems cost $10k–$30k and rely on proprietary ecosystems. **Agaric Heavy‑Lift** targets a 2 kg payload with 50 min flight time at \~$3k, making it accessible for research and smaller operations.

* **American‑Made Drones (Freefly, Skydio)** – The market is shifting towards NDAA‑compliant drones; the U.S. drone market is projected to reach **$31.34 billion by 2034**, partly due to organizations moving away from foreign‑made systems[\[13\]](https://www.thedroneu.com/blog/american-made-drones/#:~:text=In%20professional%20and%20government%20contexts%2C,alone%20does%20not%20determine%20compliance). Agaric’s domestic manufacturing and open‑source approach position it to capture this growing market.

## Conclusion

The **Agaric** drone line extends Mycosoft’s product ecosystem by providing an aerial platform that is **modular**, **rugged**, **open‑source**, and **domestically manufactured**. Leveraging the **MycoBrain** mission computer and MAVLink bridge, Agaric can autonomously deploy and retrieve sensors, collect telemetry, and serve as a flying mesh node. By offering three variants tailored to consumer, prosumer and industrial markets, Agaric competes with DJI’s Mini/Mavic/Matrice drones on flight time and price while surpassing them with **payload capacity**, **mesh networking**, and **NDAA‑ready manufacturing**. The marketing strategy emphasises synergy with existing Mycosoft devices, open development, and compliance, positioning Agaric as an essential component of modern environmental sensing and aerial deployment missions.

---

[\[1\]](https://store.dji.com/product/dji-air-3#:~:text=USD%20%241%2C099) Buy DJI Air 3 \- DJI Store

[https://store.dji.com/product/dji-air-3](https://store.dji.com/product/dji-air-3)

[\[2\]](https://store.dji.com/product/dji-mini-4-pro#:~:text=USD%20%24759) [\[3\]](https://store.dji.com/product/dji-mini-4-pro#:~:text=Weighing%20less%20than%20249%20g%2C,in%20most%20countries%20and%20regions) Buy DJI Mini 4 Pro \- All-in-One Mini Camera Drone

[https://store.dji.com/product/dji-mini-4-pro](https://store.dji.com/product/dji-mini-4-pro)

[\[4\]](https://enterprise.dji.com/matrice-350-rtk/specs#:~:text=%2A%20,Resistance) Matrice 350 RTK \- Specs \- DJI

[https://enterprise.dji.com/matrice-350-rtk/specs](https://enterprise.dji.com/matrice-350-rtk/specs)

[\[5\]](https://www.heliguy.com/blogs/posts/dji-drone-payload-compatibility-and-maximum-payload-capacity-guide/#:~:text=6%20kg) [\[17\]](https://www.heliguy.com/blogs/posts/dji-drone-payload-compatibility-and-maximum-payload-capacity-guide/#:~:text=Sniffer4D%20Nano2%20TDLAS%20Methane%20Detection,for%20DJI%20Dock%202) [\[18\]](https://www.heliguy.com/blogs/posts/dji-drone-payload-compatibility-and-maximum-payload-capacity-guide/#:~:text=DJI%20Matrice%2030%20Series) DJI drone payload compatibility and maximum payload capacity guide

[https://www.heliguy.com/blogs/posts/dji-drone-payload-compatibility-and-maximum-payload-capacity-guide/](https://www.heliguy.com/blogs/posts/dji-drone-payload-compatibility-and-maximum-payload-capacity-guide/)

[\[6\]](https://www.dji.com/media-center/announcements/dji-release-matrice-400#:~:text=flagship%20drone%20platform,Matrice%20400%20can%20aid%20emergency) DJI Matrice 400 Sets New Standard for Intelligent and Efficient Long-Endurance Aerial Missions \- DJI United States

[https://www.dji.com/media-center/announcements/dji-release-matrice-400](https://www.dji.com/media-center/announcements/dji-release-matrice-400)

[\[7\]](https://www.grepow.com/blog/how-to-choose-right-motors-and-propeller-for-different-drone-applications.html#:~:text=%E2%97%8FTotal%20Thrust%E2%89%A5Drone%20Weight%2BPayload%20Weight) Relationship Between Drone Payload And Motor Thrust | Grepow

[https://www.grepow.com/blog/how-to-choose-right-motors-and-propeller-for-different-drone-applications.html](https://www.grepow.com/blog/how-to-choose-right-motors-and-propeller-for-different-drone-applications.html)

[\[8\]](https://www.dji.com/mavic-3-classic/specs#:~:text=) DJI Mavic 3 Classic \- Specs \- DJI

[https://www.dji.com/mavic-3-classic/specs](https://www.dji.com/mavic-3-classic/specs)

[\[9\]](https://github.com/MycosoftLabs/mycobrain/blob/main/firmware/features/mycodrone/mavlink_bridge.cpp#L13-L82) mavlink\_bridge.cpp

[https://github.com/MycosoftLabs/mycobrain/blob/main/firmware/features/mycodrone/mavlink\_bridge.cpp](https://github.com/MycosoftLabs/mycobrain/blob/main/firmware/features/mycodrone/mavlink_bridge.cpp)

[\[10\]](https://github.com/MycosoftLabs/mycobrain/blob/main/firmware/features/mycodrone/mavlink_bridge.h#L12-L25) mavlink\_bridge.h

[https://github.com/MycosoftLabs/mycobrain/blob/main/firmware/features/mycodrone/mavlink\_bridge.h](https://github.com/MycosoftLabs/mycobrain/blob/main/firmware/features/mycodrone/mavlink_bridge.h)

[\[11\]](https://github.com/MycosoftLabs/mycobrain/blob/main/docs/features/IMPLEMENTATION_SUMMARY.md#L97-L145) IMPLEMENTATION\_SUMMARY.md

[https://github.com/MycosoftLabs/mycobrain/blob/main/docs/features/IMPLEMENTATION\_SUMMARY.md](https://github.com/MycosoftLabs/mycobrain/blob/main/docs/features/IMPLEMENTATION_SUMMARY.md)

[\[12\]](https://github.com/MycosoftLabs/mycobrain/blob/main/docs/features/IMPLEMENTATION_COMPLETE.md#L29-L37) IMPLEMENTATION\_COMPLETE.md

[https://github.com/MycosoftLabs/mycobrain/blob/main/docs/features/IMPLEMENTATION\_COMPLETE.md](https://github.com/MycosoftLabs/mycobrain/blob/main/docs/features/IMPLEMENTATION_COMPLETE.md)

[\[13\]](https://www.thedroneu.com/blog/american-made-drones/#:~:text=In%20professional%20and%20government%20contexts%2C,alone%20does%20not%20determine%20compliance) American Made Drones (2026): Best NDAA-Compliant U.S. Drones

[https://www.thedroneu.com/blog/american-made-drones/](https://www.thedroneu.com/blog/american-made-drones/)

[\[14\]](https://store.dji.com/product/dji-mavic-3-classic#:~:text=USD%20%241%2C279) [\[16\]](https://store.dji.com/product/dji-mavic-3-classic#:~:text=USD%20%241%2C279) Buy DJI Mavic 3 Classic \- DJI Store

[https://store.dji.com/product/dji-mavic-3-classic](https://store.dji.com/product/dji-mavic-3-classic)

[\[15\]](https://www.dji.com/air-3/specs#:~:text=%2A%20) DJI Air 3 \- Specs \- DJI

[https://www.dji.com/air-3/specs](https://www.dji.com/air-3/specs)