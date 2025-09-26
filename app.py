from flask import Flask, request, jsonify, render_template
import joblib
import pandas as pd
from sklearn.preprocessing import StandardScaler
import csv

app = Flask(__name__)

# Load the trained pipeline (includes preprocessing + model)
model = joblib.load('random_forest_model.joblib')
scaler = joblib.load('scaler.joblib')  # Load the scaler if needed

# Function to calculate additional features
def calculate_price_category(original_price):
    if original_price < 500:
        return 'Low'
    elif 500 <= original_price < 2000:
        return 'Medium'
    else:
        return 'High'

def calculate_discount_percentage(original_price, discount):
    try:
        original_price_numeric = float(original_price.replace('KSh', '').replace(',', '').strip()) 
        discount_numeric = float(discount.replace('%', '').strip()) 
        return original_price_numeric * (discount_numeric / 100)
    except:
        return 0

# Function to store data for retraining
def add_to_training_data(input_data):
    with open('training_data.csv', mode='a', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=input_data.keys())
        writer.writerow(input_data)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Collect input values from the form
        input_data = {
            'product_name': request.form['product_name'],
            'category': request.form['category'],
            'brand': request.form['brand'],
            'condition': request.form['condition'],
            'target_market': request.form['target_market'],
            'discount': request.form['discount'],
            'verified_ratings': int(request.form['verified_ratings']),
            'rating_number': float(request.form['rating_number']),
            'original_price': float(request.form['original_price']),
            'seller': request.form['seller'],
            'main_category': request.form['main_category'],
            'image': request.form['image'],
            'product_url': request.form['product_url']
        }

        # Calculate additional features
        input_data['price_category'] = calculate_price_category(input_data['original_price'])
        input_data['discount_percentage'] = calculate_discount_percentage(input_data['original_price'], input_data['discount'])

        # Convert input to DataFrame
        input_df = pd.DataFrame([input_data])

        # Preprocess: Scaling numerical features
        input_df[['original_price', 'verified_ratings', 'rating_number', 'discount']] = scaler.transform(input_df[['original_price', 'verified_ratings', 'rating_number', 'discount']])

        # Run through the model
        prediction = model.predict(input_df)[0]

        # Optionally, store the new data for future retraining
        add_to_training_data(input_data)

        return render_template('index.html', prediction_text=f"Predicted Price: {prediction:.2f}")

    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)
