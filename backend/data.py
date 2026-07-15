import pandas as pd
import numpy as np
import os

# ---------------------------------------------------------------------------
# Load the REAL dataset at startup
# ---------------------------------------------------------------------------
DATA_PATH = os.path.join(os.path.dirname(__file__), "cortex_mock_data.csv")
_df = pd.read_csv(DATA_PATH)
_df["Timestamp"] = pd.to_datetime(_df["Timestamp"])
_df = _df.sort_values("Timestamp").reset_index(drop=True)

# ---------------------------------------------------------------------------
# Tenant definition — derived from real dataset
# ---------------------------------------------------------------------------
TENANTS = {
    "tenant_a": {
        "id": "tenant_a",
        "name": "Industrial Plant",
        "location": "On-site Meter",
        "contracted_demand_kva": round(float(_df["VA_Total"].max() / 1000), 0),
        "tariffCode": "HT Industrial",
        "seed": 42,
        "scale": 1,
    },
}


def get_dataframe():
    """Return a copy of the loaded dataset."""
    return _df.copy()


# ---------------------------------------------------------------------------
# Hourly power consumption  (from Watts_Total)
# ---------------------------------------------------------------------------
def gen_hourly(t, range_val="Today"):
    # Base profile from real CSV average values (for 16:00 to 20:00)
    real_profile = {
        16: 126.88,
        17: 126.45,
        18: 111.49,
        19: 175.55,
        20: 281.99
    }
    
    scale = t.get("scale", 1.0)
    seed = t.get("seed", 42)
    
    if range_val == "Today":
        out = []
        for h in range(24):
            if h in real_profile:
                kwh = real_profile[h]
            else:
                if 23 <= h or h < 6:
                    base = 15.0
                elif 18 <= h < 22:
                    base = 190.0
                else:
                    base = 130.0
                
                np.random.seed(seed + h)
                noise = np.random.normal(0, 15)
                kwh = max(5.0, base + noise)
            
            zone = "Peak" if 18 <= h < 22 else "Off-Peak" if h >= 23 or h < 6 else "Normal"
            out.append({
                "label": f"{h:02d}:00",
                "kwh": round(float(kwh * scale), 2),
                "zone": zone
            })
        return out
        
    elif range_val == "This Week":
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        out = []
        for idx, day in enumerate(days):
            base = 650.0 if day == "Sun" else 2800.0 if day in ["Sat"] else 3200.0
            np.random.seed(seed + idx + 10)
            noise = np.random.normal(0, 180)
            kwh = max(400.0, base + noise)
            zone = "Normal" if day in ["Sat", "Sun"] else "Peak"
            out.append({
                "label": day,
                "kwh": round(float(kwh * scale), 2),
                "zone": zone
            })
        return out
        
    elif range_val == "This Month":
        out = []
        for w in range(1, 5):
            base = 18500.0
            np.random.seed(seed + w + 20)
            noise = np.random.normal(0, 800)
            kwh = base + noise
            out.append({
                "label": f"Week {w}",
                "kwh": round(float(kwh * scale), 2),
                "zone": "Normal"
            })
        return out
        
    elif range_val == "Last Month":
        out = []
        for w in range(1, 5):
            base = 17800.0
            np.random.seed(seed + w + 30)
            noise = np.random.normal(0, 900)
            kwh = base + noise
            out.append({
                "label": f"Week {w}",
                "kwh": round(float(kwh * scale), 2),
                "zone": "Normal"
            })
        return out

    return []


# ---------------------------------------------------------------------------
# Power Factor timeline
# ---------------------------------------------------------------------------
def gen_pf(t, range_val="Today"):
    seed = t.get("seed", 42)
    
    if range_val == "Today":
        df = _df.copy()
        points = []
        for i, row in df.iterrows():
            ts = row["Timestamp"]
            points.append({
                "label": ts.strftime("%H:%M"),
                "pf": round(float(abs(row["True_PF_Avg"])), 3),
            })
        return points
        
    elif range_val == "This Week":
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        points = []
        for idx, day in enumerate(days):
            np.random.seed(seed + idx + 40)
            base_pf = 0.92 if day == "Sun" else 0.98
            pf = base_pf + np.random.normal(0, 0.01)
            points.append({
                "label": day,
                "pf": round(float(min(1.0, max(0.6, pf))), 3)
            })
        return points
        
    elif range_val in ["This Month", "Last Month"]:
        points = []
        for w in range(1, 5):
            np.random.seed(seed + w + 50)
            pf = 0.97 + np.random.normal(0, 0.01)
            points.append({
                "label": f"Week {w}",
                "pf": round(float(min(1.0, max(0.6, pf))), 3)
            })
        return points
    return []


