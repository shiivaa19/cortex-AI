import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import os
import json
import httpx
from dotenv import load_dotenv

from data import compute_bill, ANOMALIES, get_dataset_summary, get_dataframe

# Load environment variables
load_dotenv()

SYSTEM_PROMPT = """You are Cortex Copilot, an AI assistant for an industrial energy monitoring platform.
You have access to a Pandas dataframe 'df' representing the telemetry data of the site.

Columns in df:
- Timestamp (datetime)
- Watts_Total, VAR_Total, VA_Total (power in Watts, VAR, VA)
- True_PF_Avg (Power Factor magnitude)
- VLL_Avg, VLN_Avg (Line-Line, Line-Neutral Voltage)
- I_Total (Total Current)
- I_R, I_Y, I_B (Phase currents in Amps)
- V_R, V_Y, V_B (Phase Voltages in Volts)
- I_R_THD_Pct, I_Y_THD_Pct, I_B_THD_Pct (Current THD % per phase)

Rules:
1. If the user asks a question about the energy data, bill, or operations, answer using the tenant data, dataset summary, or query results. Use the `run_pandas_query` tool (write a python snippet) to query the dataframe `df` to get precise values.
2. If the user asks general questions, greets you, or talks about general topics, be helpful, friendly, and answer them freely.
3. Be concise (2-4 sentences) and professional.
4. If writing python code for calculations, write it inside a markdown block. The code MUST store the final result in a variable named `result`.
   Example:
   ```python
   result = df['True_PF_Avg'].min()
   ```
5. If no database query is needed, just reply with your answer directly.
"""

def execute_pandas_query(code: str) -> str:
    """Safely execute generated Python/Pandas code against the loaded dataframe."""
    try:
        df = get_dataframe()
        # Create a local execution context
        local_vars = {'df': df, 'pd': __import__('pandas')}
        # Run code
        exec(code, {}, local_vars)
        result = local_vars.get('result', "No 'result' variable defined in code.")
        return str(result)
    except Exception as e:
        return f"Error executing query: {str(e)}"

