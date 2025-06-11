import { useState, useEffect, useRef } from 'react';
import { initializeApp, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

// Simple Graph Component
const Graph = ({ data, label, color, maxValue }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = height - (height * (i / 5));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Add y-axis labels
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText((maxValue * (i / 5)).toFixed(0), 5, y - 5);
    }
    
    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const dataPoints = Math.min(data.length, 30); // Show at most 30 points
    const step = width / (dataPoints - 1);
    
    for (let i = 0; i < dataPoints; i++) {
      const x = i * step;
      const y = height - (height * (data[data.length - dataPoints + i] / maxValue));
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = color;
    for (let i = 0; i < dataPoints; i++) {
      const x = i * step;
      const y = height - (height * (data[data.length - dataPoints + i] / maxValue));
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add label
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, width / 2, 15);
    
  }, [data, label, color, maxValue]);
  
  return (
    <canvas ref={canvasRef} width={300} height={150} className="graph-canvas"></canvas>
  );
};

// Main Dashboard Component
export default function Dashboard() {
  // State for machine data
  const [machineData, setMachineData] = useState({
    rpm: 0,
    vibration: 0,
    status: "Standby"
  });
  
  // History for graphs
  const [rpmHistory, setRpmHistory] = useState([0]);
  const [vibrationHistory, setVibrationHistory] = useState([0]);
  
  // State for connection status
  const [isConnected, setIsConnected] = useState(false);
  
  // State for popup visibility
  const [popupVisible, setPopupVisible] = useState(false);
  const [activeLogic, setActiveLogic] = useState(null);
  
  // New state for vibration analysis results
  const [vibrationAnalysis, setVibrationAnalysis] = useState(null);
  
  // Reference to store Firebase database
  const dbRef = useRef(null);

  // Firebase configuration
  useEffect(() => {
  try {
    // Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyAhLCi6JBT5ELkAFxTplKBBDdRdpATzQxI",
      authDomain: "smart-medicine-vending-machine.firebaseapp.com",
      databaseURL: "https://smart-medicine-vending-machine-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "smart-medicine-vending-machine",
      storageBucket: "smart-medicine-vending-machine.firebasestore.app",
      messagingSenderId: "705021997077",
      appId: "1:705021997077:web:5af9ec0b267e597e1d5e1c",
      measurementId: "G-PH0XLJSYVS"
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);
    
    // Store database reference in dbRef
    dbRef.current = database;

    // Store database reference globally (optional, remove if not needed)
    window.firebaseApp = app;
    window.firebaseDatabase = database;

    // Test database connection
    console.log("Firebase initialized, testing connection...");
    const testRef = ref(database, '.info/connected');
    const unsubscribeConnection = onValue(testRef, (snapshot) => {
      const connected = snapshot.val();
      console.log("Firebase connection status:", connected ? "connected" : "disconnected");
      setIsConnected(connected === true);
    });

    // Set up real-time listener for the Fuzzy Logic data
    const fuzzyLogicRef = ref(database, '7_Fuzzy_Logic');
    const unsubscribeData = onValue(
      fuzzyLogicRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          console.log("Received data from Firebase:", data);
          setMachineData({
            rpm: data.rpm || 0,
            vibration: data.vibration || 0,
            status: data.status || "Standby"
          });

          // Update history
          setRpmHistory((prev) => [...prev, data.rpm || 0].slice(-50));
          setVibrationHistory((prev) => [...prev, data.vibration || 0].slice(-50));

          setIsConnected(true);
        }
      },
      (error) => {
        console.error("Database error:", error);
        setIsConnected(false);
      }
    );

    // Clean up listeners on component unmount
    return () => {
      console.log("Cleaning up Firebase listeners");
      unsubscribeConnection();
      unsubscribeData();
    };
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    setIsConnected(false);

    // Fall back to simulation mode for demo purposes
    const simulateDataUpdates = () => {
      const randomRpm = Math.floor(Math.random() * 100);
      const randomVibration = Math.floor(Math.random() * 50);

      setMachineData((prevData) => ({
        ...prevData,
        rpm: randomRpm,
        vibration: randomVibration,
        status: "SIMULATION MODE"
      }));

      setRpmHistory((prev) => [...prev, randomRpm].slice(-50));
      setVibrationHistory((prev) => [...prev, randomVibration].slice(-50));
    };

    // Initial data
    simulateDataUpdates();

    // Update data every 3 seconds for the demo
    const intervalId = setInterval(simulateDataUpdates, 3000);

    // Clean up on unmount
    return () => clearInterval(intervalId);
  }
}, []);
  // Fuzzy logic definitions with implementation details
  const fuzzyLogics = [
    {
      id: 1,
      name: "Fuzzy Logic1",
      description: "This fuzzy logic algorithm monitors vibration levels and classifies them as 'Normal', 'Warning', or 'Critical' based on adaptive thresholds. It adjusts sensitivity based on current RPM to account for normal operational vibrations at different speeds.",
      logic: `// Fuzzy Sets Definition
const vibrationLevels = {
  low: (v) => v <= 10 ? 1 : v <= 20 ? (20-v)/10 : 0,
  medium: (v) => v <= 10 ? 0 : v <= 20 ? (v-10)/10 : v <= 30 ? (30-v)/10 : 0,
  high: (v) => v <= 20 ? 0 : v <= 30 ? (v-20)/10 : 1
};

const rpmLevels = {
  slow: (r) => r <= 30 ? 1 : r <= 60 ? (60-r)/30 : 0,
  moderate: (r) => r <= 30 ? 0 : r <= 60 ? (r-30)/30 : r <= 90 ? (90-r)/30 : 0,
  fast: (r) => r <= 60 ? 0 : r <= 90 ? (r-60)/30 : 1
};

// Fuzzy Rules
function applyRules(vibration, rpm) {
  // Calculate membership values
  const vibMembership = {
    low: vibrationLevels.low(vibration),
    medium: vibrationLevels.medium(vibration),
    high: vibrationLevels.high(vibration)
  };
  
  const rpmMembership = {
    slow: rpmLevels.slow(rpm),
    moderate: rpmLevels.moderate(rpm),
    fast: rpmLevels.fast(rpm)
  };
  
  // Rule 1: IF vibration is low AND rpm is slow THEN status is normal
  const rule1 = Math.min(vibMembership.low, rpmMembership.slow);
  
  // Rule 2: IF vibration is medium AND rpm is slow THEN status is warning
  const rule2 = Math.min(vibMembership.medium, rpmMembership.slow);
  
  // Rule 3: IF vibration is high THEN status is critical
  const rule3 = vibMembership.high;
  
  // Rule 4: IF vibration is medium AND rpm is moderate THEN status is warning
  const rule4 = Math.min(vibMembership.medium, rpmMembership.moderate);
  
  // Rule 5: IF vibration is medium AND rpm is fast THEN status is normal
  const rule5 = Math.min(vibMembership.medium, rpmMembership.fast);
  
  // Defuzzification (simplified centroid method)
  const normalScore = Math.max(rule1, rule5);
  const warningScore = Math.max(rule2, rule4);
  const criticalScore = rule3;
  
  // Return status with highest score
  if (criticalScore > warningScore && criticalScore > normalScore) {
    return "CRITICAL";
  } else if (warningScore > normalScore) {
    return "WARNING";
  } else {
    return "NORMAL";
  }
}`
    },
    {
      id: 2,
      name: "Fuzzy Logic2",
      description: "This fuzzy logic controller maintains optimal motor speed (RPM) for different dispensing operations. It gradually adjusts RPM based on current vibration levels to find the sweet spot between speed and smoothness.",
      logic: `// Fuzzy Sets for Input Variables
const vibrationLevel = {
  low: (v) => v <= 10 ? 1 : v <= 20 ? (20-v)/10 : 0,
  medium: (v) => v <= 10 ? 0 : v <= 20 ? (v-10)/10 : v <= 30 ? (30-v)/10 : 0,
  high: (v) => v <= 20 ? 0 : v <= 30 ? (v-20)/10 : 1
};

const currentRpm = {
  slow: (r) => r <= 30 ? 1 : r <= 50 ? (50-r)/20 : 0,
  medium: (r) => r <= 30 ? 0 : r <= 50 ? (r-30)/20 : r <= 70 ? (70-r)/20 : 0,
  fast: (r) => r <= 50 ? 0 : r <= 70 ? (r-50)/20 : 1
};

// Fuzzy Sets for Output Variable (Optimal RPM Adjustment)
const rpmAdjustment = {
  decreaseLarge: -20,
  decreaseSmall: -10,
  maintain: 0,
  increaseSmall: 10,
  increaseLarge: 20
};

// Fuzzy Rules
function adjustRpm(vibration, rpm) {
  // Calculate membership values
  const vibMembership = {
    low: vibrationLevel.low(vibration),
    medium: vibrationLevel.medium(vibration),
    high: vibrationLevel.high(vibration)
  };
  
  const rpmMembership = {
    slow: currentRpm.slow(rpm),
    medium: currentRpm.medium(rpm),
    fast: currentRpm.fast(rpm)
  };
  
  // Rules
  const rules = [
    // Rule 1: IF vibration is low AND rpm is slow THEN increaseLarge
    { condition: Math.min(vibMembership.low, rpmMembership.slow), output: rpmAdjustment.increaseLarge },
    // Rule 2: IF vibration is low AND rpm is medium THEN increaseSmall
    { condition: Math.min(vibMembership.low, rpmMembership.medium), output: rpmAdjustment.increaseSmall },
    // Rule 3: IF vibration is medium THEN maintain
    { condition: vibMembership.medium, output: rpmAdjustment.maintain },
    // Rule 4: IF vibration is high AND rpm is fast THEN decreaseLarge
    { condition: Math.min(vibMembership.high, rpmMembership.fast), output: rpmAdjustment.decreaseLarge },
    // Rule 5: IF vibration is high AND rpm is medium THEN decreaseSmall
    { condition: Math.min(vibMembership.high, rpmMembership.medium), output: rpmAdjustment.decreaseSmall }
  ];
  
  // Defuzzification (weighted average)
  let numerator = 0;
  let denominator = 0;
  
  rules.forEach(rule => {
    if (rule.condition > 0) {
      numerator += rule.condition * rule.output;
      denominator += rule.condition;
    }
  });
  
  const adjustment = denominator === 0 ? 0 : Math.round(numerator / denominator);
  const newRpm = Math.max(0, Math.min(100, rpm + adjustment));
  
  return {
    adjustment: adjustment,
    newRpm: newRpm
  };
}`
    },
    {
      id: 3,
      name: "Fuzzy Logic3",
      description: "This fuzzy logic system analyzes patterns in vibration signatures at different RPM levels to predict component wear and potential mechanical failures before they cause system disruption.",
      logic: `// Fuzzy Sets for Input Variables
const vibrationLevel = {
  normal: (v) => v <= 15 ? 1 : v <= 25 ? (25-v)/10 : 0,
  elevated: (v) => v <= 15 ? 0 : v <= 25 ? (v-15)/10 : v <= 35 ? (35-v)/10 : 0,
  critical: (v) => v <= 25 ? 0 : v <= 35 ? (v-25)/10 : 1
};

const rpmLevel = {
  low: (r) => r <= 30 ? 1 : r <= 50 ? (50-r)/20 : 0,
  medium: (r) => r <= 30 ? 0 : r <= 50 ? (r-30)/20 : r <= 70 ? (70-r)/20 : 0,
  high: (r) => r <= 50 ? 0 : r <= 70 ? (r-50)/20 : 1
};

// Fuzzy Sets for Output Variable (Wear Risk)
const wearRisk = {
  low: 0,
  moderate: 50,
  high: 100
};

// Fuzzy Rules
function predictWear(vibration, rpm) {
  // Calculate membership values
  const vibMembership = {
    normal: vibrationLevel.normal(vibration),
    elevated: vibrationLevel.elevated(vibration),
    critical: vibrationLevel.critical(vibration)
  };
  
  const rpmMembership = {
    low: rpmLevel.low(rpm),
    medium: rpmLevel.medium(rpm),
    high: rpmLevel.high(rpm)
  };
  
  // Rules
  const rules = [
    // Rule 1: IF vibration is normal THEN wear is low
    { condition: vibMembership.normal, output: wearRisk.low },
    // Rule 2: IF vibration is elevated AND rpm is low THEN wear is moderate
    { condition: Math.min(vibMembership.elevated, rpmMembership.low), output: wearRisk.moderate },
    // Rule 3: IF vibration is elevated AND rpm is high THEN wear is high
    { condition: Math.min(vibMembership.elevated, rpmMembership.high), output: wearRisk.high },
    // Rule 4: IF vibration is critical THEN wear is high
    { condition: vibMembership.critical, output: wearRisk.high }
  ];
  
  // Defuzzification (weighted average)
  let numerator = 0;
  let denominator = 0;
  
  rules.forEach(rule => {
    if (rule.condition > 0) {
      numerator += rule.condition * rule.output;
      denominator += rule.condition;
    }
  });
  
  const riskScore = denominator === 0 ? 0 : Math.round(numerator / denominator);
  
  return {
    riskScore: riskScore,
    riskLevel: riskScore <= 25 ? "Low" : riskScore <= 75 ? "Moderate" : "High"
  };
}`
    },
    {
      id: 4,
      name: "Fuzzy Logic4",
      description: "This fuzzy logic algorithm detects conditions that may lead to motor stalling by monitoring sudden changes in RPM and vibration patterns. It proactively reduces load or increases power to prevent stalls.",
      logic: `// Fuzzy Sets for Input Variables
const rpmChange = {
  stable: (d) => d <= 5 ? 1 : d <= 15 ? (15-d)/10 : 0,
  moderate: (d) => d <= 5 ? 0 : d <= 15 ? (d-5)/10 : d <= 25 ? (25-d)/10 : 0,
  sharp: (d) => d <= 15 ? 0 : d <= 25 ? (d-15)/10 : 1
};

const vibrationLevel = {
  low: (v) => v <= 10 ? 1 : v <= 20 ? (20-v)/10 : 0,
  medium: (v) => v <= 10 ? 0 : v <= 20 ? (v-10)/10 : v <= 30 ? (30-v)/10 : 0,
  high: (v) => v <= 20 ? 0 : v <= 30 ? (v-20)/10 : 1
};

// Fuzzy Sets for Output Variable (Action)
const action = {
  none: 0,
  reduceLoad: 1,
  increasePower: 2
};

// Fuzzy Rules
function preventStall(rpmDelta, vibration) {
  // Calculate membership values
  const rpmDeltaMembership = {
    stable: rpmChange.stable(rpmDelta),
    moderate: rpmChange.moderate(rpmDelta),
    sharp: rpmChange.sharp(rpmDelta)
  };
  
  const vibMembership = {
    low: vibrationLevel.low(vibration),
    medium: vibrationLevel.medium(vibration),
    high: vibrationLevel.high(vibration)
  };
  
  // Rules
  const rules = [
    // Rule 1: IF rpm change is stable THEN no action
    { condition: rpmDeltaMembership.stable, output: action.none },
    // Rule 2: IF rpm change is moderate AND vibration is medium THEN reduce load
    { condition: Math.min(rpmDeltaMembership.moderate, vibMembership.medium), output: action.reduceLoad },
    // Rule 3: IF rpm change is sharp AND vibration is high THEN increase power
    { condition: Math.min(rpmDeltaMembership.sharp, vibMembership.high), output: action.increasePower },
    // Rule 4: IF vibration is high THEN reduce load
    { condition: vibMembership.high, output: action.reduceLoad }
  ];
  
  // Defuzzification (max membership)
  const maxCondition = Math.max(...rules.map(rule => rule.condition));
  const activeRule = rules.find(rule => rule.condition === maxCondition);
  
  return {
    action: activeRule.output === 0 ? "None" : activeRule.output === 1 ? "Reduce Load" : "Increase Power",
    confidence: maxCondition
  };
}`
    },
    {
      id: 5,
      name: "Fuzzy Logic5",
      description: "This fuzzy logic module dynamically adjusts the machine's dampening systems based on current vibration amplitude and frequency. It applies appropriate counterforces at different RPM levels to minimize overall vibration.",
      logic: `// Fuzzy Sets for Input Variables
const vibrationAmplitude = {
  low: (v) => v <= 10 ? 1 : v <= 20 ? (20-v)/10 : 0,
  medium: (v) => v <= 10 ? 0 : v <= 20 ? (v-10)/10 : v <= 30 ? (30-v)/10 : 0,
  high: (v) => v <= 20 ? 0 : v <= 30 ? (v-20)/10 : 1
};

const rpmLevel = {
  low: (r) => r <= 30 ? 1 : r <= 50 ? (50-r)/20 : 0,
  medium: (r) => r <= 30 ? 0 : r <= 50 ? (r-30)/20 : r <= 70 ? (70-r)/20 : 0,
  high: (r) => r <= 50 ? 0 : r <= 70 ? (r-50)/20 : 1
};

// Fuzzy Sets for Output Variable (Dampening Force)
const dampeningForce = {
  low: 10,
  medium: 50,
  high: 100
};

// Fuzzy Rules
function adjustDampening(vibration, rpm) {
  // Calculate membership values
  const vibMembership = {
    low: vibrationAmplitude.low(vibration),
    medium: vibrationAmplitude.medium(vibration),
    high: vibrationAmplitude.high(vibration)
  };
  
  const rpmMembership = {
    low: rpmLevel.low(rpm),
    medium: rpmLevel.medium(rpm),
    high: rpmLevel.high(rpm)
  };
  
  // Rules
  const rules = [
    // Rule 1: IF vibration is low THEN dampening is low
    { condition: vibMembership.low, output: dampeningForce.low },
    // Rule 2: IF vibration is medium AND rpm is low THEN dampening is medium
    { condition: Math.min(vibMembership.medium, rpmMembership.low), output: dampeningForce.medium },
    // Rule 3: IF vibration is medium AND rpm is high THEN dampening is high
    { condition: Math.min(vibMembership.medium, rpmMembership.high), output: dampeningForce.high },
    // Rule 4: IF vibration is high THEN dampening is high
    { condition: vibMembership.high, output: dampeningForce.high }
  ];
  
  // Defuzzification (weighted average)
  let numerator = 0;
  let denominator = 0;
  
  rules.forEach(rule => {
    if (rule.condition > 0) {
      numerator += rule.condition * rule.output;
      denominator += rule.condition;
    }
  });
  
  const force = denominator === 0 ? 10 : Math.round(numerator / denominator);
  
  return {
    dampeningForce: force,
    forceLevel: force <= 30 ? "Low" : force <= 70 ? "Medium" : "High"
  };
}`
    },
    {
      id: 6,
      name: "Fuzzy Logic6",
      description: "This fuzzy logic system automatically selects between 'High Speed', 'Balanced', or 'Low Vibration' operation modes based on current performance metrics and historical RPM-to-vibration ratio data.",
      logic: `// Fuzzy Sets for Input Variables
const vibrationLevel = {
  low: (v) => v <= 10 ? 1 : v <= 20 ? (20-v)/10 : 0,
  medium: (v) => v <= 10 ? 0 : v <= 20 ? (v-10)/10 : v <= 30 ? (30-v)/10 : 0,
  high: (v) => v <= 20 ? 0 : v <= 30 ? (v-20)/10 : 1
};

const rpmVibrationRatio = {
  low: (r) => r <= 0.5 ? 1 : r <= 1 ? (1-r)/0.5 : 0,
  medium: (r) => r <= 0.5 ? 0 : r <= 1 ? (r-0.5)/0.5 : r <= 1.5 ? (1.5-r)/0.5 : 0,
  high: (r) => r <= 1 ? 0 : r <= 1.5 ? (r-1)/0.5 : 1
};

// Fuzzy Sets for Output Variable (Operation Mode)
const operationMode = {
  highSpeed: 0,
  balanced: 1,
  lowVibration: 2
};

// Fuzzy Rules
function selectMode(vibration, ratio) {
  // Calculate membership values
  const vibMembership = {
    low: vibrationLevel.low(vibration),
    medium: vibrationLevel.medium(vibration),
    high: vibrationLevel.high(vibration)
  };
  
  const ratioMembership = {
    low: rpmVibrationRatio.low(ratio),
    medium: rpmVibrationRatio.medium(ratio),
    high: rpmVibrationRatio.high(ratio)
  };
  
  // Rules
  const rules = [
    // Rule 1: IF vibration is low AND ratio is low THEN highSpeed
    { condition: Math.min(vibMembership.low, ratioMembership.low), output: operationMode.highSpeed },
    // Rule 2: IF vibration is medium THEN balanced
    { condition: vibMembership.medium, output: operationMode.balanced },
    // Rule 3: IF vibration is high OR ratio is high THEN lowVibration
    { condition: Math.max(vibMembership.high, ratioMembership.high), output: operationMode.lowVibration }
  ];
  
  // Defuzzification (max membership)
  const maxCondition = Math.max(...rules.map(rule => rule.condition));
  const activeRule = rules.find(rule => rule.condition === maxCondition);
  
  return {
    mode: activeRule.output === 0 ? "High Speed" : activeRule.output === 1 ? "Balanced" : "Low Vibration",
    confidence: maxCondition
  };
}`
    },
    {
      id: 7,
      name: "Fuzzy Logic7",
      description: "This fuzzy logic algorithm identifies unusual relationships between RPM and vibration that don't follow established patterns, potentially indicating foreign objects, mechanical issues, or tampering attempts.",
      logic: `// Fuzzy Sets for Input Variables
const rpmVibrationRatio = {
  normal: (r) => r <= 0.5 ? 1 : r <= 1 ? (1-r)/0.5 : 0,
  elevated: (r) => r <= 0.5 ? 0 : r <= 1 ? (r-0.5)/0.5 : r <= 1.5 ? (1.5-r)/0.5 : 0,
  abnormal: (r) => r <= 1 ? 0 : r <= 1.5 ? (r-1)/0.5 : 1
};

const vibrationChange = {
  stable: (d) => d <= 5 ? 1 : d <= 10 ? (10-d)/5 : 0,
  moderate: (d) => d <= 5 ? 0 : d <= 10 ? (d-5)/5 : d <= 15 ? (15-d)/5 : 0,
  sharp: (d) => d <= 10 ? 0 : d <= 15 ? (d-10)/5 : 1
};

// Fuzzy Sets for Output Variable (Anomaly Score)
const anomalyScore = {
  low: 0,
  moderate: 50,
  high: 100
};

// Fuzzy Rules
function detectAnomaly(ratio, vibChange) {
  // Calculate membership values
  const ratioMembership = {
    normal: rpmVibrationRatio.normal(ratio),
    elevated: rpmVibrationRatio.elevated(ratio),
    abnormal: rpmVibrationRatio.abnormal(ratio)
  };
  
  const vibChangeMembership = {
    stable: vibrationChange.stable(vibChange),
    moderate: vibrationChange.moderate(vibChange),
    sharp: vibrationChange.sharp(vibChange)
  };
  
  // Rules
  const rules = [
    // Rule 1: IF ratio is normal AND vibChange is stable THEN anomaly is low
    { condition: Math.min(ratioMembership.normal, vibChangeMembership.stable), output: anomalyScore.low },
    // Rule 2: IF ratio is elevated OR vibChange is moderate THEN anomaly is moderate
    { condition: Math.max(ratioMembership.elevated, vibChangeMembership.moderate), output: anomalyScore.moderate },
    // Rule 3: IF ratio is abnormal OR vibChange is sharp THEN anomaly is high
    { condition: Math.max(ratioMembership.abnormal, vibChangeMembership.sharp), output: anomalyScore.high }
  ];
  
  // Defuzzification (weighted average)
  let numerator = 0;
  let denominator = 0;
  
  rules.forEach(rule => {
    if (rule.condition > 0) {
      numerator += rule.condition * rule.output;
      denominator += rule.condition;
    }
  });
  
  const score = denominator === 0 ? 0 : Math.round(numerator / denominator);
  
  return {
    anomalyScore: score,
    anomalyLevel: score <= 25 ? "Low" : score <= 75 ? "Moderate" : "High"
  };
}`
    },
    {
      id: 8,
      name: "Fuzzy Logic8",
      description: "This fuzzy logic controller finds the optimal RPM that minimizes power consumption while maintaining acceptable vibration levels. It continuously learns the efficiency curve specific to the machine's current condition.",
      logic: `// Fuzzy Sets for Input Variables
const vibrationLevel = {
  low: (v) => v <= 10 ? 1 : v <= 20 ? (20-v)/10 : 0,
  medium: (v) => v <= 10 ? 0 : v <= 20 ? (v-10)/10 : v <= 30 ? (30-v)/10 : 0,
  high: (v) => v <= 20 ? 0 : v <= 30 ? (v-20)/10 : 1
};

const powerConsumption = {
  low: (p) => p <= 50 ? 1 : p <= 100 ? (100-p)/50 : 0,
  medium: (p) => p <= 50 ? 0 : p <= 100 ? (p-50)/50 : p <= 150 ? (150-p)/50 : 0,
  high: (p) => p <= 100 ? 0 : p <= 150 ? (p-100)/50 : 1
};

// Fuzzy Sets for Output Variable (Optimal RPM)
const optimalRpm = {
  low: 20,
  medium: 50,
  high: 80
};

// Fuzzy Rules
function optimizePower(vibration, power) {
  // Calculate membership values
  const vibMembership = {
    low: vibrationLevel.low(vibration),
    medium: vibrationLevel.medium(vibration),
    high: vibrationLevel.high(vibration)
  };
  
  const powerMembership = {
    low: powerConsumption.low(power),
    medium: powerConsumption.medium(power),
    high: powerConsumption.high(power)
  };
  
  // Rules
  const rules = [
    // Rule 1: IF vibration is low AND power is low THEN rpm is high
    { condition: Math.min(vibMembership.low, powerMembership.low), output: optimalRpm.high },
    // Rule 2: IF vibration is medium OR power is medium THEN rpm is medium
    { condition: Math.max(vibMembership.medium, powerMembership.medium), output: optimalRpm.medium },
    // Rule 3: IF vibration is high OR power is high THEN rpm is low
    { condition: Math.max(vibMembership.high, powerMembership.high), output: optimalRpm.low }
  ];
  
  // Defuzzification (weighted average)
  let numerator = 0;
  let denominator = 0;
  
  rules.forEach(rule => {
    if (rule.condition > 0) {
      numerator += rule.condition * rule.output;
      denominator += rule.condition;
    }
  });
  
  const rpm = denominator === 0 ? 50 : Math.round(numerator / denominator);
  
  return {
    optimalRpm: rpm,
    efficiencyLevel: rpm <= 30 ? "Low" : rpm <= 60 ? "Medium" : "High"
  };
}`
    },
    {
      id: 9,
      name: "Fuzzy Logic9",
      description: "This fuzzy logic system manages motor acceleration curves to prevent vibration spikes. It adjusts the rate of RPM increase based on real-time vibration feedback to ensure smooth operation during startup and speed changes.",
      logic: `// Fuzzy Sets for Input Variables
const vibrationLevel = {
  low: (v) => v <= 10 ? 1 : v <= 20 ? (20-v)/10 : 0,
  medium: (v) => v <= 10 ? 0 : v <= 20 ? (v-10)/10 : v <= 30 ? (30-v)/10 : 0,
  high: (v) => v <= 20 ? 0 : v <= 30 ? (v-20)/10 : 1
};

const rpmRate = {
  slow: (r) => r <= 5 ? 1 : r <= 10 ? (10-r)/5 : 0,
  moderate: (r) => r <= 5 ? 0 : r <= 10 ? (r-5)/5 : r <= 15 ? (15-r)/5 : 0,
  fast: (r) => r <= 10 ? 0 : r <= 15 ? (r-10)/5 : 1
};

// Fuzzy Sets for Output Variable (Acceleration Rate)
const accelerationRate = {
  slow: 2,
  moderate: 5,
  fast: 10
};

// Fuzzy Rules
function adjustAcceleration(vibration, rpmRate) {
  // Calculate membership values
  const vibMembership = {
    low: vibrationLevel.low(vibration),
    medium: vibrationLevel.medium(vibration),
    high: vibrationLevel.high(vibration)
  };
  
  const rateMembership = {
    slow: rpmRate.slow(rpmRate),
    moderate: rpmRate.moderate(rpmRate),
    fast: rpmRate.fast(rpmRate)
  };
  
  // Rules
  const rules = [
    // Rule 1: IF vibration is low THEN acceleration is fast
    { condition: vibMembership.low, output: accelerationRate.fast },
    // Rule 2: IF vibration is medium AND rpmRate is moderate THEN acceleration is moderate
    { condition: Math.min(vibMembership.medium, rateMembership.moderate), output: accelerationRate.moderate },
    // Rule 3: IF vibration is high OR rpmRate is fast THEN acceleration is slow
    { condition: Math.max(vibMembership.high, rateMembership.fast), output: accelerationRate.slow }
  ];
  
  // Defuzzification (weighted average)
  let numerator = 0;
  let denominator = 0;
  
  rules.forEach(rule => {
    if (rule.condition > 0) {
      numerator += rule.condition * rule.output;
      denominator += rule.condition;
    }
  });
  
  const rate = denominator === 0 ? 5 : Math.round(numerator / denominator);
  
  return {
    accelerationRate: rate,
    rateLevel: rate <= 3 ? "Slow" : rate <= 7 ? "Moderate" : "Fast"
  };
}`
    },
    {
      id: 10,
      name: "Fuzzy Logic10",
      description: "This fuzzy logic algorithm fine-tunes RPM for precise medicine dispensing by correlating vibration signatures with dispensing accuracy. It learns optimal speed profiles for different medication types to minimize errors.",
      logic: `// Fuzzy Sets for Input Variables
const medicineWeight = {
  light: (w) => w <= 0.1 ? 1 : w <= 0.3 ? (0.3-w)/0.2 : 0,
  medium: (w) => w <= 0.1 ? 0 : w <= 0.3 ? (w-0.1)/0.2 : w <= 0.5 ? (0.5-w)/0.2 : 0,
  heavy: (w) => w <= 0.3 ? 0 : w <= 0.5 ? (w-0.3)/0.2 : 1
};

const vibrationLevel = {
  minimal: (v) => v <= 5 ? 1 : v <= 15 ? (15-v)/10 : 0,
  moderate: (v) => v <= 5 ? 0 : v <= 15 ? (v-5)/10 : v <= 25 ? (25-v)/10 : 0,
  significant: (v) => v <= 15 ? 0 : v <= 25 ? (v-15)/10 : 1
};

const currentRpm = {
  slow: (r) => r <= 20 ? 1 : r <= 40 ? (40-r)/20 : 0,
  medium: (r) => r <= 20 ? 0 : r <= 40 ? (r-20)/20 : r <= 60 ? (60-r)/20 : 0,
  fast: (r) => r <= 40 ? 0 : r <= 60 ? (r-40)/20 : 1
};

// Fuzzy Sets for Output Variable (Optimal RPM)
const optimalRpmSets = {
  veryLow: 10,
  low: 25,
  mediumLow: 35,
  medium: 45,
  mediumHigh: 55,
  high: 65,
  veryHigh: 80
};

// Dispensing accuracy (in mm) based on RPM and vibration
function predictAccuracy(rpm, vibration) {
  // Lower value means higher accuracy
  return 0.05 + (vibration / 500) + Math.abs(rpm - 45) / 200;
}

// Fuzzy Rules
function calculateOptimalRpm(weightValue, vibValue, currentRpmValue, targetAccuracy) {
  // Calculate input membership values
  const weightMembership = {
    light: medicineWeight.light(weightValue),
    medium: medicineWeight.medium(weightValue),
    heavy: medicineWeight.heavy(weightValue)
  };
  
  const vibrationMembership = {
    minimal: vibrationLevel.minimal(vibValue),
    moderate: vibrationLevel.moderate(vibValue),
    significant: vibrationLevel.significant(vibValue)
  };
  
  const rpmMembership = {
    slow: currentRpm.slow(currentRpmValue),
    medium: currentRpm.medium(currentRpmValue),
    fast: currentRpm.fast(currentRpmValue)
  };
  
  // Predict current accuracy
  const currentAccuracy = predictAccuracy(currentRpmValue, vibValue);
  const accuracyDelta = targetAccuracy - currentAccuracy;
  
  // Rules for optimal RPM
  const rules = [
    // Rule 1: IF weight is light AND vibration is minimal THEN rpm is high
    { 
      condition: Math.min(weightMembership.light, vibrationMembership.minimal),
      output: optimalRpmSets.high 
    },
    
    // Rule 2: IF weight is heavy THEN rpm is low
    { 
      condition: weightMembership.heavy,
      output: optimalRpmSets.low 
    },
    
    // Rule 3: IF vibration is significant THEN rpm is veryLow
    { 
      condition: vibrationMembership.significant,
      output: optimalRpmSets.veryLow 
    },
    
    // Rule 4: IF weight is medium AND vibration is minimal THEN rpm is mediumHigh
    { 
      condition: Math.min(weightMembership.medium, vibrationMembership.minimal),
      output: optimalRpmSets.mediumHigh 
    },
    
    // Rule 5: IF weight is medium AND vibration is moderate THEN rpm is medium
    { 
      condition: Math.min(weightMembership.medium, vibrationMembership.moderate),
      output: optimalRpmSets.medium 
    },
    
    // Rule 6: IF weight is light AND vibration is moderate THEN rpm is mediumHigh
    { 
      condition: Math.min(weightMembership.light, vibrationMembership.moderate),
      output: optimalRpmSets.mediumHigh 
    },
    
    // Rule 7: IF weight is heavy AND vibration is minimal THEN rpm is mediumLow
    { 
      condition: Math.min(weightMembership.heavy, vibrationMembership.minimal),
      output: optimalRpmSets.mediumLow 
    }
  ];
  
  // Defuzzification (weighted average)
  let numerator = 0;
  let denominator = 0;
  
  rules.forEach(rule => {
    if (rule.condition > 0) {
      numerator += rule.condition * rule.output;
      denominator += rule.condition;
    }
  });
  
  const optimalRpm = denominator === 0 ? 45 : Math.round(numerator / denominator);
  const predictedNewAccuracy = predictAccuracy(optimalRpm, vibValue);
  
  return {
    optimalRpm: optimalRpm,
    currentAccuracy: Math.round(currentAccuracy * 1000) / 1000,
    predictedAccuracy: Math.round(predictedNewAccuracy * 1000) / 1000,
    improvementPercent: Math.round((1 - predictedNewAccuracy / currentAccuracy) * 100)
  };
}`
    },
    {
      id: 11,
      name: "Fuzzy Logic0",
      description: "This fuzzy logic system manages motor acceleration curves to prevent vibration spikes. It adjusts the rate of RPM increase based on real-time vibration feedback to ensure smooth operation during startup and speed changes.",
      logic: `// Fuzzy logic implementation code would go here`
    },
  ];

  // Function to calculate optimal RPM based on the precision dispensing logic
  const calculatePrecisionDispensingResults = (vibration, rpm) => {
    // Default weight for medicine (medium weight)
    const defaultMedicineWeight = 0.25;
    // Target accuracy (in mm)
    const targetAccuracy = 0.1;
    
    // Fuzzy Sets for Input Variables
    const medicineWeight = {
      light: (w) => w <= 0.1 ? 1 : w <= 0.3 ? (0.3-w)/0.2 : 0,
      medium: (w) => w <= 0.1 ? 0 : w <= 0.3 ? (w-0.1)/0.2 : w <= 0.5 ? (0.5-w)/0.2 : 0,
      heavy: (w) => w <= 0.3 ? 0 : w <= 0.5 ? (w-0.3)/0.2 : 1
    };

    const vibrationLevel = {
      minimal: (v) => v <= 5 ? 1 : v <= 15 ? (15-v)/10 : 0,
      moderate: (v) => v <= 5 ? 0 : v <= 15 ? (v-5)/10 : v <= 25 ? (25-v)/10 : 0,
      significant: (v) => v <= 15 ? 0 : v <= 25 ? (v-15)/10 : 1
    };

    const currentRpm = {
      slow: (r) => r <= 20 ? 1 : r <= 40 ? (40-r)/20 : 0,
      medium: (r) => r <= 20 ? 0 : r <= 40 ? (r-20)/20 : r <= 60 ? (60-r)/20 : 0,
      fast: (r) => r <= 40 ? 0 : r <= 60 ? (r-40)/20 : 1
    };

    // Fuzzy Sets for Output Variable (Optimal RPM)
    const optimalRpmSets = {
      veryLow: 10,
      low: 25,
      mediumLow: 35,
      medium: 45,
      mediumHigh: 55,
      high: 65,
      veryHigh: 80
    };

    // Dispensing accuracy (in mm) based on RPM and vibration
    const predictAccuracy = (rpm, vibration) => {
      // Lower value means higher accuracy
      return 0.05 + (vibration / 500) + Math.abs(rpm - 45) / 200;
    };

    // Calculate membership values
    const weightMembership = {
      light: medicineWeight.light(defaultMedicineWeight),
      medium: medicineWeight.medium(defaultMedicineWeight),
      heavy: medicineWeight.heavy(defaultMedicineWeight)
    };
    
    const vibrationMembership = {
      minimal: vibrationLevel.minimal(vibration),
      moderate: vibrationLevel.moderate(vibration),
      significant: vibrationLevel.significant(vibration)
    };
    
    const rpmMembership = {
      slow: currentRpm.slow(rpm),
      medium: currentRpm.medium(rpm),
      fast: currentRpm.fast(rpm)
    };
    
    // Predict current accuracy
    const currentAccuracy = predictAccuracy(rpm, vibration);
    
    // Rules for optimal RPM
    const rules = [
      // Rule 1: IF weight is light AND vibration is minimal THEN rpm is high
      { 
        condition: Math.min(weightMembership.light, vibrationMembership.minimal),
        output: optimalRpmSets.high 
      },
      
      // Rule 2: IF weight is heavy THEN rpm is low
      { 
        condition: weightMembership.heavy,
        output: optimalRpmSets.low 
      },
      
      // Rule 3: IF vibration is significant THEN rpm is veryLow
      { 
        condition: vibrationMembership.significant,
        output: optimalRpmSets.veryLow 
      },
      
      // Rule 4: IF weight is medium AND vibration is minimal THEN rpm is mediumHigh
      { 
        condition: Math.min(weightMembership.medium, vibrationMembership.minimal),
        output: optimalRpmSets.mediumHigh 
      },
      
      // Rule 5: IF weight is medium AND vibration is moderate THEN rpm is medium
      { 
        condition: Math.min(weightMembership.medium, vibrationMembership.moderate),
        output: optimalRpmSets.medium 
      },
      
      // Rule 6: IF weight is light AND vibration is moderate THEN rpm is mediumHigh
      { 
        condition: Math.min(weightMembership.light, vibrationMembership.moderate),
        output: optimalRpmSets.mediumHigh 
      },
      
      // Rule 7: IF weight is heavy AND vibration is minimal THEN rpm is mediumLow
      { 
        condition: Math.min(weightMembership.heavy, vibrationMembership.minimal),
        output: optimalRpmSets.mediumLow 
      }
    ];
    
    // Defuzzification (weighted average)
    let numerator = 0;
    let denominator = 0;
    
    rules.forEach(rule => {
      if (rule.condition > 0) {
        numerator += rule.condition * rule.output;
        denominator += rule.condition;
      }
    });
    
    const optimalRpm = denominator === 0 ? 45 : Math.round(numerator / denominator);
    const predictedNewAccuracy = predictAccuracy(optimalRpm, vibration);
    
    return {
      optimalRpm: optimalRpm,
      currentAccuracy: Math.round(currentAccuracy * 1000) / 1000,
      predictedAccuracy: Math.round(predictedNewAccuracy * 1000) / 1000,
      improvementPercent: Math.round((1 - predictedNewAccuracy / currentAccuracy) * 100),
      vibrationDelta: Math.round((machineData.vibration - vibration) * 100) / 100
    };
  };

  // Handle button click
  const handleLogicButtonClick = (logicId) => {
    const selectedLogic = fuzzyLogics.find(logic => logic.id === logicId);
    setActiveLogic(selectedLogic);
    setPopupVisible(true);
  };

  // Close popup
  const closePopup = () => {
    setPopupVisible(false);
    setActiveLogic(null);
  };

  // Handle activate button click
  const handleActivate = () => {
    console.log(`Activated logic: ${activeLogic.name}`);
    
    // Get the command value to send to Firebase
    // Logic 0 is ID 11 in the array, but should send 0 to Firebase
    const commandValue = activeLogic.id === 11 ? 0 : activeLogic.id;
    
    try {
      // Send the command to Firebase using the ref from useRef
      if (dbRef.current) {
        console.log("Sending command to Firebase:", commandValue);
        
        // Use a direct database write approach
        const commandRef = ref(dbRef.current, '7_Fuzzy_Logic/command');
        set(commandRef, commandValue)
          .then(() => {
            console.log(`Successfully sent command ${commandValue} to Firebase`);
            
            // Update UI status
            setMachineData(prev => ({
              ...prev,
              status: `Executing Logic ${activeLogic.id === 11 ? 0 : activeLogic.id}: ${activeLogic.name}`
            }));
          })
          .catch(error => {
            console.error("Error sending command to Firebase:", error);
            
            // Fall back to simulation mode without showing an error
            console.log("Falling back to simulation mode");
            setMachineData(prev => ({
              ...prev,
              status: `SIMULATION: Running Logic ${activeLogic.id === 11 ? 0 : activeLogic.id}`
            }));
          });
      } else {
        console.error("Firebase database not initialized");
        
        // Just use simulation mode without showing an error
        console.log("Using simulation mode");
        setMachineData(prev => ({
          ...prev,
          status: `SIMULATION: Running Logic ${activeLogic.id === 11 ? 0 : activeLogic.id}`
        }));
      }
    } catch (error) {
      console.error("Error in handleActivate:", error);
      
      // Fallback to simulation mode
      setMachineData(prev => ({
        ...prev,
        status: `SIMULATION: Running Logic ${activeLogic.id === 11 ? 0 : activeLogic.id}`
      }));
    }
    
    // If it's the Precision Dispensing Tuning logic (id: 10)
    if (activeLogic.id === 10) {
      // Run the vibration analysis
      const results = calculatePrecisionDispensingResults(
        machineData.vibration,
        machineData.rpm
      );
      
      // Update state with the results
      setVibrationAnalysis(results);
    } else {
      // For other logic buttons, just create a basic comparison
      setVibrationAnalysis({
        optimalRpm: Math.round(machineData.rpm * 0.8),
        currentAccuracy: Math.round(machineData.vibration / 5 * 1000) / 1000,
        predictedAccuracy: Math.round(machineData.vibration / 8 * 1000) / 1000,
        improvementPercent: 35,
        vibrationDelta: Math.round((machineData.vibration - (machineData.vibration * 0.6)) * 100) / 100
      });
    }
    
    closePopup();
  };

  return (
    <div className="dashboard" style={{ 
      maxWidth: '1200px',
      margin: '20px auto',
      padding: '25px',
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
      fontFamily: "'Poppins', 'Roboto', sans-serif"
    }}>
      <header style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '30px',
        paddingBottom: '15px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <h1 style={{ fontSize: '26px', color: '#2c3e50', fontWeight: 600 }}>Smart Medicine Vending Machine</h1>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 500,
          backgroundColor: '#f8fafc',
          padding: '8px 15px',
          borderRadius: '50px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
        }}>
          <span style={{ 
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            display: 'inline-block',
            backgroundColor: isConnected ? '#10b981' : '#ef4444',
            boxShadow: isConnected ? '0 0 10px rgba(16, 185, 129, 0.5)' : '0 0 10px rgba(239, 68, 68, 0.5)'
          }}></span>
          <span>Status: {machineData.status}</span>
        </div>
      </header>

      <div style={{ 
        display: 'flex',
        gap: '25px',
        marginBottom: '35px',
        flexWrap: 'wrap'
      }}>
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '25px',
          flex: '1',
          minWidth: '240px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{ fontSize: '16px', color: '#64748b', marginBottom: '10px', fontWeight: 500 }}>RPM</h2>
          <div style={{ fontSize: '42px', fontWeight: 600, marginBottom: '20px', color: '#3b82f6' }}>
            {machineData.rpm}
          </div>
          <div style={{ marginTop: 'auto', width: '100%', height: '150px', overflow: 'hidden', borderRadius: '8px' }}>
            <Graph 
              data={rpmHistory} 
              label="RPM History" 
              color="#3498db" 
              maxValue={150}
            />
          </div>
        </div>
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '25px',
          flex: '1',
          minWidth: '240px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{ fontSize: '16px', color: '#64748b', marginBottom: '10px', fontWeight: 500 }}>Vibration</h2>
          <div style={{ fontSize: '42px', fontWeight: 600, marginBottom: '20px', color: '#ef4444' }}>
            {machineData.vibration}
          </div>
          <div style={{ marginTop: 'auto', width: '100%', height: '150px', overflow: 'hidden', borderRadius: '8px' }}>
            <Graph 
              data={vibrationHistory} 
              label="Vibration History" 
              color="#e74c3c" 
              maxValue={100}
            />
          </div>
        </div>
      </div>

      {/* Vibration Analysis Results Section */}
      {vibrationAnalysis && (
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '35px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)'
        }}>
          <h2 style={{ 
            fontSize: '20px',
            marginBottom: '25px',
            color: '#2c3e50',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ 
              display: 'inline-block',
              width: '4px',
              height: '20px',
              backgroundColor: '#10b981',
              marginRight: '10px',
              borderRadius: '2px'
            }}></span>
            Precision Dispensing Analysis
          </h2>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            {/* <div style={{ 
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px' }}>Current Accuracy</h3>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#3b82f6' }}>
                {vibrationAnalysis.currentAccuracy} mm
              </div>
            </div> */}
            {/* <div style={{ 
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px' }}>Predicted Accuracy</h3>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#10b981' }}>
                {vibrationAnalysis.predictedAccuracy} mm
              </div>
            </div> */}
            {/* <div style={{ 
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px' }}>Optimal RPM</h3>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#8b5cf6' }}>
                {vibrationAnalysis.optimalRpm}
              </div>
            </div>
            <div style={{ 
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px' }}>Improvement</h3>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#10b981' }}>
                {vibrationAnalysis.improvementPercent}%
              </div>
            </div> */}
            <div style={{ 
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
              gridColumn: '1 / -1'
            }}>
              <h3 style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px' }}>Vibration Analysis</h3>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 500 }}>
                  Current Vibration Level: <span style={{ color: '#ef4444', fontWeight: 600 }}>{machineData.vibration}</span>
                </div>
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span>Recommended Max: </span>
                  <span style={{ 
                    padding: '5px 10px',
                    backgroundColor: machineData.vibration > 15 ? '#fee2e2' : '#dcfce7',
                    color: machineData.vibration > 15 ? '#ef4444' : '#10b981',
                    borderRadius: '4px',
                    fontWeight: 600
                  }}>
                    15
                  </span>
                  <span style={{ 
                    padding: '5px 10px',
                    backgroundColor: machineData.vibration > vibrationAnalysis.optimalRpm * 0.25 ? '#fee2e2' : '#dcfce7',
                    color: machineData.vibration > vibrationAnalysis.optimalRpm * 0.25 ? '#ef4444' : '#10b981',
                    borderRadius: '4px',
                    fontWeight: 600
                  }}>
                    {Math.round(vibrationAnalysis.optimalRpm * 0.25)}
                  </span>
                </div>
              </div>
              <div style={{ 
                height: '10px',
                backgroundColor: '#e2e8f0',
                borderRadius: '5px',
                marginTop: '15px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  position: 'absolute',
                  height: '100%',
                  width: `${Math.min(100, machineData.vibration)}%`,
                  backgroundColor: machineData.vibration > 15 ? '#ef4444' : '#10b981',
                  borderRadius: '5px',
                  transition: 'width 0.3s ease'
                }}></div>
                <div style={{
                  position: 'absolute',
                  height: '100%',
                  width: '2px',
                  backgroundColor: '#64748b',
                  left: '15%',
                  top: 0
                }}></div>
                <div style={{
                  position: 'absolute',
                  height: '100%',
                  width: '2px',
                  backgroundColor: '#8b5cf6',
                  left: `${Math.min(100, Math.round(vibrationAnalysis.optimalRpm * 0.25))}%`,
                  top: 0
                }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '25px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)'
      }}>
        <h2 style={{ 
          fontSize: '20px',
          marginBottom: '25px',
          color: '#2c3e50',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ 
            display: 'inline-block',
            width: '4px',
            height: '20px',
            backgroundColor: '#3b82f6',
            marginRight: '10px',
            borderRadius: '2px'
          }}></span>
          Fuzzy Logic Controls
        </h2>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          {/* Show all buttons - including logic 0 (ID 11) and logics 1-10 */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(id => {
            // Find the matching logic
            const logic = fuzzyLogics.find(l => l.id === id);
            
            // Skip if logic doesn't exist
            if (!logic) return null;
            
            // Display ID 11 as "0" in the UI
            const displayId = id === 11 ? 0 : id;
            
            return (
              <button 
                key={logic.id} 
                style={{ 
                  backgroundColor: logic.id === 10 ? '#8b5cf6' : logic.id === 11 ? '#f59e0b' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '15px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontWeight: 500,
                  position: 'relative',
                  overflow: 'hidden',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px'
                }}
                onClick={() => handleLogicButtonClick(logic.id)}
              >
                <span style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {displayId}
                </span>
                {logic.name}
              </button>
            );
          })}
        </div>
      </div>

      {popupVisible && activeLogic && (
        <div style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '550px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 25px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h2 style={{ fontSize: '20px', color: '#1e293b', fontWeight: 600 }}>{activeLogic.name}</h2>
              <button 
                style={{ 
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748b',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s'
                }}
                onClick={closePopup}
              >
                ×
              </button>
            </div>
            <div style={{ 
              padding: '25px',
              lineHeight: '1.7',
              fontSize: '15px',
              color: '#475569'
            }}>
              <p>{activeLogic.description}</p>
              <div style={{ 
                marginTop: '20px',
                backgroundColor: '#f8fafc',
                padding: '15px',
                borderRadius: '8px',
                overflowX: 'auto'
              }}>
                <h3 style={{ 
                  fontSize: '16px',
                  marginBottom: '10px',
                  color: '#334155',
                  fontWeight: 500
                }}>Fuzzy Logic Implementation:</h3>
                <pre style={{ 
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: '#334155',
                  whiteSpace: 'pre-wrap'
                }}><code className='code'>{activeLogic.logic}</code></pre>
              </div>
            </div>
            <div style={{ 
              padding: '20px 25px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button 
                style={{ 
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 25px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontWeight: 500
                }}
                onClick={handleActivate}
              >
                Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}