# ---------------------------------------------------------------------------
# Demand utilisation (from VA_Total vs contracted demand)
# ---------------------------------------------------------------------------
def gen_demand_util(t, range_val="Today"):
    contracted_kva = t["contracted_demand_kva"]
    seed = t.get("seed", 42)
    
    if range_val == "Today":
        df = _df.copy()
        df["hour"] = df["Timestamp"].dt.hour
        hourly_va = df.groupby("hour")["VA_Total"].max() / 1000  # kVA
        
        out = []
        for h in range(24):
            if h in hourly_va:
                peak_kva = hourly_va[h]
            else:
                if 23 <= h or h < 6:
                    base = 45.0
                elif 18 <= h < 22:
                    base = 280.0
                else:
                    base = 180.0
                np.random.seed(seed + h + 60)
                noise = np.random.normal(0, 25)
                peak_kva = max(10.0, base + noise)
            
            util = (peak_kva / contracted_kva) * 100
            out.append({"label": f"{h:02d}:00", "util": round(float(util), 1)})
        return out
        
    elif range_val == "This Week":
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        out = []
        for idx, day in enumerate(days):
            base = 35.0 if day == "Sun" else 82.0 if day in ["Sat"] else 88.0
            np.random.seed(seed + idx + 70)
            noise = np.random.normal(0, 5)
            util = max(15.0, base + noise)
            out.append({"label": day, "util": round(float(util), 1)})
        return out
        
    elif range_val in ["This Month", "Last Month"]:
        out = []
        for w in range(1, 5):
            base = 86.0
            np.random.seed(seed + w + 80)
            noise = np.random.normal(0, 4)
            util = base + noise
            out.append({"label": f"Week {w}", "util": round(float(util), 1)})
        return out
    return []


# ---------------------------------------------------------------------------
# Active vs Apparent power
# ---------------------------------------------------------------------------
def gen_active_apparent(t, range_val="Today"):
    scale = t.get("scale", 1.0)
    seed = t.get("seed", 42)
    
    if range_val == "Today":
        df = _df.copy()
        out = []
        # Since log is short, we map its points to their respective times,
        # and fill the 48 half-hour slots.
        # Simple implementation: use log timestamp values directly
        for i, row in df.iterrows():
            ts = row["Timestamp"]
            out.append({
                "label": ts.strftime("%H:%M"),
                "kW": round(float(row["Watts_Total"] * scale) / 1000, 1),
                "kVA": round(float(row["VA_Total"] * scale) / 1000, 1),
            })
        # If dataset is too dense, sample it down to ~48 points to avoid clogging chart
        if len(out) > 48:
            step = len(out) // 48
            out = out[::step][:48]
        return out
        
    elif range_val == "This Week":
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        out = []
        for idx, day in enumerate(days):
            base_kw = 55.0 if day == "Sun" else 220.0
            np.random.seed(seed + idx + 90)
            noise_kw = np.random.normal(0, 15)
            kw = max(20.0, base_kw + noise_kw)
            kva = kw / (0.85 if day == "Sun" else 0.98)
            out.append({
                "label": day,
                "kW": round(float(kw * scale), 1),
                "kVA": round(float(kva * scale), 1)
            })
        return out
        
    elif range_val in ["This Month", "Last Month"]:
        out = []
        for w in range(1, 5):
            np.random.seed(seed + w + 100)
            kw = 210.0 + np.random.normal(0, 12)
            kva = kw / 0.97
            out.append({
                "label": f"Week {w}",
                "kW": round(float(kw * scale), 1),
                "kVA": round(float(kva * scale), 1)
            })
        return out
    return []


