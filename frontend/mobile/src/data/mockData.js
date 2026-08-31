export const DEMO_USERS = {
  field_worker: {
    id: 'usr_wrk_4081',
    name: 'Rahul Kumar Soren',
    employeeId: 'WRK-4081',
    role: 'field_worker',
    roleTitle: 'Field Worker',
    designation: 'Underground Operations & Strata Control',
    organization: 'Bharat Coking Coal Limited (BCCL)',
    mineAssigned: 'Moonidih Coal Mine, Dhanbad',
    department: 'Underground Operations',
    badgeNumber: 'BCCL-UG-9921',
    shift: 'Shift A (06:00 - 14:00 IST)',
    status: 'deployed'
  },
  safety_officer: {
    id: 'usr_mso_7820',
    name: 'abc_name',
    employeeId: 'MSO-7820',
    role: 'safety_officer',
    roleTitle: 'Mine Safety Officer',
    designation: 'Pit-Head Safety Command & Ventilation',
    organization: 'Eastern Coalfields Limited (ECL)',
    mineAssigned: 'Sector 7G Pit-Head, Raniganj Coalfield',
    department: 'Mine Safety & Rescue',
    badgeNumber: 'DGMS-CERT-MSO-412',
    shift: 'General Safety Command',
    status: 'active'
  },
  corporate_management: {
    id: 'usr_corp_1092',
    name: 'Vikramaditya Sharma',
    employeeId: 'CORP-1092',
    role: 'corporate_management',
    roleTitle: 'Corporate Executive',
    designation: 'Enterprise Mining Strategy & ESG Governance',
    organization: 'Coal India Limited (HQ)',
    department: 'Enterprise Intelligence & Sustainability',
    badgeNumber: 'CIL-EXEC-0048',
    status: 'active'
  },
  regulatory_authority: {
    id: 'usr_reg_9914',
    name: 'Dr. Rajeshwar Prasad Rao',
    employeeId: 'REG-9914',
    role: 'regulatory_authority',
    roleTitle: 'DGMS Regulatory Director',
    designation: 'Directorate General of Mines Safety',
    organization: 'DGMS, Ministry of Labour & Employment',
    department: 'Eastern Zone Regulatory Audit',
    badgeNumber: 'DGMS-GOI-INSP-88',
    status: 'active'
  },
  system_admin: {
    id: 'usr_adm_0010',
    name: 'Arjun Singhal',
    employeeId: 'ADM-0010',
    role: 'system_admin',
    roleTitle: 'System Administrator',
    designation: 'System Infrastructure & Security',
    organization: 'CoalGuard AI Core Systems',
    department: 'Infrastructure & Safety Network',
    badgeNumber: 'ROOT-SEC-01',
    status: 'active'
  },
  sih_evaluator: {
    id: 'usr_sih_2026',
    name: 'SIH Evaluator',
    employeeId: 'SIH-EVAL-2026',
    role: 'sih_evaluator',
    roleTitle: 'SIH Evaluator',
    designation: 'Grand Finale Evaluation Panel',
    organization: 'Ministry of Coal & AICTE',
    department: 'Evaluation Panelist',
    badgeNumber: 'SIH-JURY-2026',
    status: 'active'
  }
};

