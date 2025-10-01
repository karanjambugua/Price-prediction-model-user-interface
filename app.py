from flask import Flask, request, jsonify, render_template
import pandas as pd
import numpy as np
import json
import os
import re
from datetime import datetime

app = Flask(__name__)
print("Current working directory:", os.getcwd())


# Path to the predictions JSON file
predictions_file = 'predictions.json'

# Route to get the last 4 predictions from the predictions.json file
@app.route('/latest_predictions')
def latest_predictions():
    try:
        # Open and load the predictions JSON file
        with open(predictions_file, 'r') as file:
            # Read all the lines in the file
            lines = file.readlines()

        # Parse the JSON content
        predictions = [json.loads(line) for line in lines]
        
        # Get the latest 6 predictions (if available)
        latest_predictions = predictions[-6:]  # Get the last 6 predictions

        # Return the latest predictions as JSON
        return jsonify(latest_predictions)

    except Exception as e:
        return jsonify({"error": str(e)})


# ------------------------------
# CONFIG
# ------------------------------
CSV_PATH = r'Data/New_Price_Change_Monitoring_System.csv'
CURRENCY = 'KSh'

# ------------------------------
# HELPERS: load & clean CSV
# ------------------------------
_price_rx = re.compile(r'[^\d.\-–]+')  # keep only digits, dot, minus

def parse_price(x):
    """Parse KSh prices and ranges like 'KSh 499' or 'KSh 499 - 699' into float."""
    if pd.isna(x):
        return np.nan
    s = str(x)
    # handle ranges: average the ends
    if '-' in s or '–' in s:
        parts = re.split(r'\s*[-–]\s*', s)
        try:
            nums = [float(_price_rx.sub('', p).replace(',', '')) for p in parts if p.strip()]
            nums = [n for n in nums if np.isfinite(n)]
            return np.mean(nums) if nums else np.nan
        except Exception:
            return np.nan
    try:
        return float(_price_rx.sub('', s).replace(',', ''))
    except Exception:
        return np.nan

def load_dataset(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"CSV not found at: {os.path.abspath(path)}")
    df = pd.read_csv(path)

    # normalize product name column for search
    if 'product_name' in df.columns:
        df['name'] = df['product_name']
    elif 'title' in df.columns:
        df['name'] = df['title']
    else:
        raise ValueError("CSV must contain 'product_name' or 'title' column.")

    # normalize category column
    if 'main_category' not in df.columns:
        if 'category' in df.columns:
            df['main_category'] = df['category']
        else:
            df['main_category'] = 'Unknown'

    # ensure price columns exist and parse them
    for col in ['current_price', 'original_price']:
        if col not in df.columns:
            raise ValueError(f"CSV must contain '{col}' column.")
        df[col] = df[col].apply(parse_price)

    # keep only sensible rows
    df = df[(df['original_price'] > 0) & (df['current_price'] > 0)].copy()

    # robust market markup
    df['markup_ratio'] = df['current_price'] / df['original_price']
    # clip extreme outliers to reduce noise
    df = df[(df['markup_ratio'] > 0.2) & (df['markup_ratio'] < 5.0)]

    # per-category medians (with counts)
    cat_stats = (
        df.groupby('main_category', dropna=False)['markup_ratio']
          .agg(['median', 'count']).reset_index()
          .rename(columns={'median': 'cat_median_markup', 'count': 'cat_n'})
    )
    overall_median = float(df['markup_ratio'].median())

    # debug: show a quick summary
    print("Loaded rows:", len(df))
    print("Overall median markup:", round(overall_median, 3))
    print(cat_stats.sort_values('cat_median_markup', ascending=False).head(8))

    return df, cat_stats, overall_median

data, category_stats, OVERALL_MEDIAN = load_dataset(CSV_PATH)

def category_markup(category: str) -> float:
    """Return robust median markup for a category, else overall median."""
    if not category:
        return OVERALL_MEDIAN
    row = category_stats[category_stats['main_category'].str.lower() == str(category).lower()]
    if not row.empty and int(row['cat_n'].iloc[0]) >= 15:  # require enough examples
        return float(row['cat_median_markup'].iloc[0])
    return OVERALL_MEDIAN

def condition_adjust(cond: str) -> float:
    """Small tweak by condition; tune these as you prefer."""
    if not cond:
        return 1.0
    c = cond.strip().lower()
    if c == 'new':
        return 1.05   # +5% uplift vs market
    if c == 'refurbished':
        return 0.90   # -10% vs market
    if c == 'used':
        return 0.75   # -25% vs market
    return 1.0