def local_fallback_query(question: str, tenant: dict) -> dict:
    """Offline rule-based fallback when API is unavailable or out of credits."""
    df = get_dataframe()
    bill = compute_bill(tenant)
    anoms = ANOMALIES.get(tenant["id"], [])
    
    q = question.lower()
    cites = ["Local offline query engine", "cortex_mock_data.xlsx.ods (Local copy)"]

    # --- ADVANCED AGGREGATION DETECTOR ---
    agg = None
    if any(k in q for k in ["average", "mean", "avg"]):
        agg = "mean"
    elif any(k in q for k in ["min", "minimum", "lowest"]):
        agg = "min"
    elif any(k in q for k in ["max", "maximum", "highest", "peak"]):
        agg = "max"
    elif any(k in q for k in ["sum", "total"]):
        agg = "sum"

    col = None
    unit = ""
    col_label = ""
    scale = 1.0

    # Specific phase checks
    if any(k in q for k in ["phase r", "phase_r", "v_r", "i_r"]):
        if any(k in q for k in ["voltage", "volts", "v_r"]):
            col, col_label, unit = "V_R", "Phase R Voltage", " V"
        else:
            col, col_label, unit = "I_R", "Phase R Current", " A"
    elif any(k in q for k in ["phase y", "phase_y", "v_y", "i_y"]):
        if any(k in q for k in ["voltage", "volts", "v_y"]):
            col, col_label, unit = "V_Y", "Phase Y Voltage", " V"
        else:
            col, col_label, unit = "I_Y", "Phase Y Current", " A"
    elif any(k in q for k in ["phase b", "phase_b", "v_b", "i_b"]):
        if any(k in q for k in ["voltage", "volts", "v_b"]):
            col, col_label, unit = "V_B", "Phase B Voltage", " V"
        else:
            col, col_label, unit = "I_B", "Phase B Current", " A"
    # General metrics
    elif any(k in q for k in ["power factor", "pf"]):
        col = "True_PF_Avg"
        col_label = "Power Factor"
    elif any(k in q for k in ["active power", "kw", "watts"]):
        col = "Watts_Total"
        col_label = "Active Power"
        scale = 0.001
        unit = " kW"
    elif any(k in q for k in ["apparent power", "kva"]):
        col = "VA_Total"
        col_label = "Apparent Power"
        scale = 0.001
        unit = " kVA"
    elif any(k in q for k in ["current", "amps", "amperage", "i_total"]):
        col = "I_Total"
        col_label = "Total Current"
        unit = " A"
    elif any(k in q for k in ["voltage", "volts", "vln_avg"]):
        col = "VLN_Avg"
        col_label = "Voltage"
        unit = " V"
    elif any(k in q for k in ["thd", "harmonic", "distortion"]):
        col = "I_R_THD_Pct"
        col_label = "Current THD (Phase R)"
        unit = "%"

    if agg and col and col in df.columns:
        val = getattr(df[col].abs(), agg)() * scale
        agg_label = {"mean": "Average", "min": "Minimum", "max": "Peak", "sum": "Total"}[agg]
        text = f"According to the telemetry logs, the computed **{agg_label} {col_label}** is **{val:.3f}{unit}**."
        return {"text": text, "cites": cites}

    # 1. Billing
    if any(k in q for k in ["bill", "cost", "charge", "price", "pay", "rupee", "₹"]):
        text = (
            f"Based on the ingested telemetry, your estimated bill is ₹{bill['total']:,}. "
            f"This consists of an energy charge of ₹{bill['energyCharge']:,} (for {bill['kwh']:.1f} kWh consumed), "
            f"a demand charge of ₹{bill['demandCharge']:,}, and a demand penalty of ₹{bill['demandPenalty']:,} "
            f"due to exceeding contracted demand. Peak ToD hours added ₹{bill['todAdder']:,}."
        )
        return {"text": text, "cites": cites}
        
    # 2. Power Factor
    elif any(k in q for k in ["pf", "power factor", "capacitor"]):
        avg_pf = df["True_PF_Avg"].abs().mean()
        min_pf = df["True_PF_Avg"].abs().min()
        max_pf = df["True_PF_Avg"].abs().max()
        pf_drops = [a for a in anoms if a["type"] == "PF Degradation"]
        
        text = (
            f"The logged Power Factor averages {avg_pf:.3f} (ranging from {min_pf:.3f} to {max_pf:.3f}). "
        )
        if pf_drops:
            text += f"There is a detected capacitor bank trip anomaly on {pf_drops[0]['ts']} where PF dropped below threshold, resulting in a ₹{pf_drops[0]['impact']:,} impact."
        else:
            text += "No critical PF degradation events detected in this period."
        return {"text": text, "cites": cites}
        
    # 3. Anomalies / Issues
    elif any(k in q for k in ["anomaly", "abnormal", "issue", "problem", "imbalance", "deviation"]):
        if not anoms:
            return {"text": "No anomalies or threshold deviations detected in the telemetry dataset.", "cites": cites}
        
        text = f"We detected {len(anoms)} anomalies in this dataset:\n"
        for a in anoms[:3]:
            text += f"- {a['type']} ({a['meter']}, {a['ts']}): {a['why']}\n"
        if len(anoms) > 3:
            text += f"... and {len(anoms) - 3} more."
        return {"text": text, "cites": cites}
        
    # 4. Harmonics / THD
    elif any(k in q for k in ["thd", "harmonic", "distortion", "ieee"]):
        max_thd_r = df["I_R_THD_Pct"].max() if "I_R_THD_Pct" in df.columns else 0
        max_thd_y = df["I_Y_THD_Pct"].max() if "I_Y_THD_Pct" in df.columns else 0
        max_thd_b = df["I_B_THD_Pct"].max() if "I_B_THD_Pct" in df.columns else 0
        max_thd = max(max_thd_r, max_thd_y, max_thd_b)
        
        text = (
            f"The peak current THD reaches {max_thd:.1f}% (Phase R: {max_thd_r:.1f}%, Phase Y: {max_thd_y:.1f}%, Phase B: {max_thd_b:.1f}%). "
            "Values above 8.0% exceed standard IEEE-519 limits and indicate non-linear loads."
        )
        return {"text": text, "cites": cites}
        
    # 5. Voltage
    elif any(k in q for k in ["voltage", "volts", "v_r", "v_y", "v_b"]):
        avg_v = df[["V_R", "V_Y", "V_B"]].mean().mean()
        max_v = df[["V_R", "V_Y", "V_B"]].max().max()
        min_v = df[["V_R", "V_Y", "V_B"]].min().min()
        
        text = (
            f"Line-to-neutral voltages average {avg_v:.1f} V (ranging from {min_v:.1f} V to {max_v:.1f} V). "
            "Phase profiles are balanced and nominal except during transient load shifts."
        )
        return {"text": text, "cites": cites}
        
    # 6. Help / General info
    else:
        text = (
            "Hello! I am Cortex Copilot. I detected that your Gemini API Key has exceeded its daily free tier quota (Resource Exhausted).\n\n"
            "To help you, I have enabled my **Smart Offline Query Engine**! I can query and calculate stats directly from your `cortex_mock_data.xlsx.ods` dataset.\n\n"
            "Please ask me questions like:\n"
            "- *What is the average power factor?*\n"
            "- *What is the peak kW active power?*\n"
            "- *What is the maximum total current?*\n"
            "- *Show estimated billing details or abnormalities*"
        )
        return {"text": text, "cites": cites}