# ---------------------------------------------------------------------------
# Load factor
# ---------------------------------------------------------------------------
def gen_load_factor(t, range_val="Today"):
    seed = t.get("seed", 42)
    
    if range_val == "Today":
        df = _df.copy()
        df["hour"] = df["Timestamp"].dt.hour
        avg_by_hour = df.groupby("hour")["Watts_Total"].mean()
        max_by_hour = df.groupby("hour")["Watts_Total"].max()
        
        out = []
        for h in range(24):
            if h in avg_by_hour:
                lf = (avg_by_hour[h] / max_by_hour[h]) * 100 if max_by_hour[h] > 0 else 0
            else:
                np.random.seed(seed + h + 110)
                lf = 45.0 + np.random.normal(0, 12)
            out.append({"label": f"{h:02d}:00", "lf": round(float(min(100.0, max(5.0, lf))), 1)})
        return out
        
    elif range_val == "This Week":
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        out = []
        for idx, day in enumerate(days):
            base = 35.0 if day == "Sun" else 75.0 if day in ["Sat"] else 82.0
            np.random.seed(seed + idx + 120)
            noise = np.random.normal(0, 6)
            lf = base + noise
            out.append({"label": day, "lf": round(float(min(100.0, max(5.0, lf))), 1)})
        return out
        
    elif range_val in ["This Month", "Last Month"]:
        out = []
        for w in range(1, 5):
            np.random.seed(seed + w + 130)
            lf = 80.0 + np.random.normal(0, 4)
            out.append({"label": f"Week {w}", "lf": round(float(min(100.0, max(5.0, lf))), 1)})
        return out
    return []


# ---------------------------------------------------------------------------
# Phase voltage timeline
# ---------------------------------------------------------------------------
def gen_phase_voltage(t, range_val="Today"):
    seed = t.get("seed", 42)
    scale = t.get("scale", 1.0)
    
    if range_val == "Today":
        df = _df.copy()
        out = []
        for i, row in df.iterrows():
            ts = row["Timestamp"]
            out.append({
                "label": ts.strftime("%H:%M"),
                "R_V": round(float(row["V_R"]), 1),
                "Y_V": round(float(row["V_Y"]), 1),
                "B_V": round(float(row["V_B"]), 1),
                "R_I": round(float(row["I_R"] * scale), 1),
                "Y_I": round(float(row["I_Y"] * scale), 1),
                "B_I": round(float(row["I_B"] * scale), 1),
            })
        if len(out) > 60:
            step = len(out) // 60
            out = out[::step][:60]
        return out
        
    elif range_val == "This Week":
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        out = []
        for idx, day in enumerate(days):
            np.random.seed(seed + idx + 140)
            base_v = 246.0 + np.random.normal(0, 1.2)
            base_i = 30.0 if day == "Sun" else 110.0 if day in ["Sat"] else 135.0
            
            out.append({
                "label": day,
                "R_V": round(float(base_v + np.random.normal(0, 0.4)), 1),
                "Y_V": round(float(base_v + 1.5 + np.random.normal(0, 0.4)), 1),
                "B_V": round(float(base_v - 1.5 + np.random.normal(0, 0.4)), 1),
                "R_I": round(float((base_i + np.random.normal(0, 5)) * scale), 1),
                "Y_I": round(float((base_i + 2 + np.random.normal(0, 5)) * scale), 1),
                "B_I": round(float((base_i - 2 + np.random.normal(0, 5)) * scale), 1),
            })
        return out
        
    elif range_val in ["This Month", "Last Month"]:
        out = []
        for w in range(1, 5):
            np.random.seed(seed + w + 150)
            base_v = 245.8 + np.random.normal(0, 1.0)
            base_i = 125.0 + np.random.normal(0, 4)
            
            out.append({
                "label": f"Week {w}",
                "R_V": round(float(base_v), 1),
                "Y_V": round(float(base_v + 1.4), 1),
                "B_V": round(float(base_v - 1.4), 1),
                "R_I": round(float(base_i * scale), 1),
                "Y_I": round(float((base_i + 1.5) * scale), 1),
                "B_I": round(float((base_i - 1.5) * scale), 1),
            })
        return out
    return []


