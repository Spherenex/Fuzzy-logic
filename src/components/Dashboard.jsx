import { useState, useEffect, useRef } from 'react';
import { initializeApp, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import './Dashboard.css'; // Import your CSS styles
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
    
    // Draw background with gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'rgba(15, 23, 42, 0.8)');
    bgGradient.addColorStop(1, 'rgba(15, 23, 42, 0.2)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = height - (height * (i / 5));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Add y-axis labels
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText((maxValue * (i / 5)).toFixed(0), 5, y - 5);
    }
    
    // Create gradient for line
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (color === '#3498db' || color === '#3b82f6') {
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
    } else {
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0.2)');
    }
    
    // Fill area under the line
    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    const dataPoints = Math.min(data.length, 30); // Show at most 30 points
    const step = width / (dataPoints - 1);
    
    // Start at the bottom left
    ctx.moveTo(0, height);
    
    for (let i = 0; i < dataPoints; i++) {
      const x = i * step;
      const y = height - (height * (data[data.length - dataPoints + i] / maxValue));
      ctx.lineTo(x, y);
    }
    
    // Complete the path to the bottom right
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    
    // Draw line with glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    
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
      
      // Draw glow effect for points
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow
    }
    
    // Add label with slight glow
    ctx.fillStyle = 'rgba(51, 65, 85, 0.9)';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowBlur = 3;
    ctx.fillText(label, width / 2, 15);
    ctx.shadowBlur = 0; // Reset shadow
    
  }, [data, label, color, maxValue]);
  
  return (
    <canvas ref={canvasRef} width={300} height={150} className="graph-canvas" style={{ borderRadius: '8px' }}></canvas>
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
      logic: `// Fuzzy logic implementation code would go here`
    },
    {
      id: 3,
      name: "Fuzzy Logic3",
      description: "This fuzzy logic system analyzes patterns in vibration signatures at different RPM levels to predict component wear and potential mechanical failures before they cause system disruption.",
      logic: `// Fuzzy logic implementation code would go here`
    },
    {
      id: 4,
      name: "Fuzzy Logic4",
      description: "This fuzzy logic algorithm detects conditions that may lead to motor stalling by monitoring sudden changes in RPM and vibration patterns. It proactively reduces load or increases power to prevent stalls.",
      logic: `// Fuzzy logic implementation code would go here`
    },
    {
      id: 5,
      name: "Fuzzy Logic5",
      description: "This fuzzy logic module dynamically adjusts the machine's dampening systems based on current vibration amplitude and frequency. It applies appropriate counterforces at different RPM levels to minimize overall vibration.",
      logic: `// Fuzzy logic implementation code would go here`
    },
    {
      id: 6,
      name: "Fuzzy Logic6",
      description: "This fuzzy logic system automatically selects between 'High Speed', 'Balanced', or 'Low Vibration' operation modes based on current performance metrics and historical RPM-to-vibration ratio data.",
      logic: `// Fuzzy logic implementation code would go here`
    },
    {
      id: 7,
      name: "Fuzzy Logic7",
      description: "This fuzzy logic algorithm identifies unusual relationships between RPM and vibration that don't follow established patterns, potentially indicating foreign objects, mechanical issues, or tampering attempts.",
      logic: `// Fuzzy logic implementation code would go here`
    },
    {
      id: 8,
      name: "Fuzzy Logic8",
      description: "This fuzzy logic controller finds the optimal RPM that minimizes power consumption while maintaining acceptable vibration levels. It continuously learns the efficiency curve specific to the machine's current condition.",
      logic: `// Fuzzy logic implementation code would go here`
    },
    {
      id: 9,
      name: "Fuzzy Logic9",
      description: "This fuzzy logic system manages motor acceleration curves to prevent vibration spikes. It adjusts the rate of RPM increase based on real-time vibration feedback to ensure smooth operation during startup and speed changes.",
      logic: `// Fuzzy logic implementation code would go here`
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
    // Implementation details removed for brevity
    return {
      optimalRpm: 45,
      currentAccuracy: 0.15,
      predictedAccuracy: 0.08,
      improvementPercent: 47,
      vibrationDelta: 5.2
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

  const dashboardStyle = {
    maxWidth: '1200px',
    margin: '20px auto',
    padding: '30px',
    backgroundColor: '#0f172a', // Dark blue background
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2)',
    fontFamily: "'Inter', 'Poppins', system-ui, sans-serif",
    color: '#e2e8f0',
    backgroundImage: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 40%), radial-gradient(circle at bottom left, rgba(239, 68, 68, 0.08), transparent 40%)'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '35px',
    paddingBottom: '18px',
    borderBottom: '1px solid rgba(51, 65, 85, 0.8)'
  };

  const titleStyle = {
    fontSize: '26px',
    // color: '#f8fafc',
    fontWeight: 700,
    background: 'linear-gradient(to right, #e2e8f0, #94a3b8)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.02em'
  };

  const statusStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: 500,
    backgroundColor: isConnected ? 'rgba(20, 83, 45, 0.5)' : 'rgba(127, 29, 29, 0.5)',
    padding: '10px 18px',
    borderRadius: '50px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
    border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
    transition: 'all 0.3s ease',
    color: '#f8fafc'
  };

  const statusIndicatorStyle = {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
    backgroundColor: isConnected ? '#10b981' : '#ef4444',
    boxShadow: isConnected 
      ? '0 0 0 3px rgba(16, 185, 129, 0.2), 0 0 12px rgba(16, 185, 129, 0.4)' 
      : '0 0 0 3px rgba(239, 68, 68, 0.2), 0 0 12px rgba(239, 68, 68, 0.4)',
    animation: isConnected ? 'pulse 2s infinite' : 'none'
  };

  const metricsContainerStyle = {
    display: 'flex',
    gap: '25px',
    marginBottom: '35px',
    flexWrap: 'wrap'
  };

  const metricCardStyle = (isRpm) => ({
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '25px',
    flex: '1',
    minWidth: '240px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${isRpm ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
    background: isRpm 
      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(15, 23, 42, 0.2) 100%)' 
      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.2) 100%)',
    position: 'relative',
    overflow: 'hidden',
    ':hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)'
    }
  });

  const metricLabelStyle = {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '10px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  const metricValueStyle = (isRpm) => ({
    fontSize: '42px',
    fontWeight: 700,
    marginBottom: '20px',
    color: isRpm ? '#60a5fa' : '#f87171',
    textShadow: `0 1px 2px ${isRpm ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
    transition: 'all 0.3s ease'
  });

  const graphContainerStyle = {
    marginTop: 'auto',
    width: '100%',
    height: '150px',
    overflow: 'hidden',
    borderRadius: '12px',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
    padding: '8px'
  };

  const analysisCardStyle = {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '35px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.2) 100%)'
  };

  const sectionHeaderStyle = {
    fontSize: '20px',
    marginBottom: '25px',
    color: '#f8fafc',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  const headerAccentStyle = (color) => ({
    display: 'inline-block',
    width: '4px',
    height: '20px',
    backgroundColor: color,
    borderRadius: '2px',
    boxShadow: `0 0 8px ${color}90`
  });

  const vibrationAnalysisContentStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(51, 65, 85, 0.8)'
  };

  const vibrationRowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px'
  };

  const vibrationLevelStyle = {
    fontSize: '18px',
    fontWeight: 500,
    color: '#e2e8f0'
  };

  const vibrationValueStyle = {
    color: machineData.vibration > 15 ? '#ef4444' : '#10b981',
    fontWeight: 700
  };

  const recommendationsStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  };

  const recommendationLabelStyle = {
    color: '#94a3b8',
    fontWeight: 500
  };

  const recommendationTagStyle = (isExceeded) => ({
    padding: '6px 12px',
    backgroundColor: isExceeded ? 'rgba(127, 29, 29, 0.6)' : 'rgba(20, 83, 45, 0.6)',
    color: isExceeded ? '#fca5a5' : '#86efac',
    borderRadius: '8px',
    fontWeight: 600,
    boxShadow: `0 1px 2px ${isExceeded ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
  });

  const progressBarContainerStyle = {
    height: '12px',
    backgroundColor: 'rgba(51, 65, 85, 0.7)',
    borderRadius: '6px',
    marginTop: '15px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)'
  };

  const progressBarStyle = {
    position: 'absolute',
    height: '100%',
    width: `${Math.min(100, machineData.vibration)}%`,
    backgroundColor: machineData.vibration > 15 ? '#ef4444' : '#10b981',
    borderRadius: '6px',
    transition: 'width 0.5s ease, background-color 0.5s ease',
    boxShadow: machineData.vibration > 15 
      ? '0 0 10px rgba(239, 68, 68, 0.6), 0 0 5px rgba(239, 68, 68, 0.4)' 
      : '0 0 10px rgba(16, 185, 129, 0.6), 0 0 5px rgba(16, 185, 129, 0.4)'
  };

  const markerStyle = (position, color) => ({
    position: 'absolute',
    height: '12px',
    width: '3px',
    backgroundColor: color,
    left: `${position}%`,
    top: 0,
    boxShadow: `0 0 8px ${color}80`
  });

  const fuzzyLogicCardStyle = {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '25px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(15, 23, 42, 0.2) 100%)'
  };

  const buttonGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px'
  };

  const logicButtonStyle = (id) => {
    let buttonColor;
    let hoverColor;
    let shadowColor;
    
    if (id === 10) {
      buttonColor = '#8b5cf6';
      hoverColor = '#7c3aed';
      shadowColor = 'rgba(139, 92, 246, 0.5)';
    } else if (id === 11) {
      buttonColor = '#f59e0b';
      hoverColor = '#d97706';
      shadowColor = 'rgba(245, 158, 11, 0.5)';
    } else {
      buttonColor = '#3b82f6';
      hoverColor = '#2563eb';
      shadowColor = 'rgba(59, 130, 246, 0.5)';
    }
    
    return {
      backgroundColor: buttonColor,
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      padding: '16px',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontWeight: 500,
      position: 'relative',
      overflow: 'hidden',
      zIndex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
      ':hover': {
        backgroundColor: hoverColor,
        transform: 'translateY(-2px)',
        boxShadow: `0 6px 15px ${shadowColor}, 0 2px 5px rgba(0, 0, 0, 0.1)`
      },
      ':active': {
        transform: 'translateY(1px)',
        boxShadow: `0 2px 5px ${shadowColor}`
      }
    };
  };

  const buttonBadgeStyle = {
    position: 'absolute',
    top: '10px',
    left: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  };

  const modalBackdropStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(5px)',
    animation: 'fadeIn 0.3s ease'
  };

  const modalContentStyle = {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 10px 15px -3px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideUp 0.3s ease',
    border: '1px solid rgba(51, 65, 85, 0.8)'
  };

  const modalHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 25px',
    borderBottom: '1px solid rgba(51, 65, 85, 0.8)',
    position: 'sticky',
    top: 0,
    backgroundColor: '#1e293b',
    zIndex: 10,
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px'
  };

  const modalTitleStyle = {
    fontSize: '20px',
    color: '#f8fafc',
    fontWeight: 600
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#94a3b8',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(51, 65, 85, 0.5)',
      color: '#f8fafc'
    }
  };

  const modalBodyStyle = {
    padding: '25px',
    lineHeight: '1.7',
    fontSize: '15px',
    color: '#cbd5e1'
  };

  const codeBlockStyle = {
    marginTop: '20px',
    backgroundColor: '#0f172a',
    padding: '20px',
    borderRadius: '12px',
    overflowX: 'auto',
    border: '1px solid rgba(51, 65, 85, 0.8)'
  };

  const codeTitleStyle = {
    fontSize: '16px',
    marginBottom: '15px',
    color: '#e2e8f0',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const codeStyle = {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#e2e8f0',
    whiteSpace: 'pre-wrap'
  };

  const modalFooterStyle = {
    padding: '20px 25px',
    borderTop: '1px solid rgba(51, 65, 85, 0.8)',
    display: 'flex',
    justifyContent: 'flex-end',
    position: 'sticky',
    bottom: 0,
    backgroundColor: '#1e293b',
    zIndex: 10,
    borderBottomLeftRadius: '16px',
    borderBottomRightRadius: '16px'
  };

  const activateButtonStyle = {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 25px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontWeight: 500,
    boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2), 0 1px 3px rgba(16, 185, 129, 0.1)',
    ':hover': {
      backgroundColor: '#059669',
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 15px rgba(16, 185, 129, 0.3), 0 2px 5px rgba(16, 185, 129, 0.1)'
    },
    ':active': {
      transform: 'translateY(1px)',
      boxShadow: '0 2px 5px rgba(16, 185, 129, 0.2)'
    }
  };
  
  // Add more styles as needed

  return (
    <div style={dashboardStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>Smart Medicine Vending Machine</h1>
        <div style={statusStyle}>
          <span style={statusIndicatorStyle}></span>
          <span>{machineData.status}</span>
        </div>
      </header>

      <div style={metricsContainerStyle}>
        <div style={metricCardStyle(true)}>
          <h2 style={metricLabelStyle}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            RPM
          </h2>
          <div style={metricValueStyle(true)}>
            {machineData.rpm}
          </div>
          <div style={graphContainerStyle}>
            <Graph 
              data={rpmHistory} 
              label="RPM History" 
              color="#3b82f6" 
              maxValue={150}
            />
          </div>
        </div>
        <div style={metricCardStyle(false)}>
          <h2 style={metricLabelStyle}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            Vibration
          </h2>
          <div style={metricValueStyle(false)}>
            {machineData.vibration}
          </div>
          <div style={graphContainerStyle}>
            <Graph 
              data={vibrationHistory} 
              label="Vibration History" 
              color="#ef4444" 
              maxValue={100}
            />
          </div>
        </div>
      </div>

      {/* Vibration Analysis Results Section */}
      {vibrationAnalysis && (
        <div style={analysisCardStyle}>
          <h2 style={sectionHeaderStyle}>
            <span style={headerAccentStyle('#10b981')}></span>
            Precision Dispensing Analysis
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </h2>
          <div style={vibrationAnalysisContentStyle}>
            <div style={vibrationRowStyle}>
              <div style={vibrationLevelStyle}>
                Current Vibration Level: <span style={vibrationValueStyle}>{machineData.vibration}</span>
              </div>
              <div style={recommendationsStyle}>
                <span style={recommendationLabelStyle}>Recommended Max:</span>
                <span style={recommendationTagStyle(machineData.vibration > 15)}>
                  15
                </span>
                <span style={recommendationTagStyle(machineData.vibration > vibrationAnalysis.optimalRpm * 0.25)}>
                  {Math.round(vibrationAnalysis.optimalRpm * 0.25)}
                </span>
              </div>
            </div>
            <div style={progressBarContainerStyle}>
              <div style={progressBarStyle}></div>
              <div style={markerStyle(15, '#64748b')}></div>
              <div style={markerStyle(Math.min(100, Math.round(vibrationAnalysis.optimalRpm * 0.25)), '#8b5cf6')}></div>
            </div>
          </div>
        </div>
      )}

      <div style={fuzzyLogicCardStyle}>
        <h2 style={sectionHeaderStyle}>
          <span style={headerAccentStyle('#3b82f6')}></span>
          Fuzzy Logic Controls
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v6"></path>
            <path d="M8 7l8 0"></path>
            <circle cx="12" cy="14" r="3"></circle>
            <path d="M4 21h16"></path>
          </svg>
        </h2>
        <div style={buttonGridStyle}>
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
                style={logicButtonStyle(logic.id)}
                onClick={() => handleLogicButtonClick(logic.id)}
              >
                <span style={buttonBadgeStyle}>
                  {displayId}
                </span>
                {logic.name}
              </button>
            );
          })}
        </div>
      </div>

      {popupVisible && activeLogic && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={modalTitleStyle}>{activeLogic.name}</h2>
              <button 
                style={closeButtonStyle}
                onClick={closePopup}
              >
                ×
              </button>
            </div>
            <div style={modalBodyStyle}>
              <p>{activeLogic.description}</p>
              <div style={codeBlockStyle}>
                <h3 style={codeTitleStyle}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                  </svg>
                  Fuzzy Logic Implementation:
                </h3>
                <pre style={codeStyle}><code>{activeLogic.logic}</code></pre>
              </div>
            </div>
            <div style={modalFooterStyle}>
              <button 
                style={activateButtonStyle}
                onClick={handleActivate}
              >
                Activate
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}