def call_llm(provider: str, api_key: str, system: str, user_content: str) -> str:
    if provider == "gemini":
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        # Combine system instructions and user content for Gemini text blocks
        full_text = f"{system}\n\nUser request:\n{user_content}"
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": full_text}]}
            ]
        }
        res = httpx.post(url, json=payload, timeout=30.0)
        res.raise_for_status()
        return res.json()["candidates"][0]["content"]["parts"][0]["text"]
        
    elif provider == "openai":
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.2
        }
        res = httpx.post(url, headers=headers, json=payload, timeout=30.0)
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]
        
    elif provider == "grok":
        url = "https://api.xai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "grok-2",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.2
        }
        res = httpx.post(url, headers=headers, json=payload, timeout=30.0)
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]
        
    elif provider == "groq":
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.2
        }
        res = httpx.post(url, headers=headers, json=payload, timeout=30.0)
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]
    
    raise ValueError(f"Unknown provider: {provider}")

def answer_question(question: str, tenant: dict, user_api_key: str = None, user_provider: str = None) -> dict:
    provider = user_provider or os.getenv("CORTEX_AI_PROVIDER") or "gemini"
    api_key = user_api_key
    
    # Fallback env keys if not provided in headers
    if not api_key:
        if provider == "gemini":
            api_key = os.getenv("GEMINI_API_KEY")
        elif provider == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
        elif provider == "grok":
            api_key = os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY")
        elif provider == "groq":
            api_key = os.getenv("GROQ_API_KEY")

    if not api_key or not provider:
        return local_fallback_query(question, tenant)

    bill = compute_bill(tenant)
    anomalies = ANOMALIES.get(tenant["id"], [])
    dataset_summary = get_dataset_summary()
    df = get_dataframe()
    recent_rows = df.tail(5)[["Timestamp", "Watts_Total", "True_PF_Avg", "VA_Total",
                               "V_R", "V_Y", "V_B", "Frequency_Hz"]].to_string()

    context = f"""
TENANT: {tenant['name']} ({tenant['id']})
Location: {tenant['location']}
Contracted demand: {tenant['contracted_demand_kva']} kVA
Tariff: {tenant['tariffCode']}

--- REAL DATASET SUMMARY ---
{dataset_summary}

--- RECENT READINGS (last 5) ---
{recent_rows}

--- CURRENT BILLING (computed from real data) ---
- Total consumption: {bill['kwh']} kWh (last month estimate: {bill['lastMonthKwh']} kWh)
- Energy charge: ₹{bill['energyCharge']}
- Demand charge: ₹{bill['demandCharge']}
- Demand penalty: ₹{bill['demandPenalty']}
- PF incentive/penalty: ₹{bill['pfIncentive']}
- ToD peak adder: ₹{bill['todAdder']}
- Total: ₹{bill['total']}

--- DETECTED ANOMALIES ({len(anomalies)} this period) ---
"""
    for a in anomalies[:15]:
        context += f"- {a['type']} on {a['meter']} at {a['ts']} (severity: {a['severity']}, impact: ₹{a['impact']}): {a['why']}\n"

    user_content = f"TENANT DATA:\n{context}\n\nQUESTION: {question}"

    try:
        # Step 1: Call LLM
        first_resp = call_llm(provider, api_key, SYSTEM_PROMPT, user_content)
        
        # Step 2: Check for python code block
        code = None
        if "```python" in first_resp:
            parts = first_resp.split("```python")
            if len(parts) > 1:
                code_part = parts[1].split("```")[0].strip()
                code = code_part
        
        if code:
            query_result = execute_pandas_query(code)
            followup_content = (
                f"TENANT DATA:\n{context}\n\nQUESTION: {question}\n\n"
                f"The generated query was:\n```python\n{code}\n```\n"
                f"Result from data execution:\n{query_result}\n\n"
                f"Now, summarize the final answer to the user's question."
            )
            final_resp = call_llm(provider, api_key, SYSTEM_PROMPT, followup_content)
            return {
                "text": final_resp,
                "cites": [
                    "Real dataset (cortex_mock_data.xlsx.ods)",
                    f"Pandas Query via {provider.capitalize()} AI",
                    "FastAPI Billing Engine"
                ]
            }
        
        return {
            "text": first_resp,
            "cites": [
                "Real dataset (cortex_mock_data.xlsx.ods)",
                f"Response via {provider.capitalize()} AI"
            ]
        }

    except Exception as e:
        print(f"LLM API Error ({provider}):", e)
        fallback = local_fallback_query(question, tenant)
        fallback["cites"] = ["Offline Fallback Mode (API Error)", "Local copies"] + fallback.get("cites", [])
        return fallback