export const OPERATING_MINES = [
  {
    id: 'mine-01',
    name: 'Sector 7G Deep Coalfield',
    state: 'West Bengal',
    district: 'Raniganj / Asansol',
    subsidiary: 'ECL',
    type: 'Underground',
    complianceScore: 94.2,
    activeWorkers: 342,
    dailyProductionTons: 4200,
    monthlyEcLimitTons: 135000,
    riskIndex: 28,
    openIncidents: 2,
    dgmsStatus: 'Safe & Certified',
    coordinates: { x: 74, y: 48, lat: 23.618, lng: 86.974 }
  },
  {
    id: 'mine-02',
    name: 'Moonidih Deep Seam Mine',
    state: 'Jharkhand',
    district: 'Dhanbad (Jharia Coalfield)',
    subsidiary: 'BCCL',
    type: 'Underground',
    complianceScore: 88.5,
    activeWorkers: 512,
    dailyProductionTons: 5800,
    monthlyEcLimitTons: 180000,
    riskIndex: 44,
    openIncidents: 4,
    dgmsStatus: 'Active Monitoring',
    coordinates: { x: 70, y: 46, lat: 23.743, lng: 86.353 }
  },
  {
    id: 'mine-03',
    name: 'Gevra Mega Opencast Project',
    state: 'Chhattisgarh',
    district: 'Korba',
    subsidiary: 'SECL',
    type: 'Opencast',
    complianceScore: 96.8,
    activeWorkers: 820,
    dailyProductionTons: 14500,
    monthlyEcLimitTons: 450000,
    riskIndex: 18,
    openIncidents: 1,
    dgmsStatus: 'Safe & Certified',
    coordinates: { x: 58, y: 56, lat: 22.359, lng: 82.684 }
  },
  {
    id: 'mine-04',
    name: 'Nigahi Super Pit Project',
    state: 'Madhya Pradesh',
    district: 'Singrauli',
    subsidiary: 'NCL',
    type: 'Opencast',
    complianceScore: 91.0,
    activeWorkers: 640,
    dailyProductionTons: 11200,
    monthlyEcLimitTons: 350000,
    riskIndex: 32,
    openIncidents: 3,
    dgmsStatus: 'Inspection Scheduled',
    coordinates: { x: 54, y: 42, lat: 24.116, lng: 82.618 }
  },
  {
    id: 'mine-05',
    name: 'Bhubaneswari OCP',
    state: 'Odisha',
    district: 'Talcher / Angul',
    subsidiary: 'MCL',
    type: 'Opencast',
    complianceScore: 92.7,
    activeWorkers: 490,
    dailyProductionTons: 8900,
    monthlyEcLimitTons: 280000,
    riskIndex: 25,
    openIncidents: 1,
    dgmsStatus: 'Safe & Certified',
    coordinates: { x: 68, y: 62, lat: 20.950, lng: 85.216 }
  },
  {
    id: 'mine-06',
    name: 'Umrer Open Pit Complex',
    state: 'Maharashtra',
    district: 'Nagpur',
    subsidiary: 'WCL',
    type: 'Opencast',
    complianceScore: 84.6,
    activeWorkers: 380,
    dailyProductionTons: 3900,
    monthlyEcLimitTons: 120000,
    riskIndex: 58,
    openIncidents: 5,
    dgmsStatus: 'Notice Issued',
    coordinates: { x: 44, y: 58, lat: 20.854, lng: 79.324 }
  },
  {
    id: 'mine-07',
    name: 'North Karanpura Sub-Seam',
    state: 'Jharkhand',
    district: 'Ranchi / Hazaribagh',
    subsidiary: 'CCL',
    type: 'Mixed',
    complianceScore: 89.1,
    activeWorkers: 430,
    dailyProductionTons: 4700,
    monthlyEcLimitTons: 150000,
    riskIndex: 38,
    openIncidents: 2,
    dgmsStatus: 'Safe & Certified',
    coordinates: { x: 67, y: 47, lat: 23.824, lng: 85.129 }
  },
  {
    id: 'mine-08',
    name: 'Dipka Heavy Seam Mine',
    state: 'Chhattisgarh',
    district: 'Korba West',
    subsidiary: 'SECL',
    type: 'Opencast',
    complianceScore: 95.1,
    activeWorkers: 710,
    dailyProductionTons: 12800,
    monthlyEcLimitTons: 400000,
    riskIndex: 21,
    openIncidents: 1,
    dgmsStatus: 'Safe & Certified',
    coordinates: { x: 59, y: 55, lat: 22.316, lng: 82.567 }
  }
];