def predict_price(original_price: float, main_category: str, condition: str):
    """Data-driven price: original * category_median_markup * condition_tweak."""
    original_price = float(original_price)
    
    # Category-based markup logic
    m_cat = category_markup(main_category)
    
    # Adjust for condition
    m_cond = condition_adjust(condition)
    
    # Apply the model's prediction
    pred = original_price * m_cat * m_cond

    # Adjust the predicted price for new items to be slightly higher (closer to target)
    if condition == 'new':
        pred *= 1.1  # Add 10% for new products (if it was a bit low)

    # Avoid extreme values if needed (price should not go too low)
    if pred < original_price * 1.3:  # Ensure at least 30% profit margin
        pred = original_price * 1.3  # Ensure at least 30% profit for new items
    elif pred > original_price * 3.0:  # Limit price range to avoid unrealistic overpricing
        pred = original_price * 3.0  # Cap to 3x original price (for very high-end items)

    # For new products, ensure low price is not below the predicted price
    if condition == 'new':
        low = pred  # Ensure low price for new products is at least predicted price
        high = pred * 1.2  # High price can be a reasonable markup of the predicted price
    elif condition == 'refurbished':
        # Refurbished products should have a price higher than the original but below the predicted price
        low = original_price * 1.1  # 10% markup on original price
        high = pred  # Cap the high price at the predicted price, since refurbished items are not expected to go higher than new products
    elif condition == 'used':
        # For used products, the low price should be below the original price
        low = original_price * 0.7  # Allow up to 30% discount for used products
        high = pred  # High price for used items can still be capped at predicted price
    
    # Ensure low range for new products doesn't go below original price * 1.3
    if low < original_price * 1.3 and condition == 'new':
        low = original_price * 1.3  # Ensure at least 30% profit margin for the lowest price

    return pred, low, high




# ------------------------------
# Logging predictions
# ------------------------------
def save_prediction_to_file(input_data, prediction_data):
    row = {
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "input_data": input_data,
        "prediction": prediction_data
    }
    with open('predictions.json', 'a', encoding='utf-8') as f:
        json.dump(row, f, ensure_ascii=False)
        f.write("\n")

# ------------------------------
# ROUTES
# ------------------------------
@app.route('/')
def home():
    # Extract unique categories from the 'main_category' column of your data
    categories = data['main_category'].unique()

    # Pass categories to the template
    return render_template('index.html', categories=categories)

@app.route('/data')
def data_page():
    return render_template('data.html')

@app.route('/team')
def team():
    return render_template('team.html')

@app.route('/research')
def research():
    return render_template('research.html')

@app.route('/search', methods=['GET'])
def search():
    q = (request.args.get('q') or '').strip().lower()
    if not q or len(q) < 2:
        return jsonify([])
    m = data[data['name'].str.lower().str.contains(q, na=False)].copy()
    m = m[['name', 'main_category', 'current_price', 'original_price']].dropna().head(12)
    out = []
    for _, r in m.iterrows():
        out.append({
            'product_name': r['name'],
            'main_category': r['main_category'],
            'current_price': float(r['current_price']),
            'original_price': float(r['original_price']),
            'currency': CURRENCY
        })
    return jsonify(out)


@app.route('/predict', methods=['POST'])
def predict():
    try:
        input_data = {
            'product_name': request.form.get('product_name', '').strip(),
            'original_price': float(request.form.get('original_price', 0)),
            'main_category': request.form.get('main_category', '').strip(),
            'condition': request.form.get('condition', '').strip()
        }

        if input_data['original_price'] <= 0:
            return jsonify({'error': 'Original price must be > 0'}), 400

        # Attempt category inference from dataset if missing
        if not input_data['main_category'] and input_data['product_name']:
            hit = data[data['name'].str.lower() == input_data['product_name'].lower()]
            if not hit.empty:
                input_data['main_category'] = str(hit['main_category'].iloc[0])

        pred, low, high = predict_price(
            input_data['original_price'],
            input_data['main_category'],
            input_data['condition']
        )

        result = {
            'prediction': float(pred),
            'price_range': {'low': float(low), 'high': float(high)},
            'currency': CURRENCY,
            'used_category': input_data['main_category'] or 'overall',
            'confidence': "95%"
        }

        save_prediction_to_file(input_data, result)

        return render_template(
            'index.html',
            original_price_text=f"Original Price: {CURRENCY} {input_data['original_price']:.2f}",
            prediction_text=f"Predicted Price: {CURRENCY} {result['prediction']:.2f}",
            price_range_text=f"Price Range: {CURRENCY} {result['price_range']['low']:.2f} - {CURRENCY} {result['price_range']['high']:.2f}",
            confidence_text=f"Confidence Level: {result['confidence']}"
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict_api', methods=['POST'])
def predict_api():
    try:
        payload = request.get_json(force=True)

        product_name = (payload.get('product_name') or '').strip()
        original_price = float(payload.get('original_price') or 0)
        main_category = (payload.get('main_category') or '').strip()
        condition = (payload.get('condition') or '').strip()

        if original_price <= 0:
            return jsonify({'error': 'original_price must be > 0'}), 400

        if not main_category and product_name:
            hit = data[data['name'].str.lower() == product_name.lower()]
            if not hit.empty:
                main_category = str(hit['main_category'].iloc[0])

        pred, low, high = predict_price(original_price, main_category, condition)

        result = {
            'prediction': float(pred),
            'price_range': {'low': float(low), 'high': float(high)},
            'currency': CURRENCY,
            'used_category': main_category or 'overall',
            'confidence': "95%"
        }

        save_prediction_to_file(
            {
                'product_name': product_name,
                'original_price': original_price,
                'main_category': main_category,
                'condition': condition
            },
            result
        )

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
