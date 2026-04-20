from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import sqlite3
import os

# ──────────────────────────────────────────────
# App setup — serve HTML files from project root
# ──────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=BASE_DIR, static_url_path="")
CORS(app)

DB_PATH = os.path.join(BASE_DIR, "fawp.db")

# ──────────────────────────────────────────────
# Database
# ──────────────────────────────────────────────
SCHEMA = """
CREATE TABLE IF NOT EXISTS farmers (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    village        TEXT    NOT NULL,
    state          TEXT    NOT NULL,
    land_acres     REAL    NOT NULL,
    annual_income  INTEGER NOT NULL,
    age            INTEGER NOT NULL,
    category       TEXT    NOT NULL CHECK(category IN ('General','OBC','SC','ST')),
    irrigated      INTEGER NOT NULL DEFAULT 0,
    bpl            INTEGER NOT NULL DEFAULT 0,
    has_loan       INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT    DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS farmer_crops (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id  INTEGER NOT NULL REFERENCES farmers(id),
    crop       TEXT    NOT NULL
);
CREATE TABLE IF NOT EXISTS schemes (
    scheme_id            TEXT    PRIMARY KEY,
    name                 TEXT    NOT NULL,
    full_name            TEXT    NOT NULL,
    category             TEXT    NOT NULL,
    level                TEXT    NOT NULL CHECK(level IN ('Central','State')),
    benefit              TEXT    NOT NULL,
    description          TEXT,
    max_land             REAL,
    min_land             REAL,
    bpl_only             INTEGER NOT NULL DEFAULT 0,
    eligible_categories  TEXT,
    eligible_states      TEXT,
    irrigated_required   INTEGER
);
"""

FARMERS_SEED = [
    ("Ramaiah Goud",     "Nalgonda",   "Telangana",       2.5,  85000,  48, "OBC",     1, 0, 1, ["Rice","Maize"]),
    ("Lakshmi Devi",     "Karimnagar", "Telangana",       1.2,  42000,  39, "SC",      0, 1, 0, ["Cotton"]),
    ("Suresh Patil",     "Bidar",      "Karnataka",       6.0, 210000,  55, "General", 1, 0, 1, ["Soybean","Jowar"]),
    ("Anita Kumari",     "Patna",      "Bihar",           0.8,  28000,  34, "ST",      0, 1, 0, ["Wheat","Mustard"]),
    ("Vijay Reddy",      "Guntur",     "Andhra Pradesh",  4.0, 145000,  42, "OBC",     1, 0, 1, ["Chilli","Rice"]),
    ("Meena Bai",        "Jhansi",     "Uttar Pradesh",   1.5,  36000,  52, "SC",      0, 1, 0, ["Wheat"]),
    ("Rajesh Kumar",     "Sikar",      "Rajasthan",       3.2,  98000,  46, "OBC",     0, 0, 1, ["Bajra","Groundnut"]),
    ("Savitri Naidu",    "Warangal",   "Telangana",       2.0,  68000,  38, "General", 1, 0, 0, ["Maize","Sunflower"]),
    ("Harikrishna Rao",  "Vizag",      "Andhra Pradesh",  8.5, 320000,  60, "General", 1, 0, 0, ["Cashew","Coconut"]),
    ("Pushpa Verma",     "Raipur",     "Chhattisgarh",    1.0,  22000,  44, "ST",      0, 1, 0, ["Rice","Vegetables"]),
    ("Mohan Lal",        "Ludhiana",   "Punjab",         12.0, 580000,  58, "General", 1, 0, 1, ["Wheat","Paddy"]),
    ("Sunita Yadav",     "Nashik",     "Maharashtra",     3.5, 175000,  41, "OBC",     1, 0, 1, ["Grapes","Onion"]),
    ("Basavaraj Nayak",  "Dharwad",    "Karnataka",       5.5, 240000,  50, "OBC",     1, 0, 1, ["Sugarcane"]),
    ("Kamla Devi",       "Jaipur",     "Rajasthan",       1.8,  52000,  36, "SC",      0, 0, 0, ["Mustard","Wheat"]),
    ("Srinivasa Murthy", "Mysuru",     "Karnataka",       2.8,  92000,  47, "General", 1, 0, 0, ["Turmeric","Ragi"]),
]