export const LIVE_SENSORS = [
  {
    id: 'sns-01',
    mineId: 'mine-01',
    sensorTag: 'SN-7G-CH4-04',
    location: 'Shaft 3, Seam IV (Face 4B South)',
    level: 'Sub-Level -320m',
    type: 'Methane (CH4) Sensor',
    methaneLEL: 1.42, // Elevated (> 1.25% warning limit)
    carbonMonoxidePPM: 38,
    oxygenPercent: 20.1,
    dustPM10: 420,
    temperatureC: 29.8,
    humidityPercent: 78,
    ventilationVelocityMS: 0.92,
    strataPressureKPa: 1420,
    batteryPercent: 94,
    status: 'warning',
    lastPing: 'Just now'
  },
  {
    id: 'sns-02',
    mineId: 'mine-01',
    sensorTag: 'SN-7G-AIR-08',
    location: 'Main Return Airway Incline #2',
    level: 'Level -150m',
    type: 'Air Quality & Velocity Sensor',
    methaneLEL: 0.45,
    carbonMonoxidePPM: 12,
    oxygenPercent: 20.8,
    dustPM10: 180,
    temperatureC: 26.2,
    humidityPercent: 64,
    ventilationVelocityMS: 2.15,
    strataPressureKPa: 980,
    batteryPercent: 88,
    status: 'optimal',
    lastPing: '2s ago'
  },
  {
    id: 'sns-03',
    mineId: 'mine-01',
    sensorTag: 'SN-7G-STR-12',
    location: 'Longwall Retreat Panel 9 (Roof Support)',
    level: 'Sub-Level -320m',
    type: 'Roof Strata Pressure Sensor',
    methaneLEL: 0.62,
    carbonMonoxidePPM: 19,
    oxygenPercent: 20.4,
    dustPM10: 510,
    temperatureC: 31.4,
    humidityPercent: 82,
    ventilationVelocityMS: 0.68,
    strataPressureKPa: 1940,
    batteryPercent: 76,
    status: 'warning',
    lastPing: '5s ago'
  },
  {
    id: 'sns-04',
    mineId: 'mine-01',
    sensorTag: 'SN-7G-ENV-01',
    location: 'Surface Intake Fan House',
    level: 'Surface (Level 0m)',
    type: 'Surface Air Intake Monitor',
    methaneLEL: 0.02,
    carbonMonoxidePPM: 2,
    oxygenPercent: 20.95,
    dustPM10: 84,
    temperatureC: 24.5,
    humidityPercent: 55,
    ventilationVelocityMS: 5.40,
    strataPressureKPa: 101,
    batteryPercent: 100,
    status: 'optimal',
    lastPing: '1s ago'
  },
  {
    id: 'sns-05',
    mineId: 'mine-01',
    sensorTag: 'SN-7G-GAS-19',
    location: 'Seam V Goaf Isolation Seal #3',
    level: 'Sub-Level -450m',
    type: 'Toxic Gas Multi-Sensor',
    methaneLEL: 0.88,
    carbonMonoxidePPM: 48,
    oxygenPercent: 19.6,
    dustPM10: 290,
    temperatureC: 33.1,
    humidityPercent: 86,
    ventilationVelocityMS: 0.45,
    strataPressureKPa: 1680,
    batteryPercent: 82,
    status: 'warning',
    lastPing: '8s ago'
  }
];