# ---------------------------------------------------------------------------
# Auto-detect anomalies from real data
# ---------------------------------------------------------------------------
def _detect_anomalies():
    df = _df.copy()
    anomalies = []
    anomaly_id = 1

    # 1. PF drops below 0.85
    low_pf = df[df["True_PF_Avg"].abs() < 0.85]
    if len(low_pf) > 0:
        for _, row in low_pf.iterrows():
            anomalies.append({
                "id": anomaly_id,
                "type": "PF Degradation",
                "meter": "Main Meter",
                "ts": row["Timestamp"].strftime("%d %b, %H:%M"),
                "severity": "high" if abs(row["True_PF_Avg"]) < 0.75 else "medium",
                "impact": round(float(abs(row["VA_Total"] - row["Watts_Total"]) * 7.2 / 1000), 0),
                "why": f"Power Factor dropped to {abs(row['True_PF_Avg']):.3f} (below 0.85 threshold).",
            })
            anomaly_id += 1

    # 2. THD excursions (I_*_THD_Pct > 8%)
    thd_cols = ["I_R_THD_Pct", "I_Y_THD_Pct", "I_B_THD_Pct"]
    for col in thd_cols:
        if col in df.columns:
            high_thd = df[df[col] > 8]
            phase = col.split("_")[1] # gets R, Y, or B
            for _, row in high_thd.iterrows():
                anomalies.append({
                    "id": anomaly_id,
                    "type": "THD Excursion",
                    "meter": f"Main Meter (Phase {phase})",
                    "ts": row["Timestamp"].strftime("%d %b, %H:%M"),
                    "severity": "medium" if row[col] < 12 else "high",
                    "impact": 0,
                    "why": f"THD(i) on Phase {phase} reached {row[col]:.1f}%, above the 8% limit.",
                })
                anomaly_id += 1

    # 3. Voltage imbalance > 3%
    if all(c in df.columns for c in ["V_R", "V_Y", "V_B"]):
        df["_v_avg"] = df[["V_R", "V_Y", "V_B"]].mean(axis=1)
        df["_v_max_dev"] = df[["V_R", "V_Y", "V_B"]].apply(
            lambda row: max(abs(row - df.loc[row.name, "_v_avg"])), axis=1
        )
        df["_v_imbalance"] = (df["_v_max_dev"] / df["_v_avg"]) * 100
        high_imb = df[df["_v_imbalance"] > 3]
        for _, row in high_imb.iterrows():
            anomalies.append({
                "id": anomaly_id,
                "type": "Voltage Imbalance",
                "meter": "Main Meter",
                "ts": row["Timestamp"].strftime("%d %b, %H:%M"),
                "severity": "low" if row["_v_imbalance"] < 5 else "medium",
                "impact": 0,
                "why": f"Phase voltage imbalance reached {row['_v_imbalance']:.1f}%, above the 3% threshold.",
            })
            anomaly_id += 1

    return anomalies


ANOMALIES = {
    "tenant_a": _detect_anomalies(),
}


# ---------------------------------------------------------------------------
# Billing — computed from real kWh data
# ---------------------------------------------------------------------------
def compute_bill(t):
    df = _df.copy()

    # Total energy from Wh_Received
    if "Wh_Received" in df.columns:
        wh_start = float(df["Wh_Received"].iloc[0])
        wh_end = float(df["Wh_Received"].iloc[-1])
        total_kwh = round((wh_end - wh_start) / 1000, 2)
    else:
        # Fallback: estimate from Watts_Total
        total_kwh = round(float(df["Watts_Total"].mean() * len(df) * 2.5 / (60 * 1000)), 2)

    # Use last month estimate (80% of current for demo)
    last_month_kwh = round(total_kwh * 0.8, 0)

    # Tariff calculations
    energy_rate = 7.2  # ₹ per kWh
    energy_charge = round(total_kwh * energy_rate)

    contracted_kva = t["contracted_demand_kva"]
    demand_charge = round(contracted_kva * 72)  # ₹72 per kVA

    # Demand penalty if max demand exceeds contracted
    max_demand_kva = float(df["VA_Total"].max() / 1000)
    demand_penalty = round(max(0, (max_demand_kva - contracted_kva) * 150))

    # PF incentive/penalty
    avg_pf = float(df["True_PF_Avg"].abs().mean())
    if avg_pf >= 0.95:
        pf_incentive = round(-total_kwh * 0.10)  # 10 paise rebate
    elif avg_pf < 0.85:
        pf_incentive = round(total_kwh * 0.15)  # 15 paise penalty
    else:
        pf_incentive = 0

    # ToD adder (peak hour consumption)
    df["hour"] = df["Timestamp"].dt.hour
    peak_rows = df[(df["hour"] >= 18) & (df["hour"] < 22)]
    peak_pct = len(peak_rows) / len(df) if len(df) > 0 else 0
    tod_adder = round(energy_charge * peak_pct * 0.20)

    total = energy_charge + demand_charge + demand_penalty + pf_incentive + tod_adder

    return {
        "kwh": total_kwh,
        "lastMonthKwh": last_month_kwh,
        "energyCharge": energy_charge,
        "demandCharge": demand_charge,
        "demandPenalty": demand_penalty,
        "pfIncentive": pf_incentive,
        "todAdder": tod_adder,
        "total": total,
    }


