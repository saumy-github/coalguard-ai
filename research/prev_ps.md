> **Last updated:** 2026-08-26 · 
**Status:** HISTORICAL / REFERENCE ONLY — pre-lock-in strategic research, not actionable design content

what were the last year PS from , ministry of coal

Based on the official Smart India Hackathon archives, the Ministry of Coal has been highly active in the last few editions. Their problem statements consistently focus on Smart Automation, safety management, and heavy industrial IoT integration.

Here are the exact Problem Statements (PS) issued by the Ministry of Coal in the previous two SIH editions:

🚀 SIH 2024 (Last Edition)
In 2024, the Ministry of Coal released a mix of software and hardware challenges heavily focused on sustainability and operational management:

PS SIH1645 (Software): An app and web-based software for Productivity and Safety Management of coal mines. (Theme: Smart Automation)

PS SIH1644 (Software): A web application specifically designed for Indian coal mines to quantify their carbon footprint and explore pathways to carbon neutrality. (Theme: Renewable / Sustainable Energy)

PS SIH1646 (Software): App-based project monitoring of S&T (Science & Technology) / R&D Projects of Coal. (Theme: Smart Automation)

PS SIH1557 (Hardware/IIoT): Development of a Tyre Maintenance and Operation App, including the fitment of necessary IIoT (Industrial IoT) related hardware in heavy dumpers. (Theme: Smart Automation)

🚀 SIH 2023
In 2023, the focus was slightly more aligned with logistics and geospatial analytics:

PS SIH1319 (Software): Forecasting and scheduling of railway rakes. A digital platform/algorithm to maintain the updated status of coal stock in sidings online to prevent demurrage charges. (Theme: Smart Automation)

PS SIH1318 (Software): Analytics based on Govt. Land Information System (GLIS) Data to transform geospatial land ownership and boundary data into actionable insights. (Theme: Agriculture, FoodTech & Rural Development)

💡 Strategic Takeaway for Your SIH 2026 Project (PS 26024)
Looking at the past trajectory, your current choice for 2026—PS 26024: AI-Based Smart Governance and Compliance Monitoring System for Coal Mines—is a direct evolution of their 2024 PS SIH1645 (Productivity and safety management).

This proves two critical things for your strategy:

They love dashboards: The Ministry of Coal wants enterprise-grade management portals, not basic student apps.

Hardware simulation wins: In 2024, they explicitly asked for IIoT hardware integration (like dumper tyre sensors). This perfectly validates our earlier idea to stream fake real-time IoT sensor data (via WebSockets) into your 2026 compliance dashboard to blow the evaluators away!

2025

Ah, you caught the missing year! Here are the exact problem statements released by the Ministry of Coal for SIH 2025.

This is actually the most crucial piece of intel for your 2026 strategy, because it shows exactly what the Ministry was experimenting with right before they released your current PS 26024.

🚀 SIH 2025 (Ministry of Coal)
In 2025, the Ministry shifted heavily into AI evaluation and worker safety tracking. Here is what they asked for:

PS SIH25180 (Software): AI/ML based Auto Evaluation of R&D proposals received at NaCCER, CMPDI Ranchi. (Theme: Smart Automation)

PS SIH25181 (Software): Intelligent Mobile Safety Companion for Mine Workers. (Theme: Smart Education)

PS SIH25182 (Hardware): Smart PPE Compliance Monitoring and Reporting System for Underground Coal Mines. (Theme: Smart Automation)

💡 The Massive Strategic Insight for PS 26024
Look closely at the evolution from 2025 to 2026.

In 2025, they asked for a Mobile Safety Companion (SIH25181) and PPE Compliance Monitoring (SIH25182) as completely separate projects.
In 2026, for your PS 26024 (Smart Governance and Compliance), they have essentially combined all of these operational pieces into one ultimate enterprise system!

This confirms exactly what you need to emphasize to win:

The Mobile App Integration: Your solution must include the geo-tagged field-reporting mobile app feature (an evolution of their 2025 Safety Companion).

The Computer Vision PPE Scanner: We previously discussed adding a YOLOv8 PPE (hardhat/vest) scanner to your 2026 dashboard. Because they explicitly asked for PPE monitoring in 2025, if you simulate this CV feature in your 2026 software prototype, the CMPDI judges will instantly recognize that you understand their long-term safety roadmap.

---

1. For the Real-Time IoT Dashboard
From: Hariprajwal/sih_coalMine & Ashwin-Dev-P/smart_india_hackathon

What to steal: Their WebSocket data ingestion logic on the frontend. Look at how they handle the state when a constant stream of telemetry (gas, temp) hits the frontend without causing React to re-render the entire page and freeze.
Application: We will use a similar approach in our frontend/src/pages/Dashboard.jsx to parse the simulated JSON payloads coming from our FastAPI WebSocket endpoint.
2. For the GIS Spatial Mapping
From: amansharma1916/Green-Atlas

What to steal: Their react-leaflet integration. Look specifically at how they draw interactive polygons (boundaries) and plot markers dynamically based on database coordinates.
Application: We will use this exact technique to draw the "Environmental Clearance (EC) Boundary Lines" on our satellite map, and drop hazard pins when the IoT sensors detect methane spikes.
3. For the UI / Frontend Shell (Save massive time here!)
From: kunalkeshan/eVault-SIH-2023 & Your own repo (vedantchalke36/sih-2026-problem-statements)

What to steal: You already built a dark-mode shadcn/ui application! Do not start from scratch. We should copy your components/ui/ folder (buttons, cards, tables, navigation menus) directly into our new sih26/frontend/src/components/ folder.
Application: Use your existing dark-theme UI for the Corporate Management View. Use the eVault repo as a reference for how to structure secure document uploads (for when inspectors upload photo proof of resolved tickets).
4. For the Blockchain Integration
From: Aniket-Kumar-Paul/Blockchain-powered-immutable-legal-records-ledger

What to steal: Look at how they bridge their web backend to their Solidity smart contracts using Web3 libraries.
Application: This validates our architecture.md plan perfectly. We will use web3.py in our FastAPI backend to mirror how they sent data to the blockchain ledger, ensuring our CAPA tickets are tamper-proof.
5. For the Computer Vision (YOLOv8)
The 2025 PS (SIH25182) specifically asked for PPE Compliance Monitoring.

Strategic move: Since we have the ai_engine folder set up, we will run a pre-trained YOLOv8 model that scans video streams for hardhats and high-vis vests. We don't necessarily need to train it from scratch; we can use ultralytics' base models or a Kaggle coal-mine PPE dataset to get a working prototype fast.