export const INITIAL_TICKETS = [
  {
    id: 'TCK-2026-8941',
    title: 'High Methane Level in Face 4B Return Incline',
    description: 'Sensor SN-7G-CH4-04 recorded methane at 1.42% (safe limit is below 1.25%). AI suggests adjusting auxiliary airflow and checking coal face area.',
    category: 'Gas Leakage',
    severity: 'critical',
    status: 'action_required',
    mineId: 'mine-01',
    mineName: 'Sector 7G Deep Coalfield',
    location: 'Shaft 3, Seam IV, Sub-Level -320m',
    reportedBy: 'Automatic Sensor Alert (SN-7G-CH4-04)',
    assignedTo: 'Mine Safety Officer (Command)',
    createdAt: '18 mins ago',
    dgmsRegulationRef: 'Coal Mines Regulations (CMR) 2017, Regulation 169 (Gas Safety)',
    aiSuggestedAction: '1. Pause machinery power at Face 4B.\n2. Increase auxiliary fan booster speed.\n3. Move workers to the fresh air base at Crosscut 9.\n4. Take manual gas readings before restarting work.',
    ledgerHash: 'REC-0x8f4d92a1c8340ef2b7719d3809cb9f3a',
    sensorAnomaly: {
      parameter: 'Methane Concentration (CH4)',
      reading: '1.42%',
      threshold: '1.25% (Safety Limit)'
    }
  },
  {
    id: 'TCK-2026-8938',
    title: 'Roof Support Pressure Alert on Longwall 9',
    description: 'Roof pressure sensor logged load increase to 1,940 kPa on Support PRS-24. Requires visual check and reinforcement if needed.',
    category: 'Roof & Strata',
    severity: 'high',
    status: 'in_investigation',
    mineId: 'mine-01',
    mineName: 'Sector 7G Deep Coalfield',
    location: 'Longwall Panel 9 (Sub-Level -320m)',
    reportedBy: 'Strata Sensor Network',
    assignedTo: 'Field Specialist Team',
    createdAt: '1 hour ago',
    dgmsRegulationRef: 'CMR 2017 Reg 123 (Systematic Support Rules)',
    aiSuggestedAction: 'Inspect roof extensometers between supports 22 and 26. Install additional roof bolts if movement exceeds 15mm.',
    ledgerHash: 'REC-0x3a7e4b9f01826cd34e568f9a012bc345'
  },
  {
    id: 'TCK-2026-8920',
    title: 'Dust Level Exceedance at Main Conveyor Transfer',
    description: 'Dust monitor measured 510 ug/m3 during peak haulage. Water spray nozzle showed low pressure.',
    category: 'Dust & Air Quality',
    severity: 'medium',
    status: 'resolved',
    mineId: 'mine-01',
    mineName: 'Sector 7G Deep Coalfield',
    location: 'Conveyor Line C-4',
    reportedBy: 'Air Quality Sensor',
    assignedTo: 'Maintenance Lead',
    createdAt: '4 hours ago',
    resolvedAt: '1 hour ago',
    dgmsRegulationRef: 'CMR 2017 Reg 143 (Dust Suppression)',
    aiSuggestedAction: 'Clean and adjust water spray nozzles. Ensure line pressure is above 3.5 bar.',
    correctiveActionTaken: 'Cleaned spray nozzles and restored water pressure. Dust level dropped to normal (164 ug/m3). Verified by supervisor.',
    ledgerHash: 'REC-0x99e21ac458d92ef0134bca889701cd44'
  },
  {
    id: 'TCK-2026-8915',
    title: 'Scheduled Electrical Safety Check Completed',
    description: 'Routine 7-day electrical enclosure check on continuous miner unit CM-02.',
    category: 'Electrical Safety',
    severity: 'low',
    status: 'verified_closed',
    mineId: 'mine-01',
    mineName: 'Sector 7G Deep Coalfield',
    location: 'Shaft 2 Workshop Bay',
    reportedBy: 'Safety Schedule',
    assignedTo: 'Electrical Safety Team',
    createdAt: '1 day ago',
    resolvedAt: '6 hours ago',
    dgmsRegulationRef: 'Central Electricity Authority Regulation 107',
    aiSuggestedAction: 'Check enclosure gap measurements (< 0.5mm) and log in safety register.',
    correctiveActionTaken: 'Gap test measured 0.28mm (well within safe limit). Safety stamp verified.',
    ledgerHash: 'REC-0x77aa88bb99cc00dd11ee22ff33aa44bb'
  }
];