SCHEMES_SEED = [
    ("PM-KISAN","PM-KISAN","Pradhan Mantri Kisan Samman Nidhi","Income Support","Central","₹6,000/year in 3 installments","Direct income support of ₹6,000 per year.",None,None,0,"General,OBC,SC,ST",None,None),
    ("PMFBY","PMFBY","Pradhan Mantri Fasal Bima Yojana","Crop Insurance","Central","Crop insurance at subsidised premium","Comprehensive crop insurance against natural calamities.",None,None,0,"General,OBC,SC,ST",None,None),
    ("KCC","KCC","Kisan Credit Card","Credit","Central","Short-term crop credit at low interest (4%)","Flexible revolving credit for crop cultivation.",None,0.5,0,"General,OBC,SC,ST",None,None),
    ("SMAM","SMAM","Sub-Mission on Agricultural Mechanisation","Mechanisation","Central","50–80% subsidy on farm equipment","Subsidies on tractors, harvesters for small/marginal farmers.",5.0,None,0,"General,OBC,SC,ST",None,None),
    ("PMKSY","PMKSY","PM Krishi Sinchayee Yojana","Irrigation","Central","Drip/sprinkler irrigation subsidy up to 90%","Expanding irrigation coverage for dry-land farmers.",None,None,0,"General,OBC,SC,ST",None,0),
    ("NFSM","NFSM","National Food Security Mission","Crop Development","Central","Free seeds, demonstrations, training","Increasing production of rice, wheat, pulses.",None,None,0,"General,OBC,SC,ST",None,None),
    ("RKVY","RKVY","Rashtriya Krishi Vikas Yojana","Development","Central","State-tailored agriculture development grants","Holistic development of agriculture.",None,None,0,"General,OBC,SC,ST",None,None),
    ("SCSP","SC Sub-Plan","Scheduled Caste Sub-Plan (Agriculture)","Social Welfare","State","Free equipment, seeds, and training for SC farmers","Special provisions for SC farmers.",None,None,0,"SC",None,None),
    ("TSP","TSP","Tribal Sub-Plan (Agriculture)","Social Welfare","State","Subsidised inputs and free training for ST farmers","Agricultural support for ST farmers.",None,None,0,"ST",None,None),
    ("RYTHU","Rythu Bandhu","Rythu Bandhu Scheme","Income Support","State","₹10,000 per acre per season","Investment support for Telangana farmers.",None,None,0,"General,OBC,SC,ST","Telangana",None),
    ("YSRRC","YSR Rythu Bharosa","YSR Rythu Bharosa & PM Kisan","Income Support","State","₹13,500/year combined support","Andhra Pradesh state top-up on PM-KISAN.",None,None,0,"General,OBC,SC,ST","Andhra Pradesh",None),
    ("PMKUSUM","PM-KUSUM Solar","PM-KUSUM Solar Pump Component","Renewable Energy","Central","90% subsidy on solar-powered irrigation pumps","Solar-powered irrigation pumps for un-irrigated land.",None,None,0,"General,OBC,SC,ST",None,0),
    ("PKVY","PKVY","Paramparagat Krishi Vikas Yojana","Organic Farming","Central","₹50,000/hectare over 3 years for organic conversion","Support for certified organic farming.",None,None,0,"General,OBC,SC,ST",None,None),
    ("MIDH","MIDH","Mission for Integrated Development of Horticulture","Horticulture","Central","40–50% subsidy on horticulture infrastructure","Development of horticulture sector.",None,None,0,"General,OBC,SC,ST",None,None),
]


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.executescript(SCHEMA)

    # Auto-seed if empty
    with sqlite3.connect(DB_PATH) as conn:
        count = conn.execute("SELECT COUNT(*) FROM farmers").fetchone()[0]
        if count == 0:
            cur = conn.cursor()
            for (name, village, state, land, income, age, cat, irr, bpl, loan, crops) in FARMERS_SEED:
                cur.execute(
                    "INSERT INTO farmers (name,village,state,land_acres,annual_income,age,category,irrigated,bpl,has_loan) VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (name, village, state, land, income, age, cat, irr, bpl, loan)
                )
                fid = cur.lastrowid
                for crop in crops:
                    cur.execute("INSERT INTO farmer_crops (farmer_id, crop) VALUES (?,?)", (fid, crop))
            for row in SCHEMES_SEED:
                cur.execute(
                    "INSERT OR IGNORE INTO schemes (scheme_id,name,full_name,category,level,benefit,description,max_land,min_land,bpl_only,eligible_categories,eligible_states,irrigated_required) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    row
                )
            conn.commit()
            print(f"[DB] Seeded {len(FARMERS_SEED)} farmers and {len(SCHEMES_SEED)} schemes.")
        else:
            print(f"[DB] Already has data, skipping seed.")