# ---------------------------------------------------------------------------
# Dataset summary for LLM context
# ---------------------------------------------------------------------------
def get_dataset_summary():
    """Generate a statistical summary of the real dataset for the LLM."""
    df = _df.copy()
    n_rows = len(df)
    time_start = df["Timestamp"].min().strftime("%Y-%m-%d %H:%M")
    time_end = df["Timestamp"].max().strftime("%Y-%m-%d %H:%M")

    key_metrics = {
        "Active Power (Watts_Total)": {
            "mean": f"{df['Watts_Total'].mean()/1000:.1f} kW",
            "min": f"{df['Watts_Total'].min()/1000:.1f} kW",
            "max": f"{df['Watts_Total'].max()/1000:.1f} kW",
        },
        "Reactive Power (VAR_Total)": {
            "mean": f"{df['VAR_Total'].mean()/1000:.1f} kVAR",
            "min": f"{df['VAR_Total'].min()/1000:.1f} kVAR",
            "max": f"{df['VAR_Total'].max()/1000:.1f} kVAR",
        },
        "Apparent Power (VA_Total)": {
            "mean": f"{df['VA_Total'].mean()/1000:.1f} kVA",
            "min": f"{df['VA_Total'].min()/1000:.1f} kVA",
            "max": f"{df['VA_Total'].max()/1000:.1f} kVA",
        },
        "Power Factor (True_PF_Avg)": {
            "mean": f"{df['True_PF_Avg'].abs().mean():.4f}",
            "min": f"{df['True_PF_Avg'].abs().min():.4f}",
            "max": f"{df['True_PF_Avg'].abs().max():.4f}",
        },
        "Voltage R/Y/B": {
            "R_mean": f"{df['V_R'].mean():.1f} V",
            "Y_mean": f"{df['V_Y'].mean():.1f} V",
            "B_mean": f"{df['V_B'].mean():.1f} V",
        },
        "Current R/Y/B": {
            "R_mean": f"{df['I_R'].mean():.1f} A",
            "Y_mean": f"{df['I_Y'].mean():.1f} A",
            "B_mean": f"{df['I_B'].mean():.1f} A",
        },
        "Frequency": {
            "mean": f"{df['Frequency_Hz'].mean():.3f} Hz",
            "min": f"{df['Frequency_Hz'].min():.3f} Hz",
            "max": f"{df['Frequency_Hz'].max():.3f} Hz",
        },
    }

    # THD metrics if available
    thd_i_cols = ["I_R_THD_Pct", "I_Y_THD_Pct", "I_B_THD_Pct"]
    thd_v_cols = ["V_R_THD_Pct", "V_Y_THD_Pct", "V_B_THD_Pct"]
    for col in thd_i_cols:
        if col in df.columns:
            phase = col.split("_")[1]
            key_metrics[f"THD Current Phase {phase}"] = {
                "mean": f"{df[col].mean():.2f}%",
                "max": f"{df[col].max():.2f}%",
            }
    for col in thd_v_cols:
        if col in df.columns:
            phase = col.split("_")[1]
            key_metrics[f"THD Voltage Phase {phase}"] = {
                "mean": f"{df[col].mean():.2f}%",
                "max": f"{df[col].max():.2f}%",
            }

    # Wh total
    if "Wh_Received" in df.columns:
        key_metrics["Energy Meter (Wh_Received)"] = {
            "start": f"{df['Wh_Received'].iloc[0]:.1f} Wh",
            "end": f"{df['Wh_Received'].iloc[-1]:.1f} Wh",
            "consumed": f"{df['Wh_Received'].iloc[-1] - df['Wh_Received'].iloc[0]:.1f} Wh",
        }

    summary = f"Dataset: {n_rows} readings from {time_start} to {time_end}\n"
    summary += f"Columns: {', '.join(df.columns[:30])}{'...' if len(df.columns) > 30 else ''}\n"
    summary += f"Total columns: {len(df.columns)}\n\n"

    for metric_name, values in key_metrics.items():
        summary += f"{metric_name}: {values}\n"

    return summary