export const INITIAL_AUDIT_TRAIL = [
  {
    blockNumber: 4892,
    timestamp: 'Today, 10:14 AM',
    action: 'High Methane Alert Recorded',
    actor: 'Automatic Sensor Node #4',
    actorRole: 'Safety System',
    targetId: 'TCK-2026-8941',
    details: 'Methane level 1.42% detected at Face 4B. Emergency safety ticket created and officer notified.',
    verified: true
  },
  {
    blockNumber: 4891,
    timestamp: 'Today, 09:30 AM',
    action: 'Corrective Action Completed',
    actor: 'Maintenance Lead',
    actorRole: 'Field Maintenance',
    targetId: 'TCK-2026-8920',
    details: 'Dust spray nozzles cleaned. Dust level normalized from 510 to 164 ug/m3.',
    verified: true
  },
  {
    blockNumber: 4890,
    timestamp: 'Today, 08:15 AM',
    action: 'Quarterly Safety Audit Completed',
    actor: 'DGMS Inspection Officer',
    actorRole: 'Regulatory Inspector',
    targetId: 'AUDIT-DGMS-EZ-14',
    details: 'Subterranean ventilation and emergency escapeway inspection completed. Overall score: 94.2%.',
    verified: true
  },
  {
    blockNumber: 4889,
    timestamp: 'Today, 06:00 AM',
    action: 'Morning Shift Check-In Confirmed',
    actor: 'Safety Officer',
    actorRole: 'Mine Safety Command',
    targetId: 'SHIFT-20260330-A',
    details: 'Shift A commenced. 342 workers logged underground with active safety tags and gas detectors.',
    verified: true
  }
];

export const INITIAL_INSPECTIONS = [
  {
    id: 'INSP-2026-041',
    mineId: 'mine-01',
    mineName: 'Sector 7G Deep Coalfield',
    location: 'Underground Level -320m (Shaft 3 Area)',
    inspectorName: 'abc_name',
    inspectorRole: 'Mine Safety Officer',
    date: '30 March 2026',
    shift: 'Shift A',
    status: 'conditional',
    score: 87,
    items: [
      { title: 'Air speed at or above 0.5 m/s at work point', regulation: 'Reg 156 CMR 2017', status: 'pass' },
      { title: 'Gas detectors calibrated within last 30 days', regulation: 'Reg 169 CMR 2017', status: 'pass' },
      { title: 'Roof displacement below 10mm safety limit', regulation: 'Reg 123 Strata Code', status: 'fail', notes: 'Support PRS-24 showing 12.8mm roof movement' },
      { title: 'Emergency refuge chamber oxygen cylinders at full pressure', regulation: 'Reg 175 Emergency Rules', status: 'pass' },
      { title: 'Stone dust barriers installed properly along roadways', regulation: 'Reg 146 Dust Protection', status: 'pass' }
    ],
    syncStatus: 'synced'
  },
  {
    id: 'INSP-2026-040',
    mineId: 'mine-01',
    mineName: 'Sector 7G Deep Coalfield',
    location: 'Surface Pit-Head & Winding Engine House',
    inspectorName: 'Rahul Kumar Soren',
    inspectorRole: 'Field Specialist Lead',
    date: '29 March 2026',
    shift: 'Shift B',
    status: 'passed',
    score: 98,
    items: [
      { title: 'Winding rope safety inspection log checked', regulation: 'Reg 84 Winding Engine Rules', status: 'pass' },
      { title: 'Over-speed and emergency brakes functional', regulation: 'Reg 86 Safety Devices', status: 'pass' },
      { title: 'Worker safety gear check passed before entry', regulation: 'DGMS Safety Rules', status: 'pass' }
    ],
    syncStatus: 'synced'
  }
];