init_db()


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def query(sql, params=()):
    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


def execute(sql, params=()):
    with get_db() as conn:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid


# ──────────────────────────────────────────────
# Serve HTML pages
# ──────────────────────────────────────────────
@app.route("/")
def root():
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(BASE_DIR, filename)


# ──────────────────────────────────────────────
# FARMERS API
# ──────────────────────────────────────────────
@app.route("/api/farmers", methods=["GET"])
def list_farmers():
    sql = "SELECT f.*, GROUP_CONCAT(fc.crop) as crops FROM farmers f LEFT JOIN farmer_crops fc ON f.id = fc.farmer_id"
    conditions, params = [], []
    state = request.args.get("state")
    bpl   = request.args.get("bpl")
    size  = request.args.get("size")
    crop  = request.args.get("crop")
    if state:
        conditions.append("f.state = ?"); params.append(state)
    if bpl:
        conditions.append("f.bpl = ?"); params.append(1 if bpl.lower() == "true" else 0)
    if size == "small":
        conditions.append("f.land_acres <= 2")
    elif size == "medium":
        conditions.append("f.land_acres > 2 AND f.land_acres <= 5")
    elif size == "large":
        conditions.append("f.land_acres > 5")
    if crop:
        conditions.append("f.id IN (SELECT farmer_id FROM farmer_crops WHERE crop = ?)"); params.append(crop)
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    sql += " GROUP BY f.id"
    rows = query(sql, params)
    for r in rows:
        r["crops"]     = r["crops"].split(",") if r["crops"] else []
        r["irrigated"] = bool(r["irrigated"])
        r["bpl"]       = bool(r["bpl"])
        r["has_loan"]  = bool(r["has_loan"])
    return jsonify(rows)


@app.route("/api/farmers/<int:fid>", methods=["GET"])
def get_farmer(fid):
    rows = query("SELECT f.*, GROUP_CONCAT(fc.crop) as crops FROM farmers f LEFT JOIN farmer_crops fc ON f.id = fc.farmer_id WHERE f.id = ? GROUP BY f.id", (fid,))
    if not rows:
        return jsonify({"error": "Farmer not found"}), 404
    r = rows[0]
    r["crops"]     = r["crops"].split(",") if r["crops"] else []
    r["irrigated"] = bool(r["irrigated"])
    r["bpl"]       = bool(r["bpl"])
    r["has_loan"]  = bool(r["has_loan"])
    return jsonify(r)


@app.route("/api/farmers", methods=["POST"])
def create_farmer():
    data = request.get_json()
    for f in ["name","village","state","land_acres","annual_income","age","category"]:
        if f not in data:
            return jsonify({"error": f"Missing field: {f}"}), 400
    fid = execute(
        "INSERT INTO farmers (name,village,state,land_acres,annual_income,age,category,irrigated,bpl,has_loan) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (data["name"],data["village"],data["state"],data["land_acres"],data["annual_income"],data["age"],data["category"],
         int(data.get("irrigated",False)),int(data.get("bpl",False)),int(data.get("has_loan",False)))
    )
    for crop in data.get("crops", []):
        execute("INSERT INTO farmer_crops (farmer_id, crop) VALUES (?,?)", (fid, crop))
    return jsonify({"id": fid, "message": "Farmer created"}), 201


@app.route("/api/farmers/<int:fid>", methods=["DELETE"])
def delete_farmer(fid):
    execute("DELETE FROM farmer_crops WHERE farmer_id = ?", (fid,))
    execute("DELETE FROM farmers WHERE id = ?", (fid,))
    return jsonify({"message": "Farmer deleted"})


# ──────────────────────────────────────────────
# SCHEMES API
# ──────────────────────────────────────────────
@app.route("/api/schemes", methods=["GET"])
def list_schemes():
    sql = "SELECT * FROM schemes"
    conditions, params = [], []
    if request.args.get("category"):
        conditions.append("category = ?"); params.append(request.args["category"])
    if request.args.get("level"):
        conditions.append("level = ?"); params.append(request.args["level"])
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    rows = query(sql, params)
    for r in rows:
        r["eligible_categories"] = r["eligible_categories"].split(",") if r["eligible_categories"] else []
        r["eligible_states"]     = r["eligible_states"].split(",")     if r["eligible_states"]     else []
        r["irrigated_required"]  = None if r["irrigated_required"] is None else bool(r["irrigated_required"])
    return jsonify(rows)


# ──────────────────────────────────────────────
# SCHEME MATCH API
# ──────────────────────────────────────────────
@app.route("/api/match/<int:fid>", methods=["GET"])
def match_schemes(fid):
    farmer_rows = query("SELECT f.*, GROUP_CONCAT(fc.crop) as crops FROM farmers f LEFT JOIN farmer_crops fc ON f.id = fc.farmer_id WHERE f.id = ? GROUP BY f.id", (fid,))
    if not farmer_rows:
        return jsonify({"error": "Farmer not found"}), 404
    f = farmer_rows[0]
    f["crops"] = f["crops"].split(",") if f["crops"] else []
    all_schemes = query("SELECT * FROM schemes")
    eligible, not_eligible = [], []
    for s in all_schemes:
        reasons_fail = []
        if s["bpl_only"] and not f["bpl"]:
            reasons_fail.append("BPL farmers only")
        if s["max_land"] is not None and f["land_acres"] > s["max_land"]:
            reasons_fail.append(f"Land exceeds {s['max_land']} acres limit")
        if s["min_land"] is not None and f["land_acres"] < s["min_land"]:
            reasons_fail.append(f"Land below minimum {s['min_land']} acres")
        if s["eligible_categories"]:
            cats = [c.strip() for c in s["eligible_categories"].split(",")]
            if f["category"] not in cats:
                reasons_fail.append(f"Only for {s['eligible_categories']} farmers")
        if s["eligible_states"]:
            states = [st.strip() for st in s["eligible_states"].split(",")]
            if f["state"] not in states:
                reasons_fail.append(f"Only available in {s['eligible_states']}")
        if s["irrigated_required"] is not None:
            if int(s["irrigated_required"]) == 1 and not f["irrigated"]:
                reasons_fail.append("Requires irrigated land")
            elif int(s["irrigated_required"]) == 0 and f["irrigated"]:
                reasons_fail.append("Only for un-irrigated land")
        entry = {
            "scheme_id":   s["scheme_id"],
            "scheme_name": s.get("name", s["scheme_id"]),
            "full_name":   s.get("full_name", ""),
            "category":    s["category"],
            "benefit":     s.get("benefit", ""),
        }
        if reasons_fail:
            entry["reason"] = "; ".join(reasons_fail)
            not_eligible.append(entry)
        else:
            entry["reason"] = "Meets all eligibility criteria"
            eligible.append(entry)
    return jsonify({"farmer": {"id": f["id"], "name": f["name"], "state": f["state"]}, "eligible": eligible, "not_eligible": not_eligible})


# ──────────────────────────────────────────────
# ENTRY POINT
# ──────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
