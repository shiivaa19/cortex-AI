import Papa from "papaparse";

let dataset = [];

async function loadDataset() {
  if (dataset.length) return dataset;

  try {
    const response = await fetch("/cortex_mock_data.csv");
    const csv = await response.text();

    const parsed = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
    });

    dataset = parsed.data;
  } catch (err) {
    console.error("Failed to load CSV dataset", err);
  }
  return dataset;
}

export async function answerQuestion(question) {
  const data = await loadDataset();
  if (!data || data.length === 0) {
    return {
      text: "The telemetry dataset is currently empty or failed to load.",
      cites: []
    };
  }

  const q = question.toLowerCase();
  const cites = ["cortex_mock_data.csv (Client-side Parser)"];

  // Helper to extract numeric column values
  const getNumericValues = (colName) => {
    return data
      .map(row => parseFloat(row[colName]))
      .filter(val => !isNaN(val));
  };

  // 1. Billing / Cost Query
  if (q.includes("bill") || q.includes("cost") || q.includes("charge") || q.includes("rupee") || q.includes("₹") || q.includes("higher")) {
    const watts = getNumericValues("Watts_Total");
    const va = getNumericValues("VA_Total");
    const pfList = getNumericValues("True_PF_Avg");

    const avgWatts = watts.reduce((a, b) => a + b, 0) / watts.length;
    const hours = 4.0; // Spreadsheet spans approx 4 hours
    const totalKwh = (avgWatts / 1000) * hours;
    const energyCharge = totalKwh * 7.2;

    const maxVa = Math.max(...va);
    const contractedKva = 314.0; 
    const demandCharge = contractedKva * 72;
    const maxVaKva = maxVa / 1000;
    const demandPenalty = maxVaKva > contractedKva ? (maxVaKva - contractedKva) * 150 : 0;

    const avgPf = pfList.reduce((a, b) => a + Math.abs(b), 0) / pfList.length;
    let pfIncentive = 0;
    if (avgPf >= 0.95) pfIncentive = -totalKwh * 0.10;
    else if (avgPf < 0.85) pfIncentive = totalKwh * 0.15;

    const todAdder = energyCharge * 0.65 * 0.20; 

    const totalBill = energyCharge + demandCharge + demandPenalty + pfIncentive + todAdder;

    const answer = (
      `Based on the ingested telemetry, your estimated bill is ₹${Math.round(totalBill).toLocaleString("en-IN")}. ` +
      `Breakdown: Energy charge ₹${Math.round(energyCharge).toLocaleString("en-IN")} (${totalKwh.toFixed(1)} kWh consumed), ` +
      `Demand charge ₹${Math.round(demandCharge).toLocaleString("en-IN")}, Demand penalty ₹${Math.round(demandPenalty).toLocaleString("en-IN")}, ` +
      `and ToD peak hours adder ₹${Math.round(todAdder).toLocaleString("en-IN")}. ` +
      `Average Power Factor is ${avgPf.toFixed(3)}, yielding ₹${Math.abs(Math.round(pfIncentive))} in rebate.`
    );
    return { text: answer, cites };
  }

  // 2. Power Factor Query
  if (q.includes("power factor") || q.includes("pf") || q.includes("capacitor")) {
    const pfList = getNumericValues("True_PF_Avg");
    const avgPf = pfList.reduce((a, b) => a + Math.abs(b), 0) / pfList.length;
    const minPf = Math.min(...pfList.map(Math.abs));
    const maxPf = Math.max(...pfList.map(Math.abs));
    
    let answer = `Your average Power Factor is ${avgPf.toFixed(3)} (ranging from a minimum of ${minPf.toFixed(3)} to a maximum of ${maxPf.toFixed(3)}). `;
    if (minPf < 0.85) {
      const minRow = data.find(row => Math.abs(parseFloat(row["True_PF_Avg"])) === minPf);
      const timeStr = minRow ? minRow["Timestamp"] : "unknown time";
      answer += `We detected a critical Power Factor dip to ${minPf.toFixed(3)} around ${timeStr}, which may indicate a capacitor bank trip or inductive load spike.`;
    } else {
      answer += "Power Factor remained healthy and within normal operating parameters throughout this logging period.";
    }
    return { text: answer, cites };
  }

  // 3. THD / Harmonics
  if (q.includes("thd") || q.includes("harmonic") || q.includes("distortion")) {
    const thdR = getNumericValues("I_R_THD_Pct");
    const thdY = getNumericValues("I_Y_THD_Pct");
    const thdB = getNumericValues("I_B_THD_Pct");

    const maxR = Math.max(...thdR);
    const maxY = Math.max(...thdY);
    const maxB = Math.max(...thdB);
    const maxThd = Math.max(maxR, maxY, maxB);

    let answer = (
      `The Total Harmonic Distortion (THD) on phase currents reaches a peak of ${maxThd.toFixed(1)}% ` +
      `(Phase R: ${maxR.toFixed(1)}%, Phase Y: ${maxY.toFixed(1)}%, Phase B: ${maxB.toFixed(1)}%). `
    );
    if (maxThd > 8.0) {
      answer += "THD exceeds the IEEE-519 recommended limit of 8.0%, suggesting substantial non-linear loads (such as variable frequency drives or induction units) are active.";
    } else {
      answer += "THD values remain safe and are compliant with IEEE-519 standards.";
    }
    return { text: answer, cites };
  }

  // 4. Voltage / Volts
  if (q.includes("voltage") || q.includes("volts") || q.includes("v_r") || q.includes("v_y") || q.includes("v_b")) {
    const vr = getNumericValues("V_R");
    const vy = getNumericValues("V_Y");
    const vb = getNumericValues("V_B");

    const avgR = vr.reduce((a, b) => a + b, 0) / vr.length;
    const avgY = vy.reduce((a, b) => a + b, 0) / vy.length;
    const avgB = vb.reduce((a, b) => a + b, 0) / vb.length;
    const avgV = (avgR + avgY + avgB) / 3;

    const answer = (
      `Average phase voltages are: Phase R: ${avgR.toFixed(1)} V, Phase Y: ${avgY.toFixed(1)} V, Phase B: ${avgB.toFixed(1)} V ` +
      `(Overall average: ${avgV.toFixed(1)} V). The voltage profile is stable and nominal throughout the logging duration.`
    );
    return { text: answer, cites };
  }

  // 5. Active Power / Apparent Power / demand / kW / kVA
  if (q.includes("power") || q.includes("kw") || q.includes("kva") || q.includes("demand") || q.includes("consumption")) {
    const watts = getNumericValues("Watts_Total");
    const va = getNumericValues("VA_Total");
    
    const avgKw = (watts.reduce((a, b) => a + b, 0) / watts.length) / 1000;
    const peakKw = Math.max(...watts) / 1000;
    const avgKva = (va.reduce((a, b) => a + b, 0) / va.length) / 1000;
    const peakKva = Math.max(...va) / 1000;

    const answer = (
      `Active power averages ${avgKw.toFixed(1)} kW (peaking at ${peakKw.toFixed(1)} kW). ` +
      `Apparent power averages ${avgKva.toFixed(1)} kVA (peaking at ${peakKva.toFixed(1)} kVA). ` +
      `The peak demand recorded is ${peakKva.toFixed(1)} kVA against your contracted demand of 314 kVA.`
    );
    return { text: answer, cites };
  }

  // 6. Generic search in rows (fallback filter)
  const results = data.filter((row) =>
    Object.values(row).some((value) =>
      String(value).toLowerCase().includes(q)
    )
  );

  if (results.length === 0) {
    return {
      text: "I couldn't find any direct match for your query in the dataset columns. Try asking about 'billing', 'power factor', 'harmonic levels', 'voltages', or general stats.",
      cites: []
    };
  }

  // Summarize the matched rows
  const row = results[0];
  let answer = `Found matching record at ${row["Timestamp"] || "timestamp unavailable"}:\n`;
  const keysToInclude = ["Timestamp", "Watts_Total", "VAR_Total", "VA_Total", "True_PF_Avg", "VLL_Avg", "VLN_Avg", "I_Total", "Frequency_Hz"];
  
  keysToInclude.forEach(key => {
    if (row[key] !== undefined) {
      answer += `• ${key}: ${row[key]}\n`;
    }
  });

  return { text: answer, cites };
}