export const AI_KNOWLEDGE_BASE = [
  {
    id: 'rag-01',
    query: 'What is the required safety action when methane (CH4) exceeds 1.25% in an underground coal mine?',
    regulationCited: 'Coal Mines Regulations (CMR) 2017, Regulation 169 & Regulation 156',
    dgmsActClause: 'CMR Regulation 169(1)(a): If flammable gas exceeds 1.25% in the air, all persons must immediately leave the affected area.',
    riskAssessment: 'High Risk. Methane concentrations between 5% and 15% can ignite. The 1.25% rule provides an essential early safety margin.',
    actionProtocol: [
      'Turn off non-essential electrical equipment in the area immediately.',
      'Withdraw workers to the designated Fresh Air Station.',
      'Send a certified safety officer with a gas detector to inspect the area.',
      'Adjust air ventilation doors to increase fresh air supply.'
    ],
    confidence: 99.4,
    retrievalSource: 'DGMS Coal Mines Regulations 2017'
  },
  {
    id: 'rag-02',
    query: 'What are the maximum allowed limits for respirable coal dust in mine air?',
    regulationCited: 'Coal Mines Regulations 2017, Regulation 143 (Control of Mine Dust)',
    dgmsActClause: 'Reg 143(3): The concentration of respirable dust in the work area must not exceed 2.0 mg/m3.',
    riskAssessment: 'Health and Safety Hazard. High dust causes respiratory issues over time and poses an explosion risk if left unchecked.',
    actionProtocol: [
      'Activate high-pressure water mist sprays at coal transfer points.',
      'Apply stone dust along roadways to prevent dust buildup.',
      'Ensure all drillers and operators wear proper dust masks.'
    ],
    confidence: 98.7,
    retrievalSource: 'DGMS Technical Guidelines on Dust Control'
  },
  {
    id: 'rag-03',
    query: 'How often must electrical flameproof equipment be inspected in underground mines?',
    regulationCited: 'Central Electricity Authority Regulations, Regulation 107 & CMR Reg 178',
    dgmsActClause: 'All flameproof electrical equipment in hazardous underground zones must be inspected at least once every 7 days by an authorized supervisor.',
    riskAssessment: 'Moderate to High Risk. Damaged casing can allow internal electrical sparks to reach surrounding air.',
    actionProtocol: [
      'Measure casing gap using a feeler gauge (must be under 0.5mm).',
      'Verify all casing bolts are tight and secure.',
      'Record the inspection in the electrical safety register.'
    ],
    confidence: 99.1,
    retrievalSource: 'DGMS & CEA Electrical Safety Code'
  }
];

export const WORKER_TASKS = [
  {
    id: 'tsk-01',
    title: 'Pre-Shift Gas Detector Calibration',
    location: 'Pit-Head Lamp Room',
    dueTime: '06:30 AM',
    status: 'completed',
    priority: 'high',
    desc: 'Verify handheld methanometer zero calibration and battery level.'
  },
  {
    id: 'tsk-02',
    title: 'Roof Support Inspection at Face 4B',
    location: 'Sub-Level -320m, Seam IV',
    dueTime: '08:00 AM',
    status: 'in_progress',
    priority: 'high',
    desc: 'Check tell-tale extensometers between support 22 and 26 for any movement.'
  },
  {
    id: 'tsk-03',
    title: 'Water Spray Line Pressure Check',
    location: 'Conveyor Trunk Line C-4',
    dueTime: '11:00 AM',
    status: 'pending',
    priority: 'medium',
    desc: 'Ensure water mist nozzles are spraying continuously and line pressure > 3.5 bar.'
  },
  {
    id: 'tsk-04',
    title: 'Emergency Escape Way Walkthrough',
    location: 'Incline Airway #2',
    dueTime: '01:00 PM',
    status: 'pending',
    priority: 'low',
    desc: 'Confirm escape route lighting, directional arrows, and clear walkway.'
  }
];

export const NOTIFICATIONS_DATA = [
  {
    id: 'notif-01',
    title: 'Gas Level Warning - Face 4B',
    message: 'Methane level rose to 1.42%. Auxiliary ventilation speed has been increased.',
    time: '18m ago',
    type: 'warning',
    unread: true
  },
  {
    id: 'notif-02',
    title: 'Shift A Turnover Confirmed',
    message: '342 personnel clocked into Sector 7G underground with active safety tags.',
    time: '4h ago',
    type: 'info',
    unread: false
  },
  {
    id: 'notif-03',
    title: 'Monthly Safety Certificate Renewed',
    message: 'DGMS compliance index confirmed at 94.2% for Sector 7G Deep Coalfield.',
    time: '1d ago',
    type: 'success',
    unread: false